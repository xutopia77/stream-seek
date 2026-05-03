<template>
    <div class="media-info-container">
        <div class="info-card">
            <h3 class="card-title">{{ t('mediaInfo.fileInfo') }}</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.fileName') }}:</span>
                    <span class="info-value">{{ mediaInfo?.name || '-' }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.filePath') }}:</span>
                    <span class="info-value path-value">{{ mediaInfo?.path || '-' }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.fileSize') }}:</span>
                    <span class="info-value">{{ formatFileSize(mediaInfo?.size) }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.duration') }}:</span>
                    <span class="info-value">{{ formatDuration(mediaInfo?.mediaInfo?.duration) }}</span>
                </div>
            </div>
        </div>

        <div class="info-card">
            <h3 class="card-title">{{ t('mediaInfo.videoInfo') }}</h3>
            <div class="info-grid" v-if="mediaInfo?.mediaInfo?.video">
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.codec') }}:</span>
                    <span class="info-value">{{ mediaInfo.mediaInfo.video.codec_name || '-' }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.resolution') }}:</span>
                    <span class="info-value">{{ mediaInfo.mediaInfo.video.width }} x {{ mediaInfo.mediaInfo.video.height }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.frameRate') }}:</span>
                    <span class="info-value">{{ mediaInfo.mediaInfo.video.frame_rate?.toFixed(2) || '-' }} fps</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.bitRate') }}:</span>
                    <span class="info-value">{{ formatBitRate(mediaInfo.mediaInfo.video.bit_rate) }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.pixelFormat') }}:</span>
                    <span class="info-value">{{ mediaInfo.mediaInfo.video.pix_fmt || '-' }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.totalFrames') }}:</span>
                    <span class="info-value">{{ Math.round(mediaInfo.mediaInfo.video.nb_frames) || '-' }}</span>
                </div>
            </div>
            <div v-else class="no-info">
                {{ t('mediaInfo.noVideoInfo') }}
            </div>
        </div>

        <div class="info-card">
            <h3 class="card-title">{{ t('mediaInfo.audioInfo') }}</h3>
            <div class="info-grid" v-if="mediaInfo?.mediaInfo?.audio">
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.codec') }}:</span>
                    <span class="info-value">{{ mediaInfo.mediaInfo.audio.codec_name || '-' }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.sampleRate') }}:</span>
                    <span class="info-value">{{ formatSampleRate(mediaInfo.mediaInfo.audio.sample_rate) }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.channels') }}:</span>
                    <span class="info-value">{{ getChannelName(mediaInfo.mediaInfo.audio.channels) }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.bitRate') }}:</span>
                    <span class="info-value">{{ formatBitRate(mediaInfo.mediaInfo.audio.bit_rate) }}</span>
                </div>
            </div>
            <div v-else class="no-info">
                {{ t('mediaInfo.noAudioInfo') }}
            </div>
        </div>

        <div class="info-card">
            <h3 class="card-title">{{ t('mediaInfo.containerInfo') }}</h3>
            <div class="info-grid" v-if="mediaInfo?.mediaInfo">
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.streamCount') }}:</span>
                    <span class="info-value">{{ mediaInfo.mediaInfo.nb_streams || '-' }}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.startTime') }}:</span>
                    <span class="info-value">{{ mediaInfo.mediaInfo.start_time?.toFixed(3) || '-' }} s</span>
                </div>
                <div class="info-item">
                    <span class="info-label">{{ t('mediaInfo.overallBitRate') }}:</span>
                    <span class="info-value">{{ formatBitRate(mediaInfo.mediaInfo.bit_rate) }}</span>
                </div>
            </div>
            <div v-else class="no-info">
                {{ t('mediaInfo.noContainerInfo') }}
            </div>
        </div>

        <div v-if="!mediaInfo" class="no-media-selected">
            <span class="hint-text">{{ t('mediaInfo.noMediaSelected') }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../stores/AppStore'
import { useI18n } from 'vue-i18n'
import '@renderer/assets/common.css'

const { t } = useI18n()
const appStore = useAppStore()

const mediaInfo = computed(() => appStore.curSltVideo)

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
        return `${(sampleRate / 1000).toFixed(1)} kHz`
    }
    return `${sampleRate} Hz`
}

function getChannelName(channels: number | undefined): string {
    if (!channels) return '-'
    switch (channels) {
        case 1: return t('mediaInfo.mono')
        case 2: return t('mediaInfo.stereo')
        case 6: return '5.1 ' + t('mediaInfo.surround')
        case 8: return '7.1 ' + t('mediaInfo.surround')
        default: return `${channels} ${t('mediaInfo.channels')}`
    }
}
</script>

<style scoped>
.media-info-container {
    height: 100%;
    width: 100%;
    padding: 15px;
    margin: 0;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    box-sizing: border-box;
}

.info-card {
    background-color: #2d2d30;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.card-title {
    margin: 0 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid #444;
    color: #ddd;
    font-size: 15px;
    font-weight: 600;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 16px;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.info-label {
    color: #858585;
    font-size: 12px;
}

.info-value {
    color: #ccc;
    font-size: 13px;
    word-break: break-all;
}

.path-value {
    font-size: 11px;
    color: #9cdcfe;
}

.no-info {
    color: #858585;
    font-size: 13px;
    font-style: italic;
}

.no-media-selected {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
}

.hint-text {
    color: #858585;
    font-size: 14px;
}
</style>
