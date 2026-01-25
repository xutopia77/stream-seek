<template>
    <div class="progress-bar">
        <!-- 合并后的进度条 -->
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
            <div class="played-progress" :style="{ width: playBarPercent }"></div>
            <div class="thumb" :style="{ left: playBarPercent }"></div>
            <div
                v-for="splitInfo in videoSplitInfo"
                :key="splitInfo.percent"
                class="thumb"
                :style="{
                    left: `${splitInfo.percent}%`,
                    backgroundColor: splitInfo.color,
                    width: '1px'
                }"
            ></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useAppStore } from '../../stores/AppStore'
const appStore = useAppStore()
// import { IpcApi } from '../../utils/ipcApi'
import util from '../../utils/util.js'
import MessageShow from '../util/MessageShow'
import * as DataTypes from '../../../../bridge/dataTypedef'

const mergedProgressBar = ref<HTMLElement | null>(null)
const isDragging = ref<boolean>(false)
const isMouseOver = ref<boolean>(false) // 新增：记录鼠标是否在进度条上

const playBarPercent = computed(() => {
    if (appStore.curVideoInfo?.mediaInfo?.duration == null) {
        return `${0 * 100}%`
    }
    if (appStore.curVideoInfo?.mediaInfo?.duration == 0) {
        return `${0 * 100}%`
    }
    return `${(appStore.videoPlayCtrl.curTime / appStore.curVideoInfo.mediaInfo.duration) * 100}%`
})

// 拖动进度条改变播放位置
const seekVideo = (time: number): void => {
    appStore.barSeekTime = time
}

let videoSplitInfo = computed(() => {
    let resp: DataTypes.SplitInfo[] = []
    if (appStore.curVideoInfo?.splitInfo != null) {
        resp = appStore.curVideoInfo.splitInfo.splits
    }
    if (appStore.bShowKeyFrameInfo) {
        const kFrameInfo = appStore.curVideoInfo?.frameInfo
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

// 生成进度条片段数据
const barClips = ref<DataTypes.BarClip[]>([])
// 监听 barColorCfg 和 curSltVideo 的变化
watch(
    [
        (): DataTypes.File | null => appStore.curSltVideo,
        (): number | undefined => appStore.curVideoInfo?.mediaInfo?.duration,
        (): DataTypes.SplitInfo[] | undefined => appStore.curVideoInfo?.splitInfo?.splits
    ],
    () => {
        if (appStore.curVideoInfo?.mediaInfo?.duration == null) {
            return
        }
        barClips.value = util.update_bar_clips()
    }
)

async function processShowKeyInfo(): Promise<void> {
    if (appStore.curVideoInfo == null) {
        MessageShow.error(`请先打开视频文件`)
        return
    }
    if (appStore.bShowKeyFrameInfo == false) {
        return
    }
    if (
        appStore.curVideoInfo?.frameInfo?.frames != null &&
        appStore.curVideoInfo.frameInfo.frames.length > 0
    ) {
        return
    }
    const response = await util.getKeyFrameInfo()
    if (response.code != 0) {
        MessageShow.error(`get key frame info err:${response.status}`)
    } else {
        console.log('get key frame info success', response)
        MessageShow.info(response.bOver == false ? '正在处理...' : `获取关键帧信息成功`)
    }
}

watch(
    (): boolean => appStore.bShowKeyFrameInfo,
    async () => {
        await processShowKeyInfo()
    }
)

// tooltip 相关
const showTip = ref<boolean>(false)
const currentClip = ref<DataTypes.BarClip>()

const showTooltip = (clip: DataTypes.BarClip): void => {
    showTip.value = true
    currentClip.value = clip
}

const handleMouseOut = (event: MouseEvent, clip: DataTypes.BarClip): void => {
    const tooltip = (event.target as HTMLElement).querySelector('.tooltip')
    if (!tooltip || !tooltip.contains(event.relatedTarget as Node)) {
        showTip.value = false
        currentClip.value = undefined
    }
    if (clip) {
        return
    }
}

// 处理进度条鼠标按下事件
const onProgressBarMouseDown = (event: MouseEvent): void => {
    if (appStore.curVideoInfo?.mediaInfo?.duration == null) {
        return
    }
    isDragging.value = true
    const rect = mergedProgressBar.value?.getBoundingClientRect()
    if (rect) {
        const clickX = event.clientX - rect.left
        const progress = (clickX / rect.width) * appStore.curVideoInfo?.mediaInfo.duration
        seekVideo(progress)
    }
}

// // 处理进度条鼠标移动事件
// const onProgressBarMouseMove = (event: MouseEvent): void => {
//   if (appStore.curVideoInfo?.mediaInfo?.duration == null) {
//     return
//   }
//   if (isDragging.value) {
//     const rect = mergedProgressBar.value?.getBoundingClientRect()
//     if (rect) {
//       const clickX = event.clientX - rect.left
//       const progress = (clickX / rect.width) * appStore.curVideoInfo?.mediaInfo.duration
//       seekVideo(progress)
//     }
//   }
// }

// // 处理进度条鼠标抬起事件
// const onProgressBarMouseUp = (): void => {
//   isDragging.value = false
// }

// // 处理进度条鼠标进入事件
// const onProgressBarMouseEnter = (): void => {
//   isMouseOver.value = true
//   mergedProgressBar.value?.focus() // 使进度条获取焦点
// }

// // 处理进度条鼠标离开事件
// const onProgressBarMouseLeave = (): void => {
//   isDragging.value = false
//   isMouseOver.value = false
// }

// 处理进度条键盘按下事件
const onProgressBarKeyDown = (event: KeyboardEvent): void => {
    if (appStore.curVideoInfo?.mediaInfo?.duration == null) {
        return
    }
    if (isMouseOver.value) {
        const step = 1 // 每次移动的秒数
        let newTime = appStore.videoPlayCtrl.curTime
        if (event.key === 'ArrowLeft') {
            newTime = Math.max(0, newTime - step)
        } else if (event.key === 'ArrowRight') {
            newTime = Math.min(appStore.curVideoInfo?.mediaInfo?.duration, newTime + step)
        }
        if (newTime !== appStore.videoPlayCtrl.curTime) {
            seekVideo(newTime)
        }
    }
}

// 组件挂载时生成进度条片段数据
onMounted(() => {
    if (appStore.curVideoInfo?.mediaInfo?.duration == null) {
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

.played-progress {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background-color: #212122;
    opacity: 0.8;
    transition: width 0.2s ease;
}

.thumb {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    /* 调整宽度以模拟大写 I 的形状 */
    background: #eaeef1;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
    cursor: pointer;
    transition: left 0.2s ease;
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
