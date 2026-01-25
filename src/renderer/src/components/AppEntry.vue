<template>
    <div class="app-entry">
        <div class="home-entry">
            <HomeNavigation />
            <!-- <VideoPreview /> -->
            <router-view class="page-view" />
        </div>
        <MessageToast />
        <RecentMessagesPanel />
    </div>
</template>

<script setup lang="ts">
// import VideoPreview from './VideoPreview.vue'
import HomeNavigation from './HomeNavigation.vue'
import { useAppStore } from '../stores/AppStore'
import RecentMessagesPanel from '@renderer/components/MessageNotify/RecentMessagesPanel.vue'
import MessageToast from '@renderer/components/MessageNotify/MessageToast.vue'
const appStore = useAppStore()
import { onBeforeMount, onMounted, watch } from 'vue'
import util from '../utils/util.js'
import { IpcApi } from '../utils/IpcApi'
import * as DataTypes from '../../../bridge/dataTypedef'
import router from '../router/router'
// 启动一个定时器，周期性trigger_event
function startTimer(): void {
    setInterval(() => {
        const req: DataTypes.Req = {
            cmd: 'heart_beat'
        }
        IpcApi.trigger_event<string, DataTypes.HeartBeat>(req)
            .then((response: DataTypes.Resp<DataTypes.HeartBeat>) => {
                util.process_heartbeat(response)
            })
            .catch((error: Error) => {
                console.log('process_heartbeat failed', error)
            })
    }, 500)
}

watch(
    () => appStore.documentTitle,
    (docTitle: string | null) => {
        if (docTitle === '' || docTitle === null) {
            document.title = 'VideoPlayer'
            return
        }
        document.title = 'VideoPlayer' + '  ' + docTitle
        // // 获取当前时间毫秒
        // const now = new Date()
        // const nowStr = now.toLocaleString()
        // // 获取当前时间的毫秒数
        // const nowMs = now.getTime()
        // console.log('document.title', nowStr, nowMs, document.title)
    }
)

onBeforeMount(async () => {
    util.setAppStore(appStore)
    const resp = await util.start_app()
    if (resp.code !== 0) {
        return
    }
    startTimer()
})

onMounted(() => {
    router.push('/')
})
</script>

<style scoped>
.app-entry {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
}

.home-entry {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
}

.page-view {
    height: calc(100% - 30px);
    width: 100%;
    margin: 0;
    padding: 0;
}
</style>
