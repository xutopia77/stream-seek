<template>
    <div class="video-preview-container">
        <div class="preview-container">
            <div class="preview-image">
                <video
                    v-show="viewModel === 'video'"
                    ref="videoRef"
                    :src="appStore.videoPlayCtrl.curSrc"
                ></video>
                <ThumbnailView v-show="viewModel === 'thumbnail'"></ThumbnailView>
            </div>
            <div class="work-panel">
                <VideList v-if="rightPanel === Dty.WorkPanel.List" />
                <VideoOperatePanel v-if="rightPanel === Dty.WorkPanel.Operate" />
                <VideoInfo v-if="rightPanel === Dty.WorkPanel.VideoInfo" />
            </div>
        </div>
        <div class="control-container">
            <PlayProgressBar />
            <PlayCtrl />
        </div>
    </div>
</template>

<script lang="ts" setup>
import VideList from './video_view/work_panel/VideList.vue'
import VideoOperatePanel from './video_view/work_panel/VideoOperatePanel.vue'
import VideoInfo from './video_view/work_panel/VideoInfo.vue'
import ThumbnailView from './video_view/ThumbnailView.vue'
import PlayProgressBar from './video_view/PlayProgressBar.vue'
import PlayCtrl from './video_view/PlayCtrl.vue'
import { PlayReq } from '../utils/util'
import { ref, onMounted, watch, onBeforeMount, computed, onUnmounted, onBeforeUnmount } from 'vue'
import util from '@renderer/utils/util'
import { useAppStore } from '@renderer/stores/AppStore'
const appStore = useAppStore()
import * as Dty from '../../../bridge/dataTypedef'

let rightPanel = computed(() => appStore.rightPanel)

const viewModel = computed(() => {
    return appStore.curViewModel
})

const videoRef = ref<HTMLVideoElement | null>(null)

watch(
    () => appStore.curSltVideoName4Play,
    () => {
        if (
            appStore.curSltVideoName4Play == null ||
            appStore.curSltVideoName4Play == '' ||
            appStore.curSltVideo == null
        ) {
            if (videoRef.value) {
                videoRef.value.src = ''
            }
            return
        }
        const clearReq = new Dty.ClearSltInfoReq()
        clearReq.bNotClear_curSltVideo = true
        util.clear_cur_slt_video_info(clearReq)
        console.log(`video info ${appStore.curSltVideo}`)

        const playReq = new PlayReq(Dty.File.makePlayUrl(appStore.curSltVideo))
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
        const frameRate = appStore.curSltVideo?.mediaInfo?.video.frame_rate
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
        const frameRate = appStore.curSltVideo?.mediaInfo?.video.frame_rate
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
            const playReq = new PlayReq(Dty.File.makePlayUrl(appStore.curSltVideo))
            util.play_video(videoRef.value, playReq)
        }
    }
)

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
                const playReq = new PlayReq(Dty.File.makePlayUrl(appStore.curSltVideo))
                if (appStore.thumbSeekTime != 0) {
                    playReq.playStartTimeSec = appStore.thumbSeekTime
                }
                util.play_video(videoRef.value, playReq)
            }
        } else if (newVal === 'thumbnail') {
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

watch(
    () => appStore.barSeekTime,
    (newValue) => {
        if (videoRef.value != null) {
            const targetTime = newValue + appStore.videoPlayCtrl.videoStartTime

            const wasPlaying = !videoRef.value.paused
            if (wasPlaying) {
                videoRef.value.pause()
            }

            videoRef.value.currentTime = targetTime

            console.log(
                `seeking to ${targetTime}(start:${appStore.videoPlayCtrl.videoStartTime}), state ${videoRef.value.readyState}, currentTime ${appStore.videoPlayCtrl.curTime}`
            )

            const waitForSeek = new Promise<void>((resolve) => {
                const onSeeked = (): void => {
                    videoRef.value?.removeEventListener('seeked', onSeeked)
                    videoRef.value?.removeEventListener('error', onError)
                    resolve()
                }

                const onError = (): void => {
                    videoRef.value?.removeEventListener('seeked', onSeeked)
                    videoRef.value?.removeEventListener('error', onError)
                    console.error('Video seek error')
                    resolve()
                }

                videoRef.value?.addEventListener('seeked', onSeeked, { once: true })
                videoRef.value?.addEventListener('error', onError, { once: true })
            })

            waitForSeek.then(() => {
                if (wasPlaying && videoRef.value) {
                    videoRef.value.play()
                }
                console.log(
                    `seek completed to ${targetTime}, currentTime ${appStore.videoPlayCtrl.curTime}`
                )
            })
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
    height: calc(100% - var(--xc-home-nac-height));
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
    flex: 1;
    padding: 0;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: black;
}

.work-panel {
    height: 100%;
    width: 20%;
    max-width: 250px;
    padding: 0;
    margin: 0;
}

.preview-image video {
    max-height: 100%;
    width: 100%;
    padding: 0;
    margin: 0;
    object-fit: contain;
}

.control-container {
    height: 60px;
    width: 100%;
    padding: 0;
    margin: 0;
}
</style>
