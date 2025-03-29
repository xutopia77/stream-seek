<template>
  <div class="home-entry">
    <HomeNavigation />
    <!-- <VideoPreview /> -->
    <router-view class="page-view" />
    <ToastMessage />
  </div>
</template>

<script setup lang="ts">
// import VideoPreview from './VideoPreview.vue'
import HomeNavigation from './HomeNavigation.vue'
import { useAppStore } from '../stores/AppStore'
const appStore = useAppStore()
import { onBeforeMount, watch } from 'vue'
import util from '../utils/util.js'
import ToastMessage from './util/ToastMessage.vue'
import { IpcApi } from '../utils/IpcApi'
import MessageShow from './util/MessageShow'
const ipcAPi: IpcApi = new IpcApi()

// 定义响应数据的类型
interface IpcResponse {
  code: number
  data?: any
  status?: string
}

// 启动一个定时器，周期性ipcAPi.trigger_event
function startTimer(): void {
  setInterval(() => {
    ipcAPi
      .trigger_event(JSON.stringify({ cmd: 'heart_beat', data: '' }))
      .then((response: IpcResponse) => {
        util.process_heartbeat(response)
      })
      .catch((error: Error) => {
        console.log('process_heartbeat failed', error)
      })
  }, 500)
}

// 定义项目数据的类型
interface Project {
  lastOpenedFolder?: string
}

async function updatePrj(prj: Project): Promise<void> {
  appStore.prj = prj
  if (prj.lastOpenedFolder != null) {
    const response: IpcResponse = await ipcAPi.trigger_event(
      JSON.stringify({ cmd: 'traversal_folder', data: { folder: prj.lastOpenedFolder } })
    )
    if (response.code === 0) {
      appStore.curOpenedFolder = prj.lastOpenedFolder
      util.folder_file_proc(response.data)
    }
    startTimer()
  }
}

watch(
  () => appStore.documentTitle,
  (docTitle: string | null) => {
    if (docTitle === '' || docTitle === null) {
      document.title = 'VideoPlayer'
      return
    }
    document.title = 'VideoPlayer' + '  ' + docTitle
  }
)

onBeforeMount(async () => {
  util.setAppStore(appStore)
  const response: IpcResponse = await ipcAPi.trigger_event(
    JSON.stringify({ cmd: 'app_start', data: '' })
  )
  if (response.code !== 0) {
    MessageShow.error(`启动失败`)
    return
  }
  updatePrj(response.data.prj)
})
</script>

<style scoped>
.home-entry {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
}
.page-view {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
}
</style>
