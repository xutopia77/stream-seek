<template>
    <div class="media-info-container">
        <div class="sidebar">
            <div class="sidebar-item active">
                <span class="sidebar-icon">📊</span>
                <span>{{ t('mediaInfo.overview') }}</span>
            </div>
            <div class="sidebar-item" :class="{ disabled: true }">
                <span class="sidebar-icon">📁</span>
                <span>MP4 {{ t('mediaInfo.structure') }}</span>
            </div>
            <div class="sidebar-item" :class="{ disabled: true }">
                <span class="sidebar-icon">📈</span>
                <span>{{ t('mediaInfo.frameAnalysis') }}</span>
            </div>
            <div class="sidebar-item" :class="{ disabled: true }">
                <span class="sidebar-icon">🕐</span>
                <span>{{ t('mediaInfo.timestamp') }}</span>
            </div>
            <div class="sidebar-item" :class="{ disabled: true }">
                <span class="sidebar-icon">〰️</span>
                <span>{{ t('mediaInfo.bitrate') }}</span>
            </div>
            <div class="sidebar-item" :class="{ disabled: true }">
                <span class="sidebar-icon">🔗</span>
                <span>{{ t('mediaInfo.avSync') }}</span>
            </div>
            <div class="sidebar-item" :class="{ disabled: true }">
                <span class="sidebar-icon">⏱</span>
                <span>{{ t('mediaInfo.frameInterval') }}</span>
            </div>
        </div>

        <div class="content-area">
            <div v-if="!videoFile" class="no-media-selected">
                <span class="hint-text">{{ t('mediaInfo.noMediaSelected') }}</span>
                <span class="hint-subtext">{{ t('mediaInfo.openVideoHint') }}</span>
            </div>
            <div v-else-if="!hasMediaInfo" class="no-media-selected">
                <span class="hint-text">{{ t('mediaInfo.noMediaInfo') }}</span>
                <span class="hint-subtext">{{ videoFile?.name }}</span>
            </div>
            <template v-else>
                <section class="info-section">
                    <h3 class="section-title">{{ t('mediaInfo.overview') }}</h3>
                    <div class="info-table">
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.fileName') }}</span>
                            <span class="info-value">{{ videoFile?.name || '-' }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.fileSize') }}</span>
                            <span class="info-value">{{ formatFileSize(videoFile?.size) }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.fileType') }}</span>
                            <span class="info-value">{{ getFileExtension(videoFile?.name) }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.filePath') }}</span>
                            <span class="info-value path-value">{{ videoFile?.path || '-' }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.duration') }}</span>
                            <span class="info-value">{{ formatDuration(videoFile?.duration || videoFile?.mediaInfo?.duration) }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.overallBitRate') }}</span>
                            <span class="info-value">{{ formatBitRate(videoFile?.mediaInfo?.bit_rate) }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.streamCount') }}</span>
                            <span class="info-value">{{ videoFile?.mediaInfo?.nb_streams || '-' }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.totalFrames') }}</span>
                            <span class="info-value">{{ videoFile?.mediaInfo?.video?.nb_frames ? Math.round(videoFile.mediaInfo.video.nb_frames) : '-' }}</span>
                        </div>
                    </div>
                </section>

                <section class="info-section">
                    <h3 class="section-title">{{ t('mediaInfo.videoInfo') }}</h3>
                    <div class="info-table" v-if="videoFile?.mediaInfo?.video">
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.streamIndex') }}</span>
                            <span class="info-value">0</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.codec') }}</span>
                            <span class="info-value">{{ videoFile.mediaInfo.video.codec_name || '-' }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.codecType') }}</span>
                            <span class="info-value">{{ videoFile.mediaInfo.video.codec_type || '-' }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.resolution') }}</span>
                            <span class="info-value">{{ videoFile.mediaInfo.video.width }} x {{ videoFile.mediaInfo.video.height }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.frameRate') }}</span>
                            <span class="info-value">{{ videoFile.mediaInfo.video.frame_rate?.toFixed(3) || '-' }} fps</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.pixelFormat') }}</span>
                            <span class="info-value">{{ videoFile.mediaInfo.video.pix_fmt || '-' }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.bitRate') }}</span>
                            <span class="info-value">{{ formatBitRate(videoFile.mediaInfo.video.bit_rate) }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.totalFrames') }}</span>
                            <span class="info-value">{{ Math.round(videoFile.mediaInfo.video.nb_frames) || '-' }}</span>
                        </div>
                    </div>
                    <div v-else class="no-info">
                        {{ t('mediaInfo.noVideoInfo') }}
                    </div>
                </section>

                <section class="info-section">
                    <h3 class="section-title">{{ t('mediaInfo.audioInfo') }}</h3>
                    <div class="info-table" v-if="videoFile?.mediaInfo?.audio">
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.streamIndex') }}</span>
                            <span class="info-value">1</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.codec') }}</span>
                            <span class="info-value">{{ videoFile.mediaInfo.audio.codec_name || '-' }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.codecType') }}</span>
                            <span class="info-value">{{ videoFile.mediaInfo.audio.codec_type || '-' }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.sampleRate') }}</span>
                            <span class="info-value">{{ formatSampleRate(videoFile.mediaInfo.audio.sample_rate) }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.channels') }}</span>
                            <span class="info-value">{{ getChannelName(videoFile.mediaInfo.audio.channels) }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.channelLayout') }}</span>
                            <span class="info-value">{{ videoFile.mediaInfo.audio.channel_layout || '-' }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">{{ t('mediaInfo.bitRate') }}</span>
                            <span class="info-value">{{ formatBitRate(videoFile.mediaInfo.audio.bit_rate) }}</span>
                        </div>
                    </div>
                    <div v-else class="no-info">
                        {{ t('mediaInfo.noAudioInfo') }}
                    </div>
                </section>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../stores/AppStore'
import { useI18n } from 'vue-i18n'
import '@renderer/assets/common.css'
import * as Dty from '../../../bridge/dataTypedef'

const { t } = useI18n()
const appStore = useAppStore()

const videoFile = computed<Dty.File | null>(() => {
    const file = appStore.curSltVideo
    if (!file) return null
    return file
})

const hasMediaInfo = computed(() => {
    const info = videoFile.value?.mediaInfo
    if (!info) return false
    return info.duration !== undefined && info.duration > 0
})

function formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '-'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`
}

function formatDuration(seconds: number | undefined): string {
    if (!seconds) return '-'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

function formatBitRate(bitsPerSecond: number | undefined): string {
    if (!bitsPerSecond) return '-'
    if (bitsPerSecond >= 1000000) {
        return `${(bitsPerSecond / 1000000).toFixed(2)} Mbps`
    } else if (bitsPerSecond >= 1000) {
        return `${(bitsPerSecond / 1000).toFixed(2)} Kbps`
    }
    return `${bitsPerSecond} bps`
}

function formatSampleRate(sampleRate: number | undefined): string {
    if (!sampleRate) return '-'
    if (sampleRate >= 1000) {
        return `${sampleRate} Hz`
    }
    return `${sampleRate} Hz`
}

function getChannelName(channels: number | undefined): string {
    if (!channels) return '-'
    switch (channels) {
        case 1: return t('mediaInfo.mono')
        case 2: return t('mediaInfo.stereo')
        case 6: return '5.1'
        case 8: return '7.1'
        default: return `${channels}`
    }
}

function getFileExtension(filename: string | undefined): string {
    if (!filename) return '-'
    const ext = filename.split('.').pop()?.toUpperCase() || ''
    return ext
}
</script>

<style scoped>
.media-info-container {
    height: 100%;
    width: 100%;
    display: flex;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.sidebar {
    width: 160px;
    min-width: 160px;
    background-color: #252526;
    border-right: 1px solid #333;
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.sidebar-item {
    padding: 10px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #ccc;
    transition: background-color 0.15s ease;
}

.sidebar-item:hover:not(.disabled) {
    background-color: #37373d;
}

.sidebar-item.active {
    background-color: #094771;
    color: #fff;
}

.sidebar-item.disabled {
    color: #5a5a5a;
    cursor: not-allowed;
}

.sidebar-icon {
    font-size: 14px;
    width: 18px;
    text-align: center;
}

.content-area {
    flex: 1;
    padding: 20px 30px;
    overflow-y: auto;
}

.info-section {
    margin-bottom: 24px;
}

.section-title {
    margin: 0 0 12px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #444;
    color: #ddd;
    font-size: 15px;
    font-weight: 600;
}

.info-table {
    display: flex;
    flex-direction: column;
}

.info-row {
    display: grid;
    grid-template-columns: 140px 1fr;
    padding: 6px 0;
    border-bottom: 1px solid #2d2d30;
    font-size: 13px;
}

.info-row:last-child {
    border-bottom: none;
}

.info-label {
    color: #858585;
}

.info-value {
    color: #cccccc;
    word-break: break-all;
}

.path-value {
    color: #9cdcfe;
    font-size: 12px;
}

.no-info {
    color: #858585;
    font-size: 13px;
    font-style: italic;
    padding: 12px 0;
}

.no-media-selected {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 8px;
}

.hint-text {
    color: #858585;
    font-size: 14px;
}

.hint-subtext {
    color: #5a5a5a;
    font-size: 12px;
}
</style>
