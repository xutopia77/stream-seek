<template>
    <div class="welcome-page">
        <div class="welcome-container">
            <div class="welcome-header">
                <h1 class="welcome-title">StreamSeek</h1>
                <p class="welcome-subtitle">{{ t('welcome.subtitle') }}</p>
            </div>

            <div class="welcome-content">
                <div class="start-section">
                    <h2 class="section-title">{{ t('welcome.start') }}</h2>
                    <div class="start-actions">
                        <button class="start-action" @click="openVideoFile">
                            <span class="action-icon">📹</span>
                            <span class="action-text">{{ t('welcome.openVideoFile') }}</span>
                            <span class="action-desc">{{ t('welcome.openVideoFileDesc') }}</span>
                        </button>
                        <button class="start-action" @click="openProject">
                            <span class="action-icon">📁</span>
                            <span class="action-text">{{ t('welcome.openProject') }}</span>
                            <span class="action-desc">{{ t('welcome.openProjectDesc') }}</span>
                        </button>
                        <button class="start-action" @click="showCreateModal = true">
                            <span class="action-icon">✨</span>
                            <span class="action-text">{{ t('welcome.createProject') }}</span>
                            <span class="action-desc">{{ t('welcome.createProjectDesc') }}</span>
                        </button>
                    </div>
                </div>

                <div class="recent-section">
                    <h2 class="section-title">{{ t('welcome.recent') }}</h2>
                    <div class="recent-list">
                        <div
                            v-for="item in recentItems"
                            :key="item.path"
                            class="recent-item"
                            @click="
                                item.type === 'file'
                                    ? openRecentFile(item.path)
                                    : openRecentProject(item.path)
                            "
                        >
                            <span class="item-icon">{{ item.type === 'file' ? '📹' : '📁' }}</span>
                            <div class="item-info">
                                <span class="item-name">{{ item.name }}</span>
                                <span class="item-path">{{ item.path }}</span>
                            </div>
                            <span class="item-time">{{ formatTime(item.lastOpened) }}</span>
                        </div>
                        <div v-if="recentItems.length === 0" class="empty-hint">
                            {{ t('welcome.noRecentItems') }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <CreateProjectModal
            :visible="showCreateModal"
            @close="showCreateModal = false"
            @created="onProjectCreated"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/AppStore'
import { useI18n } from 'vue-i18n'
import { IpcApi } from '../utils/ipcApi'
import * as Dty from '../../../bridge/dataTypedef'
import util from '../utils/util'
import CreateProjectModal from './CreateProjectModal.vue'

const router = useRouter()
const appStore = useAppStore()
const { t } = useI18n()

const showCreateModal = ref(false)

interface RecentItemWithType extends Dty.RecentItem {
    type: 'file' | 'project'
}

const recentItems = computed((): RecentItemWithType[] => {
    const files = (appStore.recentFiles || []).map((f) => ({ ...f, type: 'file' as const }))
    const projects = (appStore.recentProjects || []).map((p) => ({
        ...p,
        type: 'project' as const
    }))
    return [...files, ...projects]
        .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))
        .slice(0, 10)
})

const formatTime = (timestamp: number): string => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
        return t('welcome.today')
    } else if (days === 1) {
        return t('welcome.yesterday')
    } else if (days < 7) {
        return t('welcome.daysAgo', { days })
    } else {
        return date.toLocaleDateString()
    }
}

const openVideoFile = async (): Promise<void> => {
    const req: Dty.Req = {
        cmd: Dty.CmdType.openVideoDialog
    }
    const response: Dty.Resp<string> = await IpcApi.trigger_event(req)
    if (response.code === 0 && response.data) {
        await openRecentFile(response.data)
    }
}

const openProject = async (): Promise<void> => {
    const response: Dty.Resp<Dty.Prj> = await IpcApi.trigger_event({
        cmd: Dty.CmdType.prjOpen
    })
    if (response.code === 0 && response.data) {
        appStore.prj = response.data
        appStore.appInfo.prjFile = response.data.path || ''

        const searchReq = new Dty.FilesReq()
        searchReq.status = [appStore.fileSearchStatus]
        await util.files_get(searchReq)

        router.push('/')
    } else {
        util.addToastErr(`${t('welcome.openProjectFailed')}: ${response.status}`)
    }
}

const onProjectCreated = async (): Promise<void> => {
    await loadProjectData()
    router.push('/')
}

const openRecentFile = async (filePath: string): Promise<void> => {
    const req: Dty.Req<Dty.Req_SltFile> = {
        cmd: Dty.CmdType.openExternalVideo,
        data: { filepath: filePath }
    }
    const response: Dty.Resp<Dty.File> = await IpcApi.trigger_event(req)
    if (response.code === 0 && response.data) {
        appStore.curSltVideo = response.data
        appStore.curSltVideoName4Play = response.data.name
        appStore.appInfo.prjFile = ''
        appStore.prj = null
        router.push('/')
    } else {
        util.addToastErr(`${t('homeEditor.openVideoFailed')}: ${response.status}`)
    }
}

const openRecentProject = async (projectPath: string): Promise<void> => {
    const req: Dty.Req<Dty.Req_OpenPrj> = {
        cmd: Dty.CmdType.prjOpenByPath,
        data: { prjFile: projectPath }
    }
    const response: Dty.Resp<Dty.Prj | Dty.ClipProject> = await IpcApi.trigger_event(req)
    if (response.code === 0 && response.data) {
        if (response.data.type === Dty.ProjectType.FileManagement) {
            const prj = response.data as Dty.Prj
            appStore.prj = prj
            appStore.appInfo.prjFile = projectPath
            appStore.clipProject = null

            const searchReq = new Dty.FilesReq()
            searchReq.status = [appStore.fileSearchStatus]
            await util.files_get(searchReq)
        } else if (response.data.type === Dty.ProjectType.ClipEdit) {
            const clipProject = response.data as Dty.ClipProject
            appStore.clipProject = clipProject
            appStore.prj = null
            appStore.appInfo.prjFile = ''

            const openReq: Dty.Req<Dty.Req_SltFile> = {
                cmd: Dty.CmdType.openExternalVideo,
                data: { filepath: clipProject.filePath }
            }
            const openResp: Dty.Resp<Dty.File> = await IpcApi.trigger_event(openReq)
            if (openResp.code === 0 && openResp.data) {
                appStore.curSltVideo = openResp.data
                appStore.curSltVideoName4Play = openResp.data.name

                if (clipProject.splitInfo && clipProject.splitInfo.length > 0) {
                    if (!appStore.curSltVideo.splitInfo) {
                        appStore.curSltVideo.splitInfo = new Dty.SqlitInfos()
                    }
                    appStore.curSltVideo.splitInfo.splits = clipProject.splitInfo
                }
            }
        }

        router.push('/')
    } else {
        util.addToastErr(`${t('welcome.openProjectFailed')}: ${response.status}`)
    }
}

const loadProjectData = async (): Promise<void> => {
    const searchReq = new Dty.FilesReq()
    searchReq.status = [appStore.fileSearchStatus]
    searchReq.page = 1
    searchReq.pageSize = 100

    const searchResp = await IpcApi.trigger_event<Dty.FilesReq, Dty.FilesResp>({
        cmd: Dty.CmdType.search_file,
        data: searchReq
    })

    if (searchResp.code === 0 && searchResp.data) {
        appStore.videoList = searchResp.data.files
        appStore.videoTotalNum = searchResp.data.total
    }
}
</script>

<style scoped>
.welcome-page {
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #1e1e1e;
    color: #cccccc;
    overflow: hidden;
}

.welcome-container {
    max-width: 900px;
    width: 100%;
    padding: 20px 40px;
}

.welcome-header {
    text-align: center;
    margin-bottom: 24px;
}

.welcome-title {
    font-size: 36px;
    font-weight: 300;
    color: #ffffff;
    margin-bottom: 4px;
}

.welcome-subtitle {
    font-size: 14px;
    color: #858585;
}

.welcome-content {
    display: flex;
    gap: 30px;
}

.start-section {
    flex: 1;
}

.recent-section {
    flex: 1.5;
}

.section-title {
    font-size: 12px;
    font-weight: 600;
    color: #bbbbbb;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #3c3c3c;
}

.start-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.start-action {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 12px;
    background-color: #252526;
    border: 1px solid #3c3c3c;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
}

.start-action:hover {
    background-color: #2a2d2e;
    border-color: #007acc;
}

.action-icon {
    font-size: 20px;
    margin-bottom: 4px;
}

.action-text {
    font-size: 13px;
    font-weight: 500;
    color: #ffffff;
    margin-bottom: 2px;
}

.action-desc {
    font-size: 11px;
    color: #858585;
}

.recent-list {
    max-height: 240px;
    overflow-y: auto;
}

.recent-list::-webkit-scrollbar {
    width: 6px;
}

.recent-list::-webkit-scrollbar-track {
    background: #1e1e1e;
}

.recent-list::-webkit-scrollbar-thumb {
    background: #3c3c3c;
    border-radius: 3px;
}

.recent-list::-webkit-scrollbar-thumb:hover {
    background: #4a4a4a;
}

.recent-item {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border-radius: 3px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.recent-item:hover {
    background-color: #2a2d2e;
}

.item-icon {
    font-size: 16px;
    margin-right: 10px;
}

.item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.item-name {
    font-size: 12px;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-path {
    font-size: 10px;
    color: #858585;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-time {
    font-size: 10px;
    color: #858585;
    margin-left: 10px;
    white-space: nowrap;
}

.empty-hint {
    padding: 16px;
    text-align: center;
    color: #858585;
    font-size: 12px;
}
</style>
