<template>
  <div class="video-preview-container">
    <div class="preview-container">
      <div class="preview-image">
        <!-- <video src="./data/00_20250313113251_20250313114420.mp4" controls></video> -->
        <video
          v-if="viewModel === 'video'"
          ref="videoRef"
          :src="appStore.videoPlayCtrl.curSrc"
        ></video>
        <ThumbnailView v-if="viewModel === 'thumbnail'"></ThumbnailView>
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
import { ref, onMounted, watch, onBeforeMount, computed, onUnmounted } from 'vue'
import { IpcApi } from '../utils/IpcApi'
import util from '../utils/util'
import { PlayReq } from '../utils/util'
import { useAppStore } from '../stores/AppStore'
import * as DataTypes from '../../../bridge/dataTypedef'
// import MessageShow from './util/MessageShow'
// 明确 IpcApi 实例的类型
const ipcAPi: IpcApi = new IpcApi()
// 明确 appStore 的类型
const appStore = useAppStore()

let rightPanel = computed(() => appStore.rightPanel)

const viewModel = computed(() => {
  return appStore.curViewModel
})

const videoRef = ref<HTMLVideoElement | null>(null)

watch(
  () => appStore.curSltVideo,
  async (newVal) => {
    if (newVal == null) {
      return
    }
    if (videoRef.value == null) {
      return console.log('video ref null')
    }
    const clearReq = new DataTypes.ClearSltInfoReq()
    clearReq.bNotClear_curSltVideo = true
    util.clear_cur_slt_video_info(clearReq)
    await util.get_slt_video(ipcAPi, newVal)
    const playReq = new PlayReq(newVal.src)
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
    video.currentTime += frameInterval
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
    video.currentTime = Math.max(0, video.currentTime - frameInterval)
  }
}

// 防止刚切换过来，videoRef为空，导致没有开始播放，所以等待videoRef不为空后再播放
watch(
  () => videoRef.value,
  (newVal) => {
    if (newVal == null) {
      return
    }
    if (appStore.curSltVideo?.src != null) {
      if (videoRef.value == null) {
        console.log('video ref null')
        return
      }
      const playReq = new PlayReq(appStore.curSltVideo.src)
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
      if (appStore.thumbSeekTime != 0) {
        appStore.videoPlayCtrl.curTime = appStore.thumbSeekTime
      }

      if (appStore.curSltVideo?.src != null) {
        if (videoRef.value == null) {
          console.log('video ref null')
          return
        }
        const playReq = new PlayReq(appStore.curSltVideo.src)
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

watch(
  () => appStore.barSeekTime,
  (newValue) => {
    if (videoRef.value != null) {
      videoRef.value.currentTime = newValue + appStore.videoPlayCtrl.videoStartTime
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
  object-fit: contain; /* 确保视频适应容器 */
}
.control-container {
  height: 60px;
  width: 100%;
  padding: 0;
  margin: 0;
}
</style>
