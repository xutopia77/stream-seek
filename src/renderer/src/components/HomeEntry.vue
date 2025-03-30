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
import * as DataTypes from '../../../bridge/dataTypedef'

// 启动一个定时器，周期性trigger_event
function startTimer(): void {
  setInterval(() => {
    const req: DataTypes.Req = {
      cmd: 'heart_beat'
    }
    ipcAPi
      .trigger_event<string, DataTypes.HeartBeat>(req)
      .then((response: DataTypes.Resp<DataTypes.HeartBeat>) => {
        util.process_heartbeat(response)
      })
      .catch((error: Error) => {
        console.log('process_heartbeat failed', error)
      })
  }, 500)
}

async function updatePrj(prj: DataTypes.Prj): Promise<void> {
  appStore.prj = prj
  if (prj.lastOpenedFolder != null) {
    const req: DataTypes.Req<DataTypes.Req_TraversalFolder> = {
      cmd: 'set_last_opened_folder',
      data: { folder: prj.lastOpenedFolder }
    }
    const response: DataTypes.Resp<DataTypes.TraversalFolder> = await ipcAPi.trigger_event(req)
    if (response.code === 0) {
      appStore.curOpenedFolder = prj.lastOpenedFolder
      util.folder_file_proc(response)
    } else {
      MessageShow.error(`遍历文件夹失败`)
    }
  } else {
    console.log('lastOpenedFolder is null')
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
  const req: DataTypes.Req = {
    cmd: 'app_start'
  }
  const response: DataTypes.Resp<DataTypes.Prj> = await ipcAPi.trigger_event(req)
  if (response.code !== 0) {
    MessageShow.error(`启动失败`)
    return
  }
  startTimer()
  const respData = response.data
  if (respData == null) {
    return
  }
  updatePrj(respData)
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
