<template>
    <div class="detail-panel">
        <div class="panel-header">
            <span class="header-title">{{ t('mediaInfo.detailInfo') }}</span>
        </div>
        <div class="panel-content xc-scrollbar">
            <div v-if="!box" class="no-selection">
                <span>{{ t('mediaInfo.selectBoxHint') }}</span>
            </div>
            <template v-else>
                <div class="info-section">
                    <h4 class="section-title">{{ t('mediaInfo.boxBasic') }}</h4>
                    <div class="info-table">
                        <div class="info-row">
                            <span class="info-label">type</span>
                            <span class="info-value">{{ box.type }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">name</span>
                            <span class="info-value">{{ box.name }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">size</span>
                            <span class="info-value">{{ formatSize(box.size) }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">offset</span>
                            <span class="info-value offset-value"
                                >0x{{
                                    box.offset.toString(16).toUpperCase().padStart(8, '0')
                                }}</span
                            >
                        </div>
                    </div>
                </div>

                <div v-if="box.properties && box.properties.length > 0" class="info-section">
                    <h4 class="section-title">{{ t('mediaInfo.boxProperties') }}</h4>
                    <div class="info-table">
                        <div v-for="(prop, index) in box.properties" :key="index" class="info-row">
                            <span class="info-label">{{ prop.name }}</span>
                            <span class="info-value" :class="{ 'prop-hex': prop.isHex }">
                                {{ prop.isHex ? formatHex(prop.value) : prop.value }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="info-section">
                    <h4 class="section-title">{{ t('mediaInfo.boxDescription') }}</h4>
                    <div class="description-content">
                        {{ getBoxDescription(box.type) }}
                    </div>
                </div>

                <div v-if="box.children && box.children.length > 0" class="info-section">
                    <h4 class="section-title">
                        {{ t('mediaInfo.childBoxes') }} ({{ box.children.length }})
                    </h4>
                    <div class="children-list">
                        <div v-for="(child, index) in box.children" :key="index" class="child-item">
                            <span class="child-type">{{ child.type }}</span>
                            <span class="child-name">{{ child.name }}</span>
                            <span class="child-size">{{ formatSize(child.size) }}</span>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import * as Dty from '../../../bridge/dataTypedef'

const { t } = useI18n()

defineProps<{
    box: Dty.Mp4Box | null
}>()

const BOX_DESCRIPTIONS: Record<string, string> = {
    ftyp: 'FileTypeBox (文件类型盒) - 位于MP4文件开头，标识文件类型和兼容性。包含major_brand(主要品牌标识)、minor_version(版本号)和compatible_brands(兼容品牌列表)。播放器通过此盒判断是否支持该文件格式。常见品牌包括isom、mp42、avc1、M4V等。',

    moov: 'MovieBox (电影盒) - MP4文件的元数据容器，包含所有媒体数据的描述信息。这是整个文件最重要的容器盒，内部包含mvhd(电影头)、trak(轨道)等子盒。所有播放控制信息、轨道信息、时间信息都存储在此盒中。',

    mvhd: 'MovieHeaderBox (电影头盒) - 定义整个电影的全局信息。包含创建时间、修改时间、时间刻度、总时长、播放速率(默认1.0)、音量(默认1.0)和变换矩阵。时间刻度定义了时间的基准单位，通常为1000(毫秒)或600。',

    trak: 'TrackBox (轨道盒) - 代表一个独立的媒体轨道(视频、音频或字幕)。每个trak包含tkhd(轨道头)、mdia(媒体信息)等子盒。一个MP4文件可包含多个trak，如一个视频轨道和一个音频轨道。',

    tkhd: 'TrackHeaderBox (轨道头盒) - 定义单个轨道的元数据。包含轨道ID、创建/修改时间、时长、分辨率(视频轨道)、音量(音频轨道)、图层顺序和变换矩阵。flags字段指示轨道是否启用、是否在电影中使用等。',

    mdia: 'MediaBox (媒体盒) - 包含轨道的媒体数据和描述信息。内部包含mdhd(媒体头)、hdlr(处理器)和minf(媒体信息)。定义了媒体的类型、时间信息和样本数据结构。',

    mdhd: 'MediaHeaderBox (媒体头盒) - 定义媒体的时间信息。包含创建时间、修改时间、时间刻度、时长和语言代码。时间刻度定义了该轨道的时间基准，视频轨道通常使用帧率的倒数，音频轨道使用采样率。',

    hdlr: 'HandlerBox (处理器盒) - 标识媒体的类型和处理程序。handler_type字段指示媒体类型：vide(视频)、soun(音频)、text(字幕)等。name字段包含处理程序的描述名称，如"VideoHandler"或"SoundHandler"。',

    minf: 'MediaInformationBox (媒体信息盒) - 包含媒体的具体信息。内部包含vmhd/smhd(视频/音频媒体头)、dinf(数据信息)和stbl(样本表)。这是媒体数据的实际描述容器。',

    vmhd: 'VideoMediaHeaderBox (视频媒体头盒) - 定义视频轨道的显示特性。包含graphicsmode(图形模式)和opcolor(操作颜色)，用于视频的合成和叠加处理。通常graphicsmode为0(直接复制)，opcolor为0。',

    smhd: 'SoundMediaHeaderBox (声音媒体头盒) - 定义音频轨道的播放特性。包含balance(平衡)字段，控制左右声道的音量平衡。0表示居中，-1表示完全左声道，+1表示完全右声道。',

    dinf: 'DataInformationBox (数据信息盒) - 包含媒体数据的引用信息。内部包含dref(数据引用)盒，定义媒体数据的位置和访问方式。数据可以存储在同一个文件中或外部文件中。',

    dref: 'DataReferenceBox (数据引用盒) - 包含数据引用条目列表。每个条目描述一个数据源的位置。entry_count指示引用数量，通常为1。子盒url或urn定义具体的数据位置，self_reference标志表示数据在同一文件中。',

    stbl: 'SampleTableBox (样本表盒) - 媒体数据的核心索引容器。包含多个子盒描述样本的位置、时间、大小和同步信息。包括stsd(样本描述)、stts(时间到样本)、stsc(样本到块)、stsz(样本大小)、stco(块偏移)等。播放器通过这些表定位和解码每个样本。',

    stsd: 'SampleDescriptionBox (样本描述盒) - 包含样本的编码格式信息。entry_count指示描述数量，每个条目是一个具体编码格式的描述盒(如avc1、mp4a)。包含编码器配置、分辨率、采样率等解码所需信息。',

    stts: 'TimeToSampleBox (时间到样本盒) - 定义样本的时间戳映射。包含entry_count个条目，每个条目描述连续sample_count个样本，每个样本的持续时间是sample_delta。播放器通过此表计算每个样本的显示时间。',

    stsc: 'SampleToChunkBox (样本到块盒) - 定义样本在块中的分布。包含entry_count个条目，每个条目描述从first_chunk开始，每个块包含samples_per_chunk个样本，使用sample_description_index指定的描述。用于定位样本所在的块。',

    stsz: 'SampleSizeBox (样本大小盒) - 定义每个样本的字节大小。如果sample_size不为0，则所有样本大小相同；否则需要sample_count个条目描述每个样本的大小。播放器通过此表知道每个样本需要读取多少数据。',

    stco: 'ChunkOffsetBox (块偏移盒) - 定义每个块在文件中的字节偏移量。entry_count指示块数量，每个条目是一个块的起始位置。与stsc配合使用，可以定位任意样本在文件中的位置。co64用于大文件(偏移超过4GB)。',

    stss: 'SyncSampleBox (同步样本盒) - 定义关键帧(I帧)的位置。entry_count指示关键帧数量，每个条目是一个关键帧的样本序号。播放器从随机位置开始播放时，需要找到最近的关键帧进行解码。视频轨道通常包含此盒。',

    ctts: 'CompositionTimeToSampleBox (组合时间到样本盒) - 定义解码时间到显示时间的偏移。用于处理B帧等需要重新排序的视频。sample_count个样本的显示时间需要加上sample_offset。没有B帧的视频不需要此盒。',

    mdat: 'MediaDataBox (媒体数据盒) - 存储实际的媒体数据(视频帧、音频帧)。这是文件中最大的部分，包含所有编码后的音视频数据。播放器通过stbl中的索引表定位mdat中的具体样本数据。'
}

function getBoxDescription(type: string): string {
    const trimmedType = type.trim()
    return (
        BOX_DESCRIPTIONS[trimmedType] ||
        `${type} - 这是一个MP4容器格式的Box结构。MP4文件由一系列Box组成，每个Box包含类型、大小和数据。Box可以嵌套形成树状结构。`
    )
}

function formatSize(size: number): string {
    if (size === 0) return '0'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
    return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function formatHex(value: string | number | boolean): string {
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    const num = typeof value === 'string' ? parseInt(value, 10) : value
    if (isNaN(num)) return String(value)
    return `0x${num.toString(16).toUpperCase().padStart(8, '0')}`
}
</script>

<style scoped>
.detail-panel {
    height: 100%;
    width: 320px;
    min-width: 280px;
    display: flex;
    flex-direction: column;
    background-color: #1e1e1e;
    border-left: 1px solid #333;
}

.panel-header {
    padding: 8px 12px;
    background-color: #2d2d30;
    border-bottom: 1px solid #444;
}

.header-title {
    font-size: 13px;
    font-weight: 600;
    color: #ddd;
}

.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
}

.no-selection {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: #5a5a5a;
    font-size: 12px;
}

.info-section {
    margin-bottom: 16px;
}

.section-title {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: #9cdcfe;
}

.info-table {
    display: flex;
    flex-direction: column;
}

.info-row {
    display: grid;
    grid-template-columns: 90px 1fr;
    padding: 3px 0;
    border-bottom: 1px solid #2d2d30;
    font-size: 11px;
}

.info-label {
    color: #858585;
}

.info-value {
    color: #ccc;
    word-break: break-all;
}

.prop-hex {
    color: #b5cea8;
    font-family: 'Consolas', monospace;
}

.offset-value {
    color: #b5cea8;
    font-family: 'Consolas', monospace;
}

.description-content {
    font-size: 11px;
    line-height: 1.6;
    color: #a0a0a0;
    background: #252526;
    padding: 8px 10px;
    border-radius: 4px;
    border-left: 3px solid #007acc;
}

.children-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.child-item {
    display: grid;
    grid-template-columns: 70px 1fr 60px;
    padding: 3px 6px;
    background: #252526;
    border-radius: 2px;
    font-size: 11px;
}

.child-item:hover {
    background: #37373d;
}

.child-type {
    color: #569cd6;
    font-family: 'Consolas', monospace;
}

.child-name {
    color: #ccc;
}

.child-size {
    color: #858585;
    text-align: right;
}
</style>
