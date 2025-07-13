<template>
    <div class="video-preview-container">
        <div class="preview-container">
            <div class="preview-image">
                <!-- <video src="./data/00_20250313113251_20250313114420.mp4" controls></video> -->
                <video
                    v-show="viewModel === 'video'"
                    ref="videoRef"
                    :src="appStore.videoPlayCtrl.curSrc"
                ></video>
                <ThumbnailView v-show="viewModel === 'thumbnail'"></ThumbnailView>
            </div>
            <VideList v-if="rightPanel === 'list'" />
            <VideoWorkPanel v-if="rightPanel === 'workPanel'" />
        </div>
        <div class="control-container">
            <PlayProgressBar />
            <PlayCtrl />
        </div>
    </div>
</template>

<script lang="ts" setup>
import VideList from './video_view/VideList.vue'
import VideoWorkPanel from './video_view/VideoWorkPanel.vue'
import ThumbnailView from './video_view/ThumbnailView.vue'
import PlayProgressBar from './video_view/PlayProgressBar.vue'
import PlayCtrl from './video_view/PlayCtrl.vue'
import { ref, onMounted, watch, onBeforeMount, computed, onUnmounted, onBeforeUnmount } from 'vue'
import util from '../utils/util'
import { PlayReq } from '../utils/util'
import { useAppStore } from '../stores/AppStore'
import * as DataTypes from '../../../bridge/dataTypedef'
// import MessageShow from './util/MessageShow'
const appStore = useAppStore()

let rightPanel = computed(() => appStore.rightPanel)

const viewModel = computed(() => {
    return appStore.curViewModel
})

const videoRef = ref<HTMLVideoElement | null>(null)

watch(
    () => appStore.curSltVideo,
    async (newVal: DataTypes.File | null) => {
        if (newVal == null) {
            if (videoRef.value) {
                videoRef.value.src = ''
            }
            return
        }
        const clearReq = new DataTypes.ClearSltInfoReq()
        clearReq.bNotClear_curSltVideo = true
        util.clear_cur_slt_video_info(clearReq)
        await util.get_slt_video(newVal)
        console.log(`video info ${newVal}`)
        const playReq = new PlayReq(DataTypes.File.makePlayUrl(newVal))
        if (videoRef.value == null) {
            return
        }
        util.play_video(videoRef.value, playReq)
    }
)

watch(
    () => appStore.videoPlayCtrl.isPlay,
    () => {
        if (videoRef.value == null) {
            return console.log('video ref null')
        }
        util.toggle_play(videoRef.value)
        console.log('video ref', `${videoRef.value.src}`)
    }
)

function nextFrame(): void {
    if (videoRef.value != null) {
        const frameRate = appStore.curVideoInfo?.mediaInfo?.video.frame_rate
        if (frameRate == null) {
            console.log('frame rate is null')
            return
        }
        let video = videoRef.value
        if (!video.paused) video.pause()
        const frameInterval = 1 / frameRate
        util.set_video_cur_time(video, video.currentTime + frameInterval)
    }
}

function previousFrame(): void {
    if (videoRef.value != null) {
        const frameRate = appStore.curVideoInfo?.mediaInfo?.video.frame_rate
        if (frameRate == null) {
            console.log('frame rate is null')
            return
        }
        let video = videoRef.value
        if (!video.paused) video.pause()
        const frameInterval = 1 / frameRate
        util.set_video_cur_time(video, Math.max(0, video.currentTime - frameInterval))
    }
}

// 防止刚切换过来，videoRef为空，导致没有开始播放，所以等待videoRef不为空后再播放
watch(
    () => videoRef.value,
    (newVal) => {
        if (newVal == null) {
            return
        }
        if (appStore.curSltVideo != null) {
            if (videoRef.value == null) {
                console.log('video ref null')
                return
            }
            const playReq = new PlayReq(DataTypes.File.makePlayUrl(appStore.curSltVideo))
            util.play_video(videoRef.value, playReq)
        }
    }
)

// 播放模式，video or thumbnail
watch(
    () => appStore.curViewModel,
    (newVal) => {
        if (newVal === 'video') {
            if (appStore.curSltVideo == null) {
                return
            }

            if (appStore.curSltVideo != null) {
                if (videoRef.value == null) {
                    console.log('video ref null')
                    return
                }
                const playReq = new PlayReq(DataTypes.File.makePlayUrl(appStore.curSltVideo))
                if (appStore.thumbSeekTime != 0) {
                    playReq.playStartTimeSec = appStore.thumbSeekTime
                }
                util.play_video(videoRef.value, playReq)
            }
        } else if (newVal === 'thumbnail') {
            // const removeEventListeners = setupVideoEventListeners()
            // if (removeEventListeners != null) {
            //   removeEventListeners()
            // }
            util.clear_cur_slt_video_info({ clearModel: 'changeToThumbnail' })
        } else {
            console.log('unsupported view model:', newVal)
        }
    }
)

watch(
    () => appStore.videoPlayCtrl.playbackRate,
    () => {
        if (videoRef.value != null) {
            videoRef.value.playbackRate = appStore.videoPlayCtrl.playbackRate
        }
    }
)

/*
        0 (HAVE_NOTHING)：没有获取到任何视频的相关信息。
        1 (HAVE_METADATA)：已经获取到视频的元数据（如时长、尺寸等），但没有足够的数据来播放。
        2 (HAVE_CURRENT_DATA)：当前播放位置的数据已可用，但不足以播放下一帧。
        3 (HAVE_FUTURE_DATA)：当前播放位置及后续部分数据可用，可以播放一小段时间。
        4 (HAVE_ENOUGH_DATA)：有足够的数据可以流畅播放。
      */

// watch(
//   () => appStore.barSeekTime,
//   (newValue) => {
//     if (videoRef.value != null) {
//       /*
//         0 (HAVE_NOTHING)：没有获取到任何视频的相关信息。
//         1 (HAVE_METADATA)：已经获取到视频的元数据（如时长、尺寸等），但没有足够的数据来播放。
//         2 (HAVE_CURRENT_DATA)：当前播放位置的数据已可用，但不足以播放下一帧。
//         3 (HAVE_FUTURE_DATA)：当前播放位置及后续部分数据可用，可以播放一小段时间。
//         4 (HAVE_ENOUGH_DATA)：有足够的数据可以流畅播放。
//       */
//       console.log(
//         `seek to ${newValue}, duration ${videoRef.value.duration}, state ${videoRef.value.readyState}`
//       )
//       videoRef.value.currentTime = newValue + appStore.videoPlayCtrl.videoStartTime
//       // util.set_video_cur_time(videoRef.value, newValue + appStore.videoPlayCtrl.videoStartTime)
//     }
//   }
// )

// 提取比较逻辑到独立函数
function isSeekSuccessful(currentTime: number, targetTime: number): boolean {
    return Math.abs(currentTime - targetTime) < 0.2
}

watch(
    () => appStore.barSeekTime,
    (newValue) => {
        if (videoRef.value != null) {
            const trySeek = (): void => {
                if (videoRef.value == null) {
                    return
                }
                const targetTime = newValue + appStore.videoPlayCtrl.videoStartTime
                videoRef.value.currentTime = targetTime
                // console.log(
                //   `retry seek to ${newValue}, duration ${videoRef.value.duration}, state ${videoRef.value.readyState}, currentTime ${appStore.videoPlayCtrl.curTime}, abs diff ${appStore.videoPlayCtrl.curTime - targetTime}`
                // )
                console.log(
                    `retry seek to ${targetTime}(start:${appStore.videoPlayCtrl.videoStartTime}), state ${videoRef.value.readyState}, currentTime ${appStore.videoPlayCtrl.curTime}, abs diff ${appStore.videoPlayCtrl.curTime - targetTime}`
                )
                if (isSeekSuccessful(appStore.videoPlayCtrl.curTime, targetTime)) {
                    return
                }

                if (videoRef.value.readyState >= 2) {
                    videoRef.value.currentTime = targetTime
                    console.log(
                        `seek to ${newValue}, duration ${videoRef.value.duration}, state ${videoRef.value.readyState}, currentTime ${appStore.videoPlayCtrl.curTime}`
                    )
                } else {
                    // 如果状态不满足，等待一段时间后重试
                    // console.log(
                    //   `retry seek to ${newValue}, duration ${videoRef.value.duration}, state ${videoRef.value.readyState}, currentTime ${appStore.videoPlayCtrl.curTime}`
                    // )
                    setTimeout(trySeek, 100)
                }
            }

            trySeek()
        }
    }
)

watch(
    () => appStore.videoPlayCtrl.isStop,
    (newValue) => {
        if (videoRef.value != null) {
            if (newValue == true) {
                videoRef.value.pause()
            }
        }
    }
)

onBeforeMount(() => {
    appStore.func_nextFrame = nextFrame
    appStore.func_prevFrame = previousFrame
    appStore.func_get_ele_video = (): HTMLVideoElement | null => {
        return videoRef.value
    }
})
onMounted(() => {
    if (videoRef.value == null) {
        console.log('video ref null')
        return
    }
    util.setupVideoEventListeners(videoRef.value)
})

onBeforeUnmount(() => {
    if (videoRef.value == null) {
        console.log('video ref null')
        return
    }
    util.stop_play()
    util.toggle_play(videoRef.value)
    videoRef.value.src = ''
})

onUnmounted(() => {
    if (videoRef.value == null) {
        console.log('video ref null')
        return
    }
    util.setupVideoEventListeners(videoRef.value, true)
    util.clear_cur_slt_video_info(null)
})
</script>

<style scoped>
.video-preview-container {
    height: calc(100% - 30px);
    width: 100%;
    padding: 0;
    margin: 0;
    background-color: #f0f2f7;
    display: flex;
    flex-direction: column;
}

.preview-container {
    width: 100%;
    height: calc(100% - 60px);
    padding: 0;
    margin: 0;
    display: flex;
}

.preview-image {
    height: 100%;
    width: 90%;
    padding: 0;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: black;
}

.preview-image video {
    max-height: 100%;
    width: 100%;
    padding: 0;
    margin: 0;
    object-fit: contain;
    /* 确保视频适应容器 */
}

.control-container {
    height: 60px;
    width: 100%;
    padding: 0;
    margin: 0;
}
</style>
