<template>
    <div class="progress-bar">
        <!-- Merged progress bar -->
        <div
            ref="mergedProgressBar"
            class="merged-progress-bar"
            tabindex="0"
            @mousedown="onProgressBarMouseDown"
            @keydown="onProgressBarKeyDown"
        >
            <!-- @mousemove="onProgressBarMouseMove"
        @mouseup="onProgressBarMouseUp"
        @mouseleave="onProgressBarMouseLeave"
        @mouseenter="onProgressBarMouseEnter"
        -->
            <div
                v-for="(clip, index) in barClips"
                :key="index"
                class="progress-bar-clip"
                :style="{
                    left: `${clip.percent}%`,
                    width: `${clip.width}%`,
                    backgroundColor: clip.color
                }"
                @mouseover="showTooltip(clip)"
                @mouseout="handleMouseOut($event, clip)"
            >
                <div v-if="showTip && currentClip === clip && clip.tip" class="tooltip">
                    {{ `${clip.tip}` }}
                </div>
            </div>
            <div class="thumb" :style="{ left: playBarPercent }"></div>
            <div
                v-for="(splitInfo, index) in videoSplitInfo"
                :key="index"
                class="split-marker"
                :style="{ left: `${splitInfo.percent}%` }"
            ></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useAppStore } from '../../stores/AppStore'
import { useI18n } from 'vue-i18n'
const appStore = useAppStore()
// import { IpcApi } from '../../utils/ipcApi'
import util from '../../utils/util.js'
import * as Dty from '../../../../bridge/dataTypedef'

const { t } = useI18n()

const mergedProgressBar = ref<HTMLElement | null>(null)
const isDragging = ref<boolean>(false)
const isMouseOver = ref<boolean>(false) // New: record whether mouse is over progress bar

const playBarPercent = computed(() => {
    if (appStore.curSltVideo?.mediaInfo?.duration == null) {
        return `${0 * 100}%`
    }
    if (appStore.curSltVideo?.mediaInfo?.duration == 0) {
        return `${0 * 100}%`
    }
    return `${(appStore.videoPlayCtrl.curTime / appStore.curSltVideo.mediaInfo.duration) * 100}%`
})

// Drag progress bar to change playback position
const seekVideo = (time: number): void => {
    console.log('seekVideo', time)
    appStore.barSeekTime = time
}

let videoSplitInfo = computed(() => {
    let resp: Dty.SplitInfo[] = []
    if (
        appStore.curSltVideo?.splitInfo != null &&
        appStore.curSltVideo?.splitInfo.splits?.length > 0
    ) {
        resp = appStore.curSltVideo.splitInfo.splits
    }
    if (resp == null) {
        resp = []
    }
    if (appStore.bShowKeyFrameInfo) {
        const kFrameInfo = appStore.curSltVideo?.frameInfo
        if (kFrameInfo != null) {
            const respKframe = util.updateKeyframeSplitInfo(kFrameInfo)
            resp = resp.concat(respKframe)
        }
    }
    if (resp == null) {
        return []
    }
    resp.sort((a, b) => a.percent - b.percent)
    return resp
})

// Generate progress bar segment data
const barClips = ref<Dty.BarClip[]>([])
watch(
    [
        (): Dty.File | null => appStore.curSltVideo,
        (): number | undefined => appStore.curSltVideo?.mediaInfo?.duration,
        (): Dty.SplitInfo[] | undefined => appStore.curSltVideo?.splitInfo?.splits
    ],
    () => {
        if (appStore.curSltVideo == null || appStore.curSltVideo?.mediaInfo?.duration == null) {
            barClips.value = []
            return
        }
        barClips.value = util.update_bar_clips()
    },
    { deep: true }
)

async function processShowKeyInfo(): Promise<void> {
    if (appStore.curSltVideo == null) {
        util.addToastErr(t('playProgressBar.openVideoFirst'))
        return
    }
    if (appStore.bShowKeyFrameInfo == false) {
        return
    }
    if (
        appStore.curSltVideo?.frameInfo?.frames != null &&
        appStore.curSltVideo.frameInfo.frames.length > 0
    ) {
        return
    }
    const response = await util.getKeyFrameInfo()
    if (response.code != 0) {
        util.addToastErr(`${t('playProgressBar.getKeyFrameError')}: ${response.status}`)
    } else {
        console.log('get key frame info success', response)
        util.addToastInfo(
            response.bOver == false
                ? t('playProgressBar.processing')
                : t('playProgressBar.getKeyFrameSuccess')
        )
    }
}

watch(
    (): boolean => appStore.bShowKeyFrameInfo,
    async () => {
        await processShowKeyInfo()
    }
)

// tooltip related
const showTip = ref<boolean>(false)
const currentClip = ref<Dty.BarClip>()

const showTooltip = (clip: Dty.BarClip): void => {
    showTip.value = true
    currentClip.value = clip
}

const handleMouseOut = (event: MouseEvent, clip: Dty.BarClip): void => {
    const tooltip = (event.target as HTMLElement).querySelector('.tooltip')
    if (!tooltip || !tooltip.contains(event.relatedTarget as Node)) {
        showTip.value = false
        currentClip.value = undefined
    }
    if (clip) {
        return
    }
}

// Handle progress bar mouse down event
const onProgressBarMouseDown = (event: MouseEvent): void => {
    if (appStore.curSltVideo?.mediaInfo?.duration == null) {
        return
    }
    isDragging.value = true
    const rect = mergedProgressBar.value?.getBoundingClientRect()
    if (rect) {
        const clickX = event.clientX - rect.left
        const progress = (clickX / rect.width) * appStore.curSltVideo?.mediaInfo.duration
        seekVideo(progress)
    }
}

// // Handle progress bar mouse move event
// const onProgressBarMouseMove = (event: MouseEvent): void => {
//   if (appStore.curSltVideo?.mediaInfo?.duration == null) {
//     return
//   }
//   if (isDragging.value) {
//     const rect = mergedProgressBar.value?.getBoundingClientRect()
//     if (rect) {
//       const clickX = event.clientX - rect.left
//       const progress = (clickX / rect.width) * appStore.curSltVideo?.mediaInfo.duration
//       seekVideo(progress)
//     }
//   }
// }

// // Handle progress bar mouse up event
// const onProgressBarMouseUp = (): void => {
//   isDragging.value = false
// }

// // Handle progress bar mouse enter event
// const onProgressBarMouseEnter = (): void => {
//   isMouseOver.value = true
//   mergedProgressBar.value?.focus() // Give focus to progress bar
// }

// // Handle progress bar mouse leave event
// const onProgressBarMouseLeave = (): void => {
//   isDragging.value = false
//   isMouseOver.value = false
// }

// Handle progress bar key down event
const onProgressBarKeyDown = (event: KeyboardEvent): void => {
    if (appStore.curSltVideo?.mediaInfo?.duration == null) {
        return
    }
    if (isMouseOver.value) {
        const step = 1 // Seconds to move each time
        let newTime = appStore.videoPlayCtrl.curTime
        if (event.key === 'ArrowLeft') {
            newTime = Math.max(0, newTime - step)
        } else if (event.key === 'ArrowRight') {
            newTime = Math.min(appStore.curSltVideo?.mediaInfo?.duration, newTime + step)
        }
        if (newTime !== appStore.videoPlayCtrl.curTime) {
            seekVideo(newTime)
        }
    }
}

// Generate progress bar segment data when component is mounted
onMounted(() => {
    if (appStore.curSltVideo?.mediaInfo?.duration == null) {
        return
    }
    barClips.value = util.update_bar_clips()
})
</script>

<style scoped>
.progress-bar {
    height: 10px;
    width: 100%;
    padding: 0;
    margin: 0;
    background-color: #333;
    position: relative;
    overflow: hidden;
}

.merged-progress-bar {
    height: 100%;
    position: relative;
    cursor: pointer;
}

.progress-bar-clip {
    position: absolute;
    height: 100%;
    border-radius: 2px;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
    opacity: 0.8;
    transition: opacity 0.2s ease;
    max-width: 100%;
}

.progress-bar-clip:hover {
    opacity: 1;
}

.thumb {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #eaeef1;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
    cursor: pointer;
    transition: left 0.2s ease;
}

.split-marker {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(255, 255, 255, 0.5);
    pointer-events: none;
}

.tooltip {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: #333;
    color: white;
    padding: 5px;
    border-radius: 3px;
    font-size: 12px;
    z-index: 999;
}
</style>
