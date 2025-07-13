export class AppInfo {
    prjFile: string = '' // 项目文件的路径，没有项目时，为空
}

export class AppStartResp {
    appInfo: AppInfo = new AppInfo()
    prj: Prj | null = null
}

export class ThumbnailInfo {
    path: string[] = []
}

export class FileInfo {
    title: string = ''
    filePath: string = '' //文件的路径，由后端赋值
    // src: string = '' // 文件的url由前端组装
    size: number = 0
    // birthtime: string
    // mtime: string
}

export class File {
    id: number = 0 // 视频 ID，新增时可省略
    name: string = '' // 视频名称 00_20250301124348_20250301124906.mp4
    path: string = '' // 视频文件路径
    startTimeSec: number = 0 // 视频开始时间，单位秒
    endTimeSec: number = 0 // 视频结束时间，单位秒
    duration: number = 0 // 视频时长
    size: number = 0 // 视频大小，单位字节
    mediaInfo: MediaInfo | null = null // 以json字符串的形式存储在数据库
    splitInfo: SqlitInfos | null = null // 以json字符串的形式存储在数据库
    frameInfo: FrameInfo | null = null // 以json字符串的形式存储在数据库
    thumbnail: ThumbnailInfo | null = null // 以json字符串的形式存储在数据库
    eventInfo: FileEventInfo | null = null // 以json字符串的形式存储在数据库
    type: FileType = FileType.Video // 数据类型
    status: FileStatus = FileStatus.Normal // 数据状态
    static makePlayUrl(finfo: File): string {
        return `file://${finfo.path}`
    }
    static makeDisplayName(f: File): string {
        // 10_20250301105200_20250301105306.mp4
        const fileNameInfo = FileTools.parse_filename_mi(f.name)
        if (fileNameInfo === null) {
            return this.name
        }
        const year = fileNameInfo?.startTime.slice(0, 4)
        const month = fileNameInfo?.startTime.slice(4, 6)
        const day = fileNameInfo?.startTime.slice(6, 8)
        const hour = fileNameInfo?.startTime.slice(8, 10)
        const minute = fileNameInfo?.startTime.slice(10, 12)
        const second = fileNameInfo?.startTime.slice(12, 14)

        const endhour = fileNameInfo?.endTime.slice(8, 10)
        const endminute = fileNameInfo?.endTime.slice(10, 12)
        const endsecond = fileNameInfo?.endTime.slice(12, 14)
        return `${year}${month}${day}-${hour}:${minute}:${second}_${endhour}:${endminute}:${endsecond}`
    }
}

// 定义一个枚举，是数字类型，表示文件的状态
export enum FileStatus {
    Normal = 0, // 正常
    Deleted = 1, // 删除
    Error = 2 // 错误
}

export enum FileType {
    Video = 0,
    Image = 1,
    Txt = 2
}

export interface FileModel {
    id?: number // 视频 ID，新增时可省略
    name: string // 视频名称
    path: string // 视频文件路径
    startTimeSec: number // 视频开始时间，单位秒
    endTimeSec: number // 视频结束时间，单位秒
    duration: number // 视频时长
    size: number // 视频大小，单位字节
    mediaInfo: string // 以json字符串的形式存储在数据库
    splitInfo: string // 以json字符串的形式存储在数据库
    frameInfo: string // 以json字符串的形式存储在数据库
    thumbnail: string // 以json字符串的形式存储在数据库
    eventInfo: string // 以json字符串的形式存储在数据库
    type: FileType // 数据类型
    status: FileStatus // 数据状态
    created_at?: string // 创建时间，新增时可省略
    updated_at?: string // 更新时间，新增时可省略
    deleted_at?: string // 删除时间，新增时可省略
}

export class CreatePrjReq {
    dataBasePath: string = ''
}

export class SearchFileReq {
    page: number = 1
    pageSize: number = 10
    path: string | null = null
}

export class SearchFileResp {
    total: number = 0
    files: File[] = []
}

export interface SplitInfo {
    startTime: number
    endTime: number // 原数据中为字符串，这里统一为数字类型，若需要字符串类型可修改
    duration: number // 原数据中为字符串，这里统一为数字类型，若需要字符串类型可修改
    percent: number
    color: string
    currentTime: number
    isDelete: boolean
    frameIdx: number
    frameNum: number
}

export class SqlitInfos {
    splits: SplitInfo[] = []
}

export interface BarClip {
    percent: number
    width: number
    color: string
    tip: string
}

export interface FileEventInfo {
    time: number
    area: number
    x: number
    y: number
    width: number
    height: number
    center_x: number
    center_y: number
    distance: number
    object_id: number
}

export interface MediaInfo {
    nb_streams: number
    duration: number
    size: number
    start_time: number
    bit_rate: number
    video: {
        codec_name: string
        codec_type: string
        width: number
        height: number
        pix_fmt: string
        bit_rate: number
        frame_rate: number
        nb_frames: number
    }
    audio: {
        codec_name: string
        codec_type: string
        sample_rate: number
        channels: number
        bit_rate: number
        channel_layout: string
    }
}

export interface SltMediaInfo {
    mediaInfo?: MediaInfo
    eventInfo?: {
        start_time: string
        end_time: string
        execution_time: number
        file_name: string
        events: FileEventInfo[][]
    }
    splitInfo?: SplitInfo[]
    frameInfo?: FrameInfo
    thumbnail?: File[]
    // keyFrameSplitInfo?: any[]
}

export interface SltMedia {
    title: string
    src: string
    size: number
    birthtime: string
    mtime: string
    filePath: string
}

export interface MediaItem {
    title: string
    src: string
    size: number
    birthtime: string
    mtime: string
    filePath: string
}

export class Prj {
    name: string = ''
    version: string = '1.0.0'
    dataFolder: string = ''
    thumbnail_dir: string = ''
}

export interface WorkResp {
    cmd: string
    data: string
}

export interface HeartBeat {
    time: string
    appStatus: string
    workRespose?: WorkResp[]
}

export interface Req_TraversalFolder {
    folder: string
    type?: string
    startTime?: string //2025-03-25 12:00:00
    endTime?: string //2025-03-25 12:59:59
}

export interface TraversalFolder {
    folder?: string
    files?: File[]
}

export interface Req_CutVideo {
    fileInfo: File
    filepath: string
    filename: string
    baseFolder: string
}

export interface Resp_CutVideo {
    traversalResp?: Resp<TraversalFolder>
}

export class DeleteFileReq {
    baseFolder: string = '' // 会在此基础路径下创建回收站
    filepaths: string[] = []
}

export class DeleteFileResp {}

export interface Frame {
    pict_type: string
    pts_time: number
}

export interface FrameInfo {
    frames: Frame[]
}

export interface Req_FrameInfo {
    filepath: string
}

export interface Req_SltFile {
    filepath: string
}

export interface Req_SearchFile {
    folder: string
}

export interface Req_ClearWork {
    files?: File[]
}
export interface SyncPrjReq {
    prj: Prj
}
export interface Req_SyncTrash {
    folder: string
}

// ======================== main

export class DbInsertResp {
    id: number = 0
}

// ======================== render
export class ClearSltInfoReq {
    clearModel?: string
    bNotClear_curSltVideo?: boolean
}

// 定义缩略图对象的类型
export class Thumbnail {
    path: string = ''
    name: string = ''
    indexTime: number = 0
    checked: boolean = false // 由前端赋值
    btnName: string = ''
    static makeDisplayName(thumbName: string): string {
        const timeStr = thumbName
        const year = timeStr.slice(0, 4)
        const month = timeStr.slice(4, 6)
        const day = timeStr.slice(6, 8)
        const hour = timeStr.slice(8, 10)
        const minute = timeStr.slice(10, 12)
        const second = timeStr.slice(12, 14)
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`
    }
}

export interface CutVideoReq {
    bDelFullVideo?: boolean
}

// ========================
export class Resp<T = string> {
    code: number
    status: string
    bOver?: boolean
    data?: T

    constructor() {
        this.code = 0
        this.status = 'success'
        this.bOver = undefined
        this.data = undefined
    }
    err(desc: string): Resp<T> {
        this.code = 1
        this.status = desc
        return this
    }
    success(desc: string): Resp<T> {
        this.code = 0
        this.status = desc
        return this
    }
}

export interface Req<T = string> {
    cmd: string
    data?: T
    cseq?: number
}

// ======================== tools

// 定义解析文件名后的返回类型 10_20250301104336_20250301104500.mp4
interface ParsedFilename {
    sequence: string // 10
    startTime: string // 20250301104336
    endTime: string // 20250301104500
    startTimeSec: number // 开始时间 单位秒
    endTimeSec: number // 结束时间 单位秒
    durationSec: number // 视频时长 单位秒
}

export class FileTools {
    // 将秒数转换为特定格式的时间字符串 20250323140336
    static parsetimeToTimeStr(time: number): string {
        // 将秒数转换为 Date 对象
        const date = new Date(time * 1000)

        // 提取年、月、日、时、分、秒并格式化为两位数字
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hour = String(date.getHours()).padStart(2, '0')
        const minute = String(date.getMinutes()).padStart(2, '0')
        const second = String(date.getSeconds()).padStart(2, '0')

        // 组合成 20250323140336 格式的字符串
        const picTimeStr = `${year}${month}${day}${hour}${minute}${second}`
        return picTimeStr
    }
    // 解析文件名，提取序号、开始时间和结束时间 10_20250301104336_20250301104500.mp4
    static parse_filename_mi(title: string | null): ParsedFilename | null {
        if (title == null) {
            return null
        }
        const [sequence, startTime, endTimeWithExtension] = title.split('_')
        if (endTimeWithExtension === undefined) {
            return null
        }
        const endTime = endTimeWithExtension.replace('.mp4', '')
        const fileNameInfo: ParsedFilename = {
            sequence,
            startTime,
            endTime,
            startTimeSec: FileTools.parse_timestr_2_seconds(startTime),
            endTimeSec: FileTools.parse_timestr_2_seconds(endTime),
            durationSec:
                FileTools.parse_timestr_2_seconds(endTime) -
                FileTools.parse_timestr_2_seconds(startTime)
        }
        return fileNameInfo
    }
    // 将时间字符串转换为秒数 20250301104336 => 1682831816
    static parse_timestr_2_seconds(timeStr: string): number {
        const year = parseInt(timeStr.slice(0, 4), 10)
        const month = parseInt(timeStr.slice(4, 6), 10) - 1 // 月份从0开始
        const day = parseInt(timeStr.slice(6, 8), 10)
        const hour = parseInt(timeStr.slice(8, 10), 10)
        const minute = parseInt(timeStr.slice(10, 12), 10)
        const second = parseInt(timeStr.slice(12, 14), 10)
        return new Date(year, month, day, hour, minute, second).getTime() / 1000
    }
    // 将秒数转换为时间字符串 1682831816 => 20250301104336
    static parse_seconds_2_timestr(seconds: number): string {
        const date = new Date(seconds * 1000) // 将秒转换为毫秒
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const secs = String(date.getSeconds()).padStart(2, '0')
        return `${year}${month}${day}${hours}${minutes}${secs}`
    }
}

export class Utils {
    // 这里把秒变成为时分秒的形式
    static time_2_msec_str(time: number): string {
        const hours = Math.floor(time / 3600)
        const minutes = Math.floor((time % 3600) / 60)
        const seconds = Math.floor(time % 60)
        const milliseconds = Math.floor((time - Math.floor(time)) * 1000)
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
    }
}
