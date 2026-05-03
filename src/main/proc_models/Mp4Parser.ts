import * as fs from 'fs'
import { exec } from 'child_process'
import * as Dty from '../../bridge/dataTypedef'
import logger from './Logger'
import appCfg from './AppCfg'

const BOX_NAME_MAP: Record<string, string> = {
    ftyp: 'FileTypeBox',
    moov: 'MovieBox',
    mvhd: 'MovieHeaderBox',
    trak: 'TrackBox',
    tkhd: 'TrackHeaderBox',
    mdia: 'MediaBox',
    mdhd: 'MediaHeaderBox',
    hdlr: 'HandlerBox',
    minf: 'MediaInformationBox',
    vmhd: 'VideoMediaHeaderBox',
    smhd: 'SoundMediaHeaderBox',
    dinf: 'DataInformationBox',
    dref: 'DataReferenceBox',
    stbl: 'SampleTableBox',
    stsd: 'SampleDescriptionBox',
    stts: 'TimeToSampleBox',
    stsc: 'SampleToChunkBox',
    stsz: 'SampleSizeBox',
    stco: 'ChunkOffsetBox',
    stss: 'SyncSampleBox',
    ctts: 'CompositionTimeToSampleBox',
    mdat: 'MediaDataBox'
}

function getBoxName(type: string): string {
    return BOX_NAME_MAP[type.trim()] || type.trim() + 'Box'
}

interface FfprobeFormat {
    filename?: string
    nb_streams?: number
    nb_programs?: number
    format_name?: string
    format_long_name?: string
    start_time?: string
    duration?: string
    size?: string
    bit_rate?: string
    probe_score?: number
    tags?: {
        major_brand?: string
        minor_version?: string
        compatible_brands?: string
        creation_time?: string
    }
}

interface FfprobeStream {
    index: number
    codec_name?: string
    codec_long_name?: string
    codec_type?: string
    width?: number
    height?: number
    sample_aspect_ratio?: string
    display_aspect_ratio?: string
    pix_fmt?: string
    level?: number
    color_range?: string
    color_space?: string
    field_order?: string
    r_frame_rate?: string
    avg_frame_rate?: string
    time_base?: string
    start_pts?: number
    start_time?: string
    duration?: string
    bit_rate?: string
    nb_frames?: string
    sample_rate?: string
    channels?: number
    channel_layout?: string
    bits_per_sample?: number
    tags?: {
        language?: string
        handler_name?: string
    }
}

interface FfprobeOutput {
    streams: FfprobeStream[]
    format: FfprobeFormat
}

async function runFfprobe(filePath: string): Promise<FfprobeOutput> {
    return new Promise((resolve, reject) => {
        const cmd = `"${appCfg.ffprobeExe}" -v error -of json -show_format -show_streams "${filePath}"`
        logger.info(`Running ffprobe: ${cmd}`)
        
        exec(cmd, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`ffprobe error: ${error.message}`))
                return
            }
            if (stderr && stderr.trim()) {
                logger.warn(`ffprobe stderr: ${stderr}`)
            }
            try {
                const jsonData = JSON.parse(stdout)
                resolve(jsonData)
            } catch (parseError) {
                reject(new Error(`Failed to parse ffprobe output: ${parseError}`))
            }
        })
    })
}

function buildFtypBox(format: FfprobeFormat): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    
    const majorBrand = format.tags?.major_brand || 'isom'
    props.push({ name: 'major_brand', value: majorBrand })
    
    const minorVersion = parseInt(format.tags?.minor_version || '512')
    props.push({ name: 'minor_version', value: minorVersion, isHex: true })
    
    const compatibleBrands = format.tags?.compatible_brands || 'isom iso2 avc1 mp41'
    props.push({ name: 'compatible_brands', value: compatibleBrands })

    return {
        type: 'ftyp',
        name: getBoxName('ftyp'),
        offset: 0,
        size: 24,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function buildMvhdBox(format: FfprobeFormat): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    const duration = parseFloat(format.duration || '0')
    const timescale = 1000
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 0, isHex: true })
    props.push({ name: 'creation_time', value: format.tags?.creation_time || 'N/A' })
    props.push({ name: 'modification_time', value: 'N/A' })
    props.push({ name: 'timescale', value: timescale })
    props.push({ name: 'duration', value: Math.round(duration * timescale) })
    props.push({ name: 'duration_sec', value: duration.toFixed(3) + ' s' })
    props.push({ name: 'rate', value: '1.0' })
    props.push({ name: 'volume', value: '1.0' })
    props.push({ name: 'matrix', value: '0x00010000 0x00000000 0x00000000 0x00000000 0x00010000 0x00000000 0x00000000 0x00000000 0x40000000' })
    props.push({ name: 'next_track_ID', value: (format.nb_streams || 2) + 1 })

    return {
        type: 'mvhd',
        name: getBoxName('mvhd'),
        offset: 0,
        size: 108,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function buildTkhdBox(stream: FfprobeStream, trackId: number): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    const isVideo = stream.codec_type === 'video'
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 3, isHex: true })
    props.push({ name: 'track_ID', value: trackId })
    props.push({ name: 'duration', value: Math.round(parseFloat(stream.duration || '0') * 1000) })
    
    if (isVideo && stream.width && stream.height) {
        props.push({ name: 'width', value: stream.width })
        props.push({ name: 'height', value: stream.height })
        props.push({ name: 'display_width', value: stream.width + '.00' })
        props.push({ name: 'display_height', value: stream.height + '.00' })
    }
    
    props.push({ name: 'layer', value: 0 })
    props.push({ name: 'alternate_group', value: 0 })
    
    if (!isVideo) {
        props.push({ name: 'volume', value: '1.0' })
    }

    return {
        type: 'tkhd',
        name: getBoxName('tkhd'),
        offset: 0,
        size: 92,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function buildMdhdBox(stream: FfprobeStream): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    const isVideo = stream.codec_type === 'video'
    const duration = parseFloat(stream.duration || '0')
    
    let timescale = 1000
    if (!isVideo && stream.sample_rate) {
        timescale = parseInt(stream.sample_rate)
    } else if (isVideo && stream.r_frame_rate) {
        const [, den] = stream.r_frame_rate.split('/').map(Number)
        timescale = den || 1000
    }
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 0, isHex: true })
    props.push({ name: 'timescale', value: timescale })
    props.push({ name: 'duration', value: Math.round(duration * timescale) })
    props.push({ name: 'duration_sec', value: duration.toFixed(3) + ' s' })
    props.push({ name: 'language', value: stream.tags?.language || 'und' })

    return {
        type: 'mdhd',
        name: getBoxName('mdhd'),
        offset: 0,
        size: 32,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function buildHdlrBox(stream: FfprobeStream): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    const isVideo = stream.codec_type === 'video'
    
    const handlerType = isVideo ? 'vide' : 'soun'
    const handlerName = stream.tags?.handler_name || (isVideo ? 'VideoHandler' : 'SoundHandler')
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 0, isHex: true })
    props.push({ name: 'handler_type', value: handlerType })
    props.push({ name: 'name', value: handlerName })

    return {
        type: 'hdlr',
        name: getBoxName('hdlr'),
        offset: 0,
        size: 45,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function buildVmhdBox(_stream: FfprobeStream): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 1, isHex: true })
    props.push({ name: 'graphicsmode', value: 0, isHex: true })
    props.push({ name: 'opcolor', value: '0x0000 0x0000 0x0000' })

    return {
        type: 'vmhd',
        name: getBoxName('vmhd'),
        offset: 0,
        size: 20,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function buildSmhdBox(_stream: FfprobeStream): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 0, isHex: true })
    props.push({ name: 'balance', value: '0.00' })

    return {
        type: 'smhd',
        name: getBoxName('smhd'),
        offset: 0,
        size: 16,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function buildDrefBox(): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 0, isHex: true })
    props.push({ name: 'entry_count', value: 1 })

    const urlBox: Dty.Mp4Box = {
        type: 'url ',
        name: getBoxName('url'),
        offset: 0,
        size: 12,
        headerSize: 8,
        properties: [
            { name: 'version', value: 0 },
            { name: 'flags', value: 1, isHex: true },
            { name: 'self_reference', value: true }
        ],
        expanded: false
    }

    return {
        type: 'dref',
        name: getBoxName('dref'),
        offset: 0,
        size: 28,
        headerSize: 8,
        properties: props,
        children: [urlBox],
        expanded: false
    }
}

function buildDinfBox(): Dty.Mp4Box {
    return {
        type: 'dinf',
        name: getBoxName('dinf'),
        offset: 0,
        size: 36,
        headerSize: 8,
        children: [buildDrefBox()],
        expanded: false
    }
}

function buildStsdBox(stream: FfprobeStream): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    const isVideo = stream.codec_type === 'video'
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 0, isHex: true })
    props.push({ name: 'entry_count', value: 1 })

    const codecType = stream.codec_name || (isVideo ? 'avc1' : 'mp4a')
    const codecProps: Dty.Mp4BoxProperty[] = []
    
    if (isVideo) {
        codecProps.push({ name: 'codec', value: codecType })
        codecProps.push({ name: 'width', value: stream.width || 0 })
        codecProps.push({ name: 'height', value: stream.height || 0 })
        codecProps.push({ name: 'horiz_resolution', value: '72.00' })
        codecProps.push({ name: 'vert_resolution', value: '72.00' })
        codecProps.push({ name: 'frame_count', value: 1 })
        if (stream.pix_fmt) {
            codecProps.push({ name: 'pixel_format', value: stream.pix_fmt })
        }
        if (stream.field_order) {
            codecProps.push({ name: 'field_order', value: stream.field_order })
        }
    } else {
        codecProps.push({ name: 'codec', value: codecType })
        codecProps.push({ name: 'channel_count', value: stream.channels || 2 })
        codecProps.push({ name: 'sample_size', value: stream.bits_per_sample || 16 })
        codecProps.push({ name: 'sample_rate', value: parseInt(stream.sample_rate || '44100') })
        if (stream.channel_layout) {
            codecProps.push({ name: 'channel_layout', value: stream.channel_layout })
        }
    }

    const codecBox: Dty.Mp4Box = {
        type: codecType,
        name: codecType.toUpperCase() + 'SampleEntry',
        offset: 0,
        size: 78,
        headerSize: 8,
        properties: codecProps,
        expanded: false
    }

    return {
        type: 'stsd',
        name: getBoxName('stsd'),
        offset: 0,
        size: 86 + 78,
        headerSize: 8,
        properties: props,
        children: [codecBox],
        expanded: true
    }
}

function buildSttsBox(stream: FfprobeStream): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    const nbFrames = parseInt(stream.nb_frames || '0')
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 0, isHex: true })
    props.push({ name: 'entry_count', value: nbFrames > 0 ? 1 : 0 })
    if (nbFrames > 0) {
        props.push({ name: 'sample_count', value: nbFrames })
        const duration = parseFloat(stream.duration || '0')
        props.push({ name: 'sample_delta', value: Math.round(duration * 1000 / nbFrames) })
    }

    return {
        type: 'stts',
        name: getBoxName('stts'),
        offset: 0,
        size: 24,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function buildStscBox(): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 0, isHex: true })
    props.push({ name: 'entry_count', value: 1 })
    props.push({ name: 'first_chunk', value: 1 })
    props.push({ name: 'samples_per_chunk', value: 1 })
    props.push({ name: 'sample_description_index', value: 1 })

    return {
        type: 'stsc',
        name: getBoxName('stsc'),
        offset: 0,
        size: 16,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function buildStszBox(stream: FfprobeStream): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    const nbFrames = parseInt(stream.nb_frames || '0')
    const bitRate = parseInt(stream.bit_rate || '0')
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 0, isHex: true })
    props.push({ name: 'sample_size', value: 0 })
    props.push({ name: 'sample_count', value: nbFrames })
    if (nbFrames > 0 && bitRate > 0) {
        const avgSampleSize = Math.round(bitRate / 8 / (parseFloat(stream.r_frame_rate?.split('/')[0] || '25') / parseFloat(stream.r_frame_rate?.split('/')[1] || '1')))
        props.push({ name: 'avg_sample_size', value: avgSampleSize + ' bytes' })
    }

    return {
        type: 'stsz',
        name: getBoxName('stsz'),
        offset: 0,
        size: 20,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function buildStcoBox(): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 0, isHex: true })
    props.push({ name: 'entry_count', value: 0 })

    return {
        type: 'stco',
        name: getBoxName('stco'),
        offset: 0,
        size: 16,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function buildStssBox(stream: FfprobeStream): Dty.Mp4Box | null {
    if (stream.codec_type !== 'video') {
        return null
    }
    
    const props: Dty.Mp4BoxProperty[] = []
    
    props.push({ name: 'version', value: 0 })
    props.push({ name: 'flags', value: 0, isHex: true })
    props.push({ name: 'entry_count', value: 0 })

    return {
        type: 'stss',
        name: getBoxName('stss'),
        offset: 0,
        size: 16,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function buildStblBox(stream: FfprobeStream): Dty.Mp4Box {
    const children: Dty.Mp4Box[] = [
        buildStsdBox(stream),
        buildSttsBox(stream),
        buildStscBox(),
        buildStszBox(stream),
        buildStcoBox()
    ]
    
    const stssBox = buildStssBox(stream)
    if (stssBox) {
        children.push(stssBox)
    }

    return {
        type: 'stbl',
        name: getBoxName('stbl'),
        offset: 0,
        size: 0,
        headerSize: 8,
        children: children,
        expanded: true
    }
}

function buildMinfBox(stream: FfprobeStream): Dty.Mp4Box {
    const isVideo = stream.codec_type === 'video'
    const children: Dty.Mp4Box[] = []
    
    if (isVideo) {
        children.push(buildVmhdBox(stream))
    } else {
        children.push(buildSmhdBox(stream))
    }
    
    children.push(buildDinfBox())
    children.push(buildStblBox(stream))

    return {
        type: 'minf',
        name: getBoxName('minf'),
        offset: 0,
        size: 0,
        headerSize: 8,
        children: children,
        expanded: true
    }
}

function buildMdiaBox(stream: FfprobeStream): Dty.Mp4Box {
    return {
        type: 'mdia',
        name: getBoxName('mdia'),
        offset: 0,
        size: 0,
        headerSize: 8,
        children: [
            buildMdhdBox(stream),
            buildHdlrBox(stream),
            buildMinfBox(stream)
        ],
        expanded: true
    }
}

function buildTrakBox(stream: FfprobeStream, trackId: number): Dty.Mp4Box {
    return {
        type: 'trak',
        name: getBoxName('trak'),
        offset: 0,
        size: 0,
        headerSize: 8,
        children: [
            buildTkhdBox(stream, trackId),
            buildMdiaBox(stream)
        ],
        expanded: true
    }
}

function buildMdatBox(fileSize: number): Dty.Mp4Box {
    const props: Dty.Mp4BoxProperty[] = []
    
    props.push({ name: 'size', value: fileSize })
    props.push({ name: 'size_formatted', value: formatBytes(fileSize) })

    return {
        type: 'mdat',
        name: getBoxName('mdat'),
        offset: 0,
        size: fileSize,
        headerSize: 8,
        properties: props,
        expanded: false
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function parseMp4Box(filePath: string): Promise<Dty.Resp<Dty.ParseMp4BoxResp>> {
    const resp = new Dty.Resp<Dty.ParseMp4BoxResp>()
    const startTime = Date.now()

    try {
        if (!fs.existsSync(filePath)) {
            return resp.err(`File not found: ${filePath}`)
        }

        const stats = fs.statSync(filePath)
        const fileSize = stats.size

        const ffprobeData = await runFfprobe(filePath)
        
        const boxes: Dty.Mp4Box[] = []
        
        boxes.push(buildFtypBox(ffprobeData.format))
        
        const moovChildren: Dty.Mp4Box[] = []
        moovChildren.push(buildMvhdBox(ffprobeData.format))
        
        if (ffprobeData.streams && ffprobeData.streams.length > 0) {
            ffprobeData.streams.forEach((stream, index) => {
                moovChildren.push(buildTrakBox(stream, index + 1))
            })
        }
        
        const moovBox: Dty.Mp4Box = {
            type: 'moov',
            name: getBoxName('moov'),
            offset: 0,
            size: 0,
            headerSize: 8,
            children: moovChildren,
            expanded: true
        }
        boxes.push(moovBox)
        
        boxes.push(buildMdatBox(fileSize))

        resp.data = {
            boxes: boxes,
            fileSize: fileSize,
            parseTime: Date.now() - startTime
        }
        resp.success('success')
        
        logger.info(`MP4 box parsing completed in ${Date.now() - startTime}ms`)
    } catch (error) {
        logger.error(`Failed to parse MP4 box: ${error}`)
        resp.err(`Failed to parse MP4: ${error}`)
    }

    return resp
}

interface FfprobeFrame {
    media_type?: string
    stream_index?: number
    key_frame?: number
    pts?: number
    pts_time?: string
    dts?: number
    dts_time?: string
    pkt_pts?: number
    pkt_dts?: number
    pkt_duration_time?: string
    duration?: number
    duration_time?: string
    pkt_size?: number
    size?: number
    pkt_pos?: number
    pos?: number
    pict_type?: string
    time_base?: string
}

async function runFfprobeFrameInfo(filePath: string): Promise<{ format: FfprobeFormat, streams: FfprobeStream[] }> {
    return new Promise((resolve, reject) => {
        const cmd = `"${appCfg.ffprobeExe}" -v error -of json -show_format -show_streams -select_streams v:0 "${filePath}"`
        logger.info(`Running ffprobe for frame info: ${cmd}`)

        exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`ffprobe error: ${error.message}`))
                return
            }
            if (stderr && stderr.trim()) {
                logger.warn(`ffprobe stderr: ${stderr}`)
            }
            try {
                const jsonData = JSON.parse(stdout)
                resolve({
                    format: jsonData.format || {},
                    streams: jsonData.streams || []
                })
            } catch (parseError) {
                reject(new Error(`Failed to parse ffprobe output: ${parseError}`))
            }
        })
    })
}

async function runFfprobeFramesByInterval(
    filePath: string, 
    startTimeSec: number, 
    durationSec: number
): Promise<FfprobeFrame[]> {
    return new Promise((resolve, reject) => {
        const interval = `${startTimeSec.toFixed(3)}%${(startTimeSec + durationSec).toFixed(3)}`
        const cmd = `"${appCfg.ffprobeExe}" -v error -of json -select_streams v:0 -show_frames -read_intervals "${interval}" "${filePath}"`
        logger.info(`Running ffprobe for frames interval: ${cmd}`)

        exec(cmd, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`ffprobe frames error: ${error.message}`))
                return
            }
            if (stderr && stderr.trim()) {
                logger.warn(`ffprobe frames stderr: ${stderr}`)
            }
            try {
                const jsonData = JSON.parse(stdout)
                const frames = (jsonData.frames || []) as FfprobeFrame[]
                const videoFrames = frames.filter(f => f.media_type === 'video')
                resolve(videoFrames)
            } catch (parseError) {
                reject(new Error(`Failed to parse ffprobe frame output: ${parseError}`))
            }
        })
    })
}

async function analyzeFrames(filePath: string, page: number = 1, pageSize: number = 200, startTime?: number): Promise<Dty.Resp<Dty.AnalyzeFramesResp>> {
    const resp = new Dty.Resp<Dty.AnalyzeFramesResp>()
    const parseStartTime = Date.now()

    try {
        if (!fs.existsSync(filePath)) {
            return resp.err(`File not found: ${filePath}`)
        }

        const info = await runFfprobeFrameInfo(filePath)

        const videoStream = info.streams.find(s => s.codec_type === 'video')
        const duration = parseFloat(info.format.duration || videoStream?.duration || '0')

        const fpsParts = (videoStream?.r_frame_rate || '25/1').split('/')
        const fpsNum = parseFloat(fpsParts[0]) || 25
        const fpsDen = parseFloat(fpsParts[1]) || 1
        const frameRate = fpsNum / fpsDen

        const totalFrames = parseInt(videoStream?.nb_frames || '0') || Math.round(duration * frameRate)

        let streamTimeBaseNum = 1
        let streamTimeBaseDen = 1000
        if (videoStream?.time_base) {
            const tbParts = videoStream.time_base.split('/')
            streamTimeBaseNum = parseInt(tbParts[0]) || 1
            streamTimeBaseDen = parseInt(tbParts[1]) || 1000
        }

        const frameDuration = 1 / frameRate
        const pageDuration = pageSize * frameDuration
        const actualStartTime = startTime !== undefined ? startTime : (page - 1) * pageDuration
        const clampedStartTime = Math.max(0, Math.min(actualStartTime, duration - 0.1))
        const actualDuration = Math.min(pageDuration, duration - clampedStartTime)

        const rawFrames = await runFfprobeFramesByInterval(filePath, clampedStartTime, actualDuration + frameDuration)

        const frames: Dty.VideoFrame[] = rawFrames.slice(0, pageSize).map((f) => {
            let ptsTime = parseFloat(f.pts_time || '')
            let dtsTime = parseFloat(f.dts_time || '')
            
            if (isNaN(ptsTime) || ptsTime === 0) {
                if (f.pts !== undefined && f.pts !== null) {
                    const tbNum = f.time_base ? parseInt(f.time_base.split('/')[0]) || streamTimeBaseNum : streamTimeBaseNum
                    const tbDen = f.time_base ? parseInt(f.time_base.split('/')[1]) || streamTimeBaseDen : streamTimeBaseDen
                    ptsTime = f.pts * tbNum / tbDen
                } else if (f.pkt_pts !== undefined && f.pkt_pts !== null) {
                    ptsTime = f.pkt_pts / 1000
                }
            }
            
            if (isNaN(dtsTime) || dtsTime === 0) {
                if (f.dts !== undefined && f.dts !== null) {
                    const tbNum = f.time_base ? parseInt(f.time_base.split('/')[0]) || streamTimeBaseNum : streamTimeBaseNum
                    const tbDen = f.time_base ? parseInt(f.time_base.split('/')[1]) || streamTimeBaseDen : streamTimeBaseDen
                    dtsTime = f.dts * tbNum / tbDen
                } else if (f.pkt_dts !== undefined && f.pkt_dts !== null) {
                    dtsTime = f.pkt_dts / 1000
                } else {
                    dtsTime = ptsTime
                }
            }
            
            let durationTime = parseFloat(f.duration_time || '')
            if (isNaN(durationTime)) {
                durationTime = parseFloat(f.pkt_duration_time || '0')
            }
            
            const globalIndex = Math.round(ptsTime * frameRate)
            
            return {
                index: globalIndex,
                type: f.pict_type || '?',
                keyFrame: f.key_frame === 1,
                pts: ptsTime * 1000,
                dts: dtsTime * 1000,
                duration: durationTime * 1000,
                size: f.size || f.pkt_size || 0,
                offset: f.pos || f.pkt_pos || 0,
                pictType: f.pict_type
            }
        })

        resp.data = {
            frames: frames,
            totalFrames: totalFrames,
            duration: duration,
            frameRate: frameRate,
            codecName: videoStream?.codec_name || '',
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            parseTime: Date.now() - parseStartTime
        }
        resp.success('success')

        logger.info(`Frame analysis completed: page ${page}, ${frames.length} frames in ${Date.now() - parseStartTime}ms`)
    } catch (error) {
        logger.error(`Failed to analyze frames: ${error}`)
        resp.err(`Failed to analyze frames: ${error}`)
    }

    return resp
}

class Mp4Parser {
    parseMp4Box = parseMp4Box
    analyzeFrames = analyzeFrames
}

const mp4Parser = new Mp4Parser()
export default mp4Parser
