<template>
    <div class="frame-analysis-container">
        <div class="frame-toolbar">
            <div class="toolbar-left">
                <span class="info-text" v-if="videoInfo">
                    {{ videoInfo.codecName }} | {{ videoInfo.width }}x{{ videoInfo.height }} | {{ frameRateText }} | Total: {{ totalFrames }} frames
                </span>
            </div>
            <div class="toolbar-right">
                <button class="tool-btn" :disabled="!selectedFrame || selectedFrame.index === 0" @click="goToPrevFrame" title="Previous Frame">
                    ◀ Prev
                </button>
                <button class="tool-btn" :disabled="!selectedFrame || selectedFrame.index >= frames.length - 1" @click="goToNextFrame" title="Next Frame">
                    Next ▶
                </button>
                <select v-model="filterType" class="type-filter">
                    <option value="all">All Frames</option>
                    <option value="key">Key Frames (I)</option>
                    <option value="non-key">Non-Key (P/B)</option>
                </select>
                <input type="text" v-model="searchIndex" placeholder="Go to index..." class="index-input" @keyup.enter="jumpToIndex">
                <span class="zoom-label">Zoom:</span>
                <button class="tool-btn zoom-btn" @click="zoomOut">−</button>
                <span class="zoom-value">{{ zoom }}%</span>
                <button class="tool-btn zoom-btn" @click="zoomIn">+</button>
            </div>
        </div>

        <div class="frame-main-area">
            <div class="frame-table-wrapper xc-scrollbar">
                <table class="frame-table">
                    <thead>
                        <tr>
                            <th class="col-index">#</th>
                            <th class="col-type">Type</th>
                            <th class="col-pts">PTS</th>
                            <th class="col-dts">DTS</th>
                            <th class="col-duration">Duration</th>
                            <th class="col-size">Size</th>
                            <th class="col-offset">Offset</th>
                            <th class="col-pict">Pict</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="frame in filteredFrames"
                            :key="frame.index"
                            :class="{ 'selected': selectedFrame?.index === frame.index, 'is-keyframe': frame.keyFrame }"
                            @click="onSelectFrame(frame)"
                        >
                            <td class="col-index">{{ frame.index }}</td>
                            <td class="col-type">
                                <span class="type-badge" :class="'type-' + frame.pictType?.toLowerCase()">
                                    {{ frame.pictType || '-' }}
                                </span>
                            </td>
                            <td class="col-pts">{{ formatTime(frame.pts) }}</td>
                            <td class="col-dts">{{ formatTime(frame.dts) }}</td>
                            <td class="col-duration">{{ formatDuration(frame.duration) }}</td>
                            <td class="col-size">{{ formatSize(frame.size) }}</td>
                            <td class="col-offset">{{ formatHex(frame.offset) }}</td>
                            <td class="col-pict">{{ frame.keyFrame ? '●' : '○' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="frame-detail-panel">
                <div class="panel-header">
                    <span class="header-title">Frame Detail</span>
                    <span class="header-subtitle" v-if="selectedFrame">#{{ selectedFrame?.index }}</span>
                </div>
                <div class="panel-content xc-scrollbar">
                    <div v-if="!selectedFrame" class="no-selection">
                        <span>Select a frame to view details</span>
                    </div>
                    <template v-else>
                        <div class="detail-section">
                            <h4 class="section-title">Basic Info</h4>
                            <div class="detail-grid">
                                <div class="detail-row">
                                    <span class="detail-label">Index</span>
                                    <span class="detail-value">{{ selectedFrame.index }}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Type</span>
                                    <span class="detail-value">
                                        <span class="type-badge" :class="'type-' + (selectedFrame.pictType?.toLowerCase() || 'unknown')">
                                            {{ selectedFrame.pictType || '-' }}
                                        </span>
                                    </span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Key Frame</span>
                                    <span class="detail-value" :class="{ 'val-true': selectedFrame.keyFrame }">
                                        {{ selectedFrame.keyFrame ? 'Yes' : 'No' }}
                                    </span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">PTS</span>
                                    <span class="detail-value val-time">{{ formatTime(selectedFrame.pts) }}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">DTS</span>
                                    <span class="detail-value val-time">{{ formatTime(selectedFrame.dts) }}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Duration</span>
                                    <span class="detail-value">{{ formatDuration(selectedFrame.duration) }}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Size</span>
                                    <span class="detail-value">{{ formatSize(selectedFrame.size) }}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">File Offset</span>
                                    <span class="detail-value val-hex">{{ formatHex(selectedFrame.offset) }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h4 class="section-title">Analysis</h4>
                            <div class="analysis-grid">
                                <div class="analysis-item">
                                    <span class="analysis-label">Avg Frame Size</span>
                                    <span class="analysis-value">{{ avgFrameSize }}</span>
                                </div>
                                <div class="analysis-item">
                                    <span class="analysis-label">Bitrate (this)</span>
                                    <span class="analysis-value">{{ frameBitrate }}</span>
                                </div>
                                <div class="analysis-item">
                                    <span class="analysis-label">Key Frame Interval</span>
                                    <span class="analysis-value">{{ keyFrameInterval }}</span>
                                </div>
                                <div class="analysis-item">
                                    <span class="analysis-label">Position in GOP</span>
                                    <span class="analysis-value">{{ gopPosition }}</span>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <div class="frame-preview-area">
            <div class="preview-header">
                <span class="preview-title">Video Preview</span>
                <span class="preview-info" v-if="selectedFrame">
                    Frame #{{ selectedFrame.index }} @ {{ formatTime(selectedFrame.pts) }}
                </span>
            </div>
            <div class="preview-content">
                <div class="no-preview" v-if="!selectedFrame">
                    <span>Click a frame to preview</span>
                </div>
                <div class="hex-preview" v-else>
                    <div class="hex-info">
                        <span>Offset: {{ formatHex(selectedFrame.offset) }} | Size: {{ formatSize(selectedFrame.size) }} bytes</span>
                    </div>
                    <div class="hex-visual">
                        <div class="hex-bar" :style="{ width: Math.min(100, (selectedFrame.size / maxFrameSize) * 100) + '%' }"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as Dty from '../../../bridge/dataTypedef'

const props = defineProps<{
    frames: Dty.VideoFrame[]
    videoInfo?: {
        codecName: string
        width: number
        height: number
        frameRate: number
        totalFrames: number
        duration: number
    }
}>()

const emit = defineEmits<{
    (e: 'select', frame: Dty.VideoFrame): void
}>()

const selectedFrame = ref<Dty.VideoFrame | null>(null)
const filterType = ref<'all' | 'key' | 'non-key'>('all')
const searchIndex = ref('')
const zoom = ref(100)

const filteredFrames = computed(() => {
    let result = props.frames
    if (filterType.value === 'key') {
        result = result.filter(f => f.keyFrame)
    } else if (filterType.value === 'non-key') {
        result = result.filter(f => !f.keyFrame)
    }
    return result
})

const totalFrames = computed(() => props.videoInfo?.totalFrames || props.frames.length)
const frameRateText = computed(() => {
    const fps = props.videoInfo?.frameRate
    if (!fps) return '-'
    return `${fps.toFixed(3)} fps`
})

const maxFrameSize = computed(() => {
    if (props.frames.length === 0) return 1
    return Math.max(...props.frames.map(f => f.size))
})

const avgFrameSize = computed(() => {
    if (props.frames.length === 0) return '-'
    const sum = props.frames.reduce((acc, f) => acc + f.size, 0)
    return formatSize(Math.round(sum / props.frames.length))
})

const frameBitrate = computed(() => {
    if (!selectedFrame.value || selectedFrame.value.duration <= 0) return '-'
    const bitsPerSec = (selectedFrame.value.size * 8) / selectedFrame.value.duration
    if (bitsPerSec >= 1000000) return `${(bitsPerSec / 1000000).toFixed(2)} Mbps`
    if (bitsPerSec >= 1000) return `${(bitsPerSec / 1000).toFixed(2)} Kbps`
    return `${Math.round(bitsPerSec)} bps`
})

const keyFrameInterval = computed(() => {
    if (!selectedFrame.value) return '-'
    const idx = selectedFrame.value.index
    for (let i = idx - 1; i >= 0; i--) {
        if (props.frames[i]?.keyFrame) return `${idx - i} frames ago`
    }
    return 'First keyframe'
})

const gopPosition = computed(() => {
    if (!selectedFrame.value) return '-'
    let pos = 0
    for (let i = selectedFrame.value.index; i >= 0; i--) {
        if (props.frames[i]?.keyFrame) break
        pos++
    }
    return `#${pos} after last I-frame`
})

function onSelectFrame(frame: Dty.VideoFrame) {
    selectedFrame.value = frame
    emit('select', frame)
}

function goToPrevFrame() {
    if (!selectedFrame.value) return
    const currentIdx = filteredFrames.value.findIndex(f => f.index === selectedFrame.value!.index)
    if (currentIdx > 0) {
        onSelectFrame(filteredFrames.value[currentIdx - 1])
    }
}

function goToNextFrame() {
    if (!selectedFrame.value) return
    const currentIdx = filteredFrames.value.findIndex(f => f.index === selectedFrame.value!.index)
    if (currentIdx < filteredFrames.value.length - 1) {
        onSelectFrame(filteredFrames.value[currentIdx + 1])
    }
}

function jumpToIndex() {
    const idx = parseInt(searchIndex.value, 10)
    if (isNaN(idx)) return
    const frame = props.frames.find(f => f.index === idx)
    if (frame) {
        onSelectFrame(frame)
        searchIndex.value = ''
    }
}

function zoomIn() {
    zoom.value = Math.min(200, zoom.value + 10)
}

function zoomOut() {
    zoom.value = Math.max(50, zoom.value - 10)
}

function formatTime(pts: number): string {
    if (pts === undefined || pts === null) return '-'
    const seconds = pts / 1000
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.round((seconds % 1) * 1000)
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`
}

function formatDuration(dur: number): string {
    if (!dur) return '-'
    return `${dur.toFixed(2)} ms`
}

function formatSize(size: number): string {
    if (size === 0) return '0 B'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function formatHex(offset: number): string {
    return `0x${offset.toString(16).toUpperCase().padStart(8, '0')}`
}
</script>

<style scoped>
.frame-analysis-container {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.frame-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    background-color: #2d2d30;
    border-bottom: 1px solid #444;
    min-height: 36px;
}

.toolbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.info-text {
    font-size: 11px;
    color: #858585;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 6px;
}

.tool-btn {
    padding: 3px 8px;
    background-color: #3c3c3c;
    border: 1px solid #555;
    border-radius: 3px;
    color: #ccc;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
}

.tool-btn:hover:not(:disabled) {
    background-color: #505050;
    border-color: #777;
}

.tool-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.type-filter {
    padding: 3px 6px;
    background-color: #3c3c3c;
    border: 1px solid #555;
    border-radius: 3px;
    color: #ccc;
    font-size: 11px;
    outline: none;
}

.type-filter:focus {
    border-color: #007acc;
}

.index-input {
    width: 80px;
    padding: 3px 6px;
    background-color: #252526;
    border: 1px solid #555;
    border-radius: 3px;
    color: #ccc;
    font-size: 11px;
    outline: none;
}

.index-input:focus {
    border-color: #007acc;
}

.zoom-label {
    font-size: 11px;
    color: #858585;
    margin-left: 8px;
}

.zoom-btn {
    width: 24px;
    padding: 2px 0;
    text-align: center;
}

.zoom-value {
    font-size: 11px;
    color: #9cdcfe;
    min-width: 35px;
    text-align: center;
}

.frame-main-area {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
}

.frame-table-wrapper {
    flex: 1;
    overflow: auto;
}

.frame-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    table-layout: fixed;
}

.frame-table thead {
    position: sticky;
    top: 0;
    z-index: 1;
}

.frame-table th {
    position: sticky;
    top: 0;
    background-color: #2d2d30;
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
    color: #9cdcfe;
    border-bottom: 2px solid #444;
    white-space: nowrap;
}

.frame-table td {
    padding: 4px 8px;
    border-bottom: 1px solid #2d2d30;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.frame-table tbody tr {
    cursor: pointer;
    transition: background-color 0.1s;
}

.frame-table tbody tr:hover {
    background-color: #2a2d2e;
}

.frame-table tbody tr.selected {
    background-color: #094771;
}

.frame-table tbody tr.is-keyframe {
    background-color: rgba(76, 175, 80, 0.06);
}

.frame-table tbody tr.is-keyframe.selected {
    background-color: #094771;
}

.col-index { width: 55px; text-align: right; color: #858585; }
.col-type { width: 55px; text-align: center; }
.col-pts { width: 130px; font-family: 'Consolas', monospace; color: #b5cea8; }
.col-dts { width: 130px; font-family: 'Consolas', monospace; color: #b5cea8; }
.col-duration { width: 85px; font-family: 'Consolas', monospace; }
.col-size { width: 75px; text-align: right; font-family: 'Consolas', monospace; }
.col-offset { width: 110px; font-family: 'Consolas', monospace; color: #569cd6; }
.col-pict { width: 40px; text-align: center; }

.type-badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
    font-family: 'Consolas', monospace;
}

.type-i { background-color: #2e7d32; color: #a5d6a7; }
.type-p { background-color: #1565c0; color: #90caf9; }
.type-b { background-color: #e65100; color: #ffcc80; }
.type-s { background-color: #6a1b9a; color: #ce93d8; }
.type-unknown { background-color: #455a64; color: #b0bec5; }

.frame-detail-panel {
    width: 300px;
    min-width: 260px;
    display: flex;
    flex-direction: column;
    background-color: #1e1e1e;
    border-left: 1px solid #333;
}

.panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background-color: #2d2d30;
    border-bottom: 1px solid #444;
}

.header-title {
    font-size: 13px;
    font-weight: 600;
    color: #ddd;
}

.header-subtitle {
    font-size: 11px;
    color: #569cd6;
    font-family: 'Consolas', monospace;
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

.detail-section {
    margin-bottom: 16px;
}

.section-title {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: #9cdcfe;
}

.detail-grid {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.detail-row {
    display: grid;
    grid-template-columns: 90px 1fr;
    padding: 3px 0;
    font-size: 11px;
    border-bottom: 1px solid #2d2d30;
}

.detail-label {
    color: #858585;
}

.detail-value {
    color: #ccc;
    word-break: break-all;
}

.val-time {
    color: #b5cea8;
    font-family: 'Consolas', monospace;
}

.val-hex {
    color: #569cd6;
    font-family: 'Consolas', monospace;
}

.val-true {
    color: #4ec9b0;
}

.analysis-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

.analysis-item {
    display: flex;
    flex-direction: column;
    padding: 6px 8px;
    background: #252526;
    border-radius: 3px;
}

.analysis-label {
    font-size: 10px;
    color: #858585;
    margin-bottom: 2px;
}

.analysis-value {
    font-size: 12px;
    color: #ccc;
    font-weight: 500;
}

.frame-preview-area {
    height: 180px;
    min-height: 120px;
    border-top: 1px solid #333;
    display: flex;
    flex-direction: column;
}

.preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    background-color: #2d2d30;
    border-bottom: 1px solid #444;
}

.preview-title {
    font-size: 12px;
    font-weight: 600;
    color: #ddd;
}

.preview-info {
    font-size: 11px;
    color: #858585;
    font-family: 'Consolas', monospace;
}

.preview-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #111;
}

.no-preview {
    color: #5a5a5a;
    font-size: 12px;
}

.hex-preview {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 8px 16px;
}

.hex-info {
    font-size: 11px;
    color: #858585;
    margin-bottom: 8px;
    font-family: 'Consolas', monospace;
}

.hex-visual {
    flex: 1;
    display: flex;
    align-items: center;
    background: #1a1a1a;
    border-radius: 4px;
    padding: 4px;
}

.hex-bar {
    height: 20px;
    background: linear-gradient(90deg, #007acc, #00a2ff);
    border-radius: 2px;
    transition: width 0.2s ease;
}
</style>
