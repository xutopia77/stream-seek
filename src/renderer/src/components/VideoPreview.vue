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
import { useAppStore } from '../stores/AppStore'
import MessageShow from './util/MessageShow'
// 明确 IpcApi 实例的类型
const ipcAPi: IpcApi = new IpcApi()
// 明确 appStore 的类型
const appStore = useAppStore()

// 明确计算属性的类型
let rightPanel = computed(() => appStore.rightPanel) as ComputedRef<string>

// 明确计算属性的类型
const viewModel = computed(() => {
  return appStore.curViewModel
}) as ComputedRef<string>

// 明确视频元素引用的类型
const videoRef = ref<HTMLVideoElement | null>(null)

// 定义 playVideo 函数的参数和返回值类型
interface PlayVideoReq {
  onPlayCbk?: () => void
  beforePlayCbk?: () => void
}
const playVideo = (src: string, req: PlayVideoReq = {}): void => {
  if (videoRef.value == null) {
    console.log('video ref null')
    return
  }
  if (appStore.curViewModel != 'video') {
    return
  }
  videoRef.value.pause()
  appStore.videoPlayCtrl.curSrc = src
  appStore.videoPlayCtrl.isPlay = true
  appStore.videoPlayCtrl.playbeginTime = 0
  videoRef.value.load()

  const removeEventListeners = setupVideoEventListeners(req)
  if (removeEventListeners != null) {
    removeEventListeners()
  }
  // 监听 canplay 事件
  const onCanPlay = () => {
    appStore.videoPlayCtrl.curTime = 0
    if (videoRef.value.duration != appStore.curVideoInfo?.mediaInfo?.duration) {
      console.log(
        `video duration not equal appStore.duration: ${videoRef.value.duration} != ${appStore.curVideoInfo?.mediaInfo?.duration}`
      )
    }
    if (req?.beforePlayCbk != null) {
      req.beforePlayCbk()
      console.log(`video can play1111 ${appStore.videoPlayCtrl.curTime}`)
    }
    console.log(`video can play ${appStore.videoPlayCtrl.curTime}`)
    // videoRef.value.currentTime = appStore.videoPlayCtrl.curTime
    videoRef.value.play()
    setupVideoEventListeners(req)
    // 移除监听器，避免重复触发
    videoRef.value.removeEventListener('canplay', onCanPlay)
  }
  videoRef.value.addEventListener('canplay', onCanPlay)
}

watch(
  () => appStore.curSltVideo,
  async (newVal, oldVal) => {
    if (newVal === oldVal) {
      return
    }
    util.clear_cur_slt_video_info()
    await util.get_slt_video(ipcAPi, newVal)
    playVideo(newVal.src)
  },
  { deep: true }
)

watch(
  () => appStore.videoPlayCtrl.isPlay,
  (newVal, oldVal) => {
    if (newVal === oldVal) {
      return
    }
    if (videoRef.value != null) {
      if (!appStore.videoPlayCtrl.isPlay) {
        videoRef.value.pause()
      } else {
        if (!(appStore.curSltVideo != null && appStore.curSltVideo.src != null)) {
          MessageShow.error('请选择视频文件')
          return
        }
        function convert_filepath_to_linux_style(filepath: string | null): string | null {
          if (filepath == null) {
            return null
          }
          return filepath.replace(/\\/g, '/')
        }
        let p1 = convert_filepath_to_linux_style(videoRef.value.src)
        let p2 = convert_filepath_to_linux_style(appStore.curSltVideo.src)
        // 再去掉p1，p2的前缀file:// 或者 file:///
        if (p1?.startsWith('file:///')) {
          p1 = p1.substring(8)
        } else if (p1?.startsWith('file://')) {
          p1 = p1.substring(7)
        }
        if (p2?.startsWith('file:///')) {
          p2 = p2.substring(8)
        } else if (p2?.startsWith('file://')) {
          p2 = p2.substring(7)
        }
        if (p1 !== p2) {
          playVideo(appStore.curSltVideo.src)
        } else {
          videoRef.value.play()
        }
      }
    } else {
      console.log('video ref null')
    }
  }
)

// 封装视频事件监听函数，并明确返回值类型
const setupVideoEventListeners = (req: PlayVideoReq): (() => void) | null => {
  if (videoRef.value == null) {
    return null
  }
  // 监听视频加载元数据事件，获取视频总时长
  const onLoadedMetadata = () => {
    // appStore.videoPlayCtrl.duration 要废弃了
    // appStore.videoPlayCtrl.duration = videoRef.value.duration
    // 获取视频的起始时间
    appStore.videoPlayCtrl.videoStartTime = 0
  }
  videoRef.value.addEventListener('loadedmetadata', onLoadedMetadata)

  // 监听视频时间更新事件，更新当前播放时间
  const onTimeUpdate = () => {
    if (videoRef.value != null) {
      if (appStore.videoPlayCtrl.videoStartTime == 0) {
        appStore.videoPlayCtrl.videoStartTime = videoRef.value.currentTime
      }
      if (appStore.thumbSeekTime != 0) {
        videoRef.value.currentTime = appStore.thumbSeekTime
        appStore.thumbSeekTime = 0
      }
      // 减去起始时间，得到从视频起始点开始的播放时间
      appStore.videoPlayCtrl.curTime =
        videoRef.value.currentTime - appStore.videoPlayCtrl.videoStartTime
    }
  }
  videoRef.value.addEventListener('timeupdate', onTimeUpdate)

  // 监听视频播放事件，更新播放状态
  const onPlay = () => {
    appStore.videoPlayCtrl.isPlay = true
  }

  // 监听视频暂停事件，更新播放状态
  const onPause = () => {
    appStore.videoPlayCtrl.isPlay = false
  }
  videoRef.value.addEventListener('pause', onPause)

  return () => {
    videoRef.value.removeEventListener('loadedmetadata', onLoadedMetadata)
    videoRef.value.removeEventListener('timeupdate', onTimeUpdate)
    videoRef.value.removeEventListener('play', onPlay)
    videoRef.value.removeEventListener('pause', onPause)
  }
}

function nextFrame(): void {
  if (videoRef.value != null) {
    const frameRate = appStore.curVideoInfo.mediaInfo.video.frame_rate
    let video = videoRef.value
    if (!video.paused) video.pause()
    const frameInterval = 1 / frameRate
    video.currentTime += frameInterval
  }
}

function previousFrame(): void {
  if (videoRef.value != null) {
    const frameRate = appStore.curVideoInfo.mediaInfo.video.frame_rate
    let video = videoRef.value
    if (!video.paused) video.pause()
    const frameInterval = 1 / frameRate
    video.currentTime = Math.max(0, video.currentTime - frameInterval)
  }
}

// 防止刚切换过来，videoRef为空，导致没有开始播放，所以等待videoRef不为空后再播放
watch(
  () => videoRef.value,
  (newVal, oldVal) => {
    if (newVal === oldVal) {
      return
    }
    if (newVal == null) {
      return
    }
    if (appStore.curSltVideo?.src != null) {
      playVideo(appStore.curSltVideo.src)
    }
  }
)

watch(
  () => appStore.curViewModel,
  (newVal, oldVal) => {
    if (newVal === oldVal) {
      return
    }
    if (newVal === 'video') {
      if (appStore.curSltVideo == null) {
        return
      }
      if (appStore.thumbSeekTime != 0) {
        appStore.videoPlayCtrl.curTime = appStore.thumbSeekTime
      }

      if (appStore.curSltVideo?.src != null) {
        playVideo(appStore.curSltVideo.src)
      }
    } else if (newVal === 'thumbnail') {
      const removeEventListeners = setupVideoEventListeners()
      if (removeEventListeners != null) {
        removeEventListeners()
      }
      util.clear_cur_slt_video_info({ clearModel: 'changeToThumbnail' })
    } else {
      console.log('unsupported view model:', newVal)
    }
  }
)

watch(
  () => appStore.videoPlayCtrl.playbackRate,
  (newVal, oldVal) => {
    if (newVal === oldVal) {
      return
    }
    if (videoRef.value != null) {
      videoRef.value.playbackRate = parseFloat(appStore.videoPlayCtrl.playbackRate)
    }
  }
)

watch(
  () => appStore.barSeekTime,
  (newValue, oldValue) => {
    if (newValue === oldValue) {
      return
    }
    if (videoRef.value != null) {
      videoRef.value.currentTime = newValue + appStore.videoPlayCtrl.videoStartTime
    }
  }
)

onBeforeMount(() => {
  appStore.func_nextFrame = nextFrame
  appStore.func_previousFrame = previousFrame
})
onMounted(() => {
  setupVideoEventListeners()
})

onUnmounted(() => {
  const removeEventListeners = setupVideoEventListeners()
  if (removeEventListeners != null) {
    removeEventListeners()
  }
  util.clear_cur_slt_video_info()
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
