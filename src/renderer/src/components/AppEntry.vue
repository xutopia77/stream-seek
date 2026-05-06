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
import { useI18n } from 'vue-i18n'
const appStore = useAppStore()
const { t, locale } = useI18n()
import { onBeforeMount, watch } from 'vue'
import util, { setI18nFunction } from '../utils/util.js'
import { IpcApi } from '../utils/ipcApi'
import * as Dty from '../../../bridge/dataTypedef'
import router from '../router/router'

// Set i18n function in util.ts
setI18nFunction(t)
// Start timer to periodically trigger events
function startTimer(): void {
    setInterval(() => {
        const req: Dty.Req = {
            cmd: Dty.CmdType.heartBeat
        }
        IpcApi.trigger_event<string, Dty.HeartBeat>(req)
            .then((response: Dty.Resp<Dty.HeartBeat>) => {
                util.process_heartbeat(response)
            })
            .catch((error: Error) => {
                console.log('process_heartbeat failed', error)
            })
    }, 2000)
}

watch(
    () => appStore.documentTitle,
    (docTitle: string | null) => {
        if (docTitle === '' || docTitle === null) {
            document.title = 'StreamSeek'
            return
        }
        document.title = 'StreamSeek' + '  ' + docTitle
        // // Get current time in milliseconds
        // const now = new Date()
        // const nowStr = now.toLocaleString()
        // // Get current time in milliseconds
        // const nowMs = now.getTime()
        // console.log('document.title', nowStr, nowMs, document.title)
    }
)

watch(
    () => appStore.curSltVideo,
    async (newVal: Dty.File | null) => {
        if (newVal == null) {
            return
        }
        let curSltVideoName =
            appStore.curSltVideo == null ? '' : Dty.File.makeDisplayName(appStore.curSltVideo)
        appStore.homeNavContent = curSltVideoName
        appStore.curSltVideoName4Play =
            appStore.curSltVideo == null ? '' : appStore.curSltVideo.name
    }
)

onBeforeMount(async () => {
    util.setAppStore(appStore)
    await util.start_app()
    
    if (appStore.appInfo && appStore.appInfo.language) {
        console.log('[AppEntry] Setting language from appInfo:', appStore.appInfo.language)
        locale.value = appStore.appInfo.language
        localStorage.setItem('locale', appStore.appInfo.language)
    }
    
    startTimer()
    router.push('/welcome')
})

window.electronAPI.onSystemNotify((data) => {
    util.processMsgNotify(data)
})

window.electronAPI.onTaskNotify((data) => {
    util.processTaskNotify(data as string)
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
