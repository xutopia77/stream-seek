<template>
  <div class="work-panel-contianer">
    <div class="video-info-contianer">
      <!-- <span class="common-text"></span> -->
    </div>
    <span class="common-text"
      >{{
        `${util.getFilenameFromPath(appStore.curSltVideo ? appStore.curSltVideo.filePath : null)}`
      }} </span
    ><br />
    <button class="common-button" title="切换视图" @click="btnclk_change_view_model">
      {{ curViewBtn }}
    </button>
    <br />
    <button class="common-button" title="在光标处拆分片段" @click="splitVideo">➕</button>
    <button class="common-button" title="去掉此片段的拆分信息" @click="removeVideosplit">➖</button>
    <button class="common-button" title="去掉此片段" @click="removeVideoRecord">❌</button>
    <button class="common-button" title="恢复此片段" @click="restoreVideoRecord">🔃</button>
    <button class="common-button" title="导出剪辑" @click="exportVideoRecord">✂</button>
    <div
      v-for="splitInfo in videoSplitInfo"
      :key="splitInfo.percent"
      class="slpit-info-card"
      :class="{
        selected: splitInfo === selectedSplitInfo.value,
        deleted: splitInfo.isDelete
      }"
      @click="selectSplitInfo(splitInfo)"
    >
      <span class="common-text"
        >{{
          `${util.formatTime(splitInfo.startTime)} - ${util.formatTime(splitInfo.endTime)}`
        }} </span
      ><br />
      <span class="common-text" style="margin-right: 2px; color: #669999"
        >{{ `时长:${util.formatTime(splitInfo.duration)}` }}
      </span>
      <span class="common-text" style="color: #990033">{{ `${splitInfo.frameNum}帧` }} </span>
      <br />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../../stores/AppStore'
import '../../assets/common.css'
import util from '../../utils/util.js'
import { IpcApi } from '../../utils/IpcApi'
import MessageShow from '../util/MessageShow'
import * as DataTypes from '../../../../bridge/dataTypedef'
// 定义 SplitInfo 类型
interface SplitInfo {
  startTime: number
  endTime: number
  duration: number
  frameNum: number
  percent: number
  isDelete: boolean
}

const ipcAPi: IpcApi = new IpcApi()
const appStore = useAppStore()

// ------ 切换视图
const curViewBtn = computed(() => {
  return appStore.curViewModel === 'video' ? '🖼️' : '☰'
})

const btnclk_change_view_model = (): void => {
  if (appStore.curViewModel === 'video') {
    appStore.curViewModel = 'thumbnail'
  } else {
    appStore.curViewModel = 'video'
  }
  const showCtx = appStore.curViewModel === 'video' ? `视频播放模式` : `缩略图模式`
  MessageShow.success(showCtx)
}

// ------
const splitVideo = (): void => {
  const currentTime = appStore.videoPlayCtrl.curTime
  const videoDuration = appStore.curVideoInfo?.mediaInfo.duration
  const curpercent = (currentTime / videoDuration) * 100
  if (appStore.curVideoInfo?.splitInfo === null) {
    return
  }
  if (appStore.curVideoInfo?.splitInfo.some((item: SplitInfo) => item.percent === curpercent)) {
    return
  }
  if (currentTime >= videoDuration) {
    return
  }
  appStore.curVideoInfo.splitInfo.sort((a: SplitInfo, b: SplitInfo) => a.percent - b.percent)

  for (let i = 0; i < appStore.curVideoInfo.splitInfo.length; i++) {
    const splitInfo = appStore.curVideoInfo.splitInfo[i]
    if (splitInfo.startTime < currentTime && splitInfo.endTime > currentTime) {
      const oldEndTime = splitInfo.endTime
      splitInfo.endTime = currentTime
      let itemInfo = util.makeSplitInfo()
      itemInfo.startTime = currentTime
      itemInfo.endTime = oldEndTime
      appStore.curVideoInfo.splitInfo.push(itemInfo)
      break
    }
  }
  util.splitInfoCorrect(appStore.curVideoInfo.splitInfo, videoDuration)
}

const videoSplitInfo = computed(() => {
  if (appStore.curVideoInfo?.splitInfo === null) {
    return []
  }
  let splitInfo = appStore.curVideoInfo.splitInfo
  return splitInfo
})

const selectedSplitInfo = ref<SplitInfo>({
  startTime: 0,
  endTime: 0,
  duration: 0,
  frameNum: 0,
  percent: 0,
  isDelete: false
})

const selectSplitInfo = (splitInfo: SplitInfo): void => {
  selectedSplitInfo.value = splitInfo
  console.log(splitInfo)
}

const removeVideosplit = (): void => {
  if (selectedSplitInfo.value?.percent === 100) {
    MessageShow.success(`不能删除系统片段`)
    return
  }
  if (selectedSplitInfo.value) {
    const confirmDelete = confirm('确定要删除当前选中的片段信息记录吗？')
    if (confirmDelete) {
      const index = appStore.curVideoInfo.splitInfo.findIndex(
        (item: SplitInfo) => item.percent === selectedSplitInfo.value?.percent
      )
      if (index !== -1) {
        appStore.curVideoInfo.splitInfo.splice(index, 1)
        selectedSplitInfo.value = null
      }
    }
  }
}

const removeVideoRecord = (): void => {
  if (!selectedSplitInfo.value) {
    return
  }
  const confirmDelete = confirm('确定要删除当前选中的片段信息记录吗？')
  if (!confirmDelete) {
    return
  }
  const index = appStore.curVideoInfo.splitInfo.findIndex(
    (item: SplitInfo) => item.percent === selectedSplitInfo.value.percent
  )
  if (index === -1) {
    return
  }
  appStore.curVideoInfo.splitInfo[index]['isDelete'] = true
}

const restoreVideoRecord = (): void => {
  if (!selectedSplitInfo.value) {
    return
  }
  const index = appStore.curVideoInfo.splitInfo.findIndex(
    (item: SplitInfo) => item.percent === selectedSplitInfo.value.percent
  )
  if (index === -1) {
    return
  }
  appStore.curVideoInfo.splitInfo[index]['isDelete'] = false
}

const exportVideoRecord = async (): Promise<void> => {
  const prjInfo: DataTypes.Req_CutVideo | null = await util.make_prj_info()
  if (prjInfo === null) {
    MessageShow.error(`no project info`)
    return
  }
  const req: DataTypes.Req<DataTypes.Req_CutVideo> = {
    cmd: 'cut_video',
    data: prjInfo
  }
  const response = await ipcAPi.trigger_event(req)
  if (response.code === 1001) {
    return
  }
  if (response.code !== 0) {
    MessageShow.success(`剪辑失败: ${response.status}`)
  } else {
    MessageShow.success(response.bOver === false ? '后台运行' : `剪辑成功`)
  }
}
</script>

<style scoped>
.work-panel-contianer {
  height: 100%;
  width: 10%;
  min-width: 200px;
  max-width: 300px;
  padding: 0;
  margin: 0;
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  /* 设置超出范围了是不显示，而是出现滚动条 */
  overflow-x: hidden;
}

.video-info-contianer {
  width: 100%;
  margin: 0;
  padding: 0;
}

.slpit-info-card {
  width: calc(100% - 16px);
  margin: 4px;
  border-radius: 3px;
  background-color: #252526;
  border: 1px solid #333;
  transition: background-color 0.2s ease;
}

.slpit-info-card:hover {
  background-color: #3c3c3c;
}

.slpit-info-card.selected {
  border: 2px solid #007acc;
  background-color: #2d2d2d;
}

.slpit-info-card.deleted {
  background-color: #4d1919; /* 暗红色背景表示删除 */
  border: 1px solid #800000; /* 暗红色边框 */
  text-decoration: line-through; /* 文字添加删除线 */
  color: #a6a6a6; /* 文字颜色变浅 */
}
</style>
