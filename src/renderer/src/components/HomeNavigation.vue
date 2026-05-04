<template>
    <div class="home-navigation">
        <div class="btn-container">
            <div class="menu-item dropdown" @click="toggleDropdown($event, 'home')">
                <span class="xc-text">{{ t('navigation.file') }}</span>
                <div
                    ref="dropdownMenuRefHome"
                    class="dropdown-menu"
                    :class="{ show: isDropdownOpen['home'] }"
                >
                    <button class="xc-button menu-button" @click.stop="btn_createPrj">
                        {{ t('navigation.menuItems.createProject') }}
                    </button>
                    <button class="xc-button menu-button" @click.stop="btn_openProject">
                        {{ t('navigation.menuItems.openProject') }}
                    </button>
                    <button
                        v-if="appStore.isProjectMode || appStore.curSltVideo"
                        class="xc-button menu-button"
                        @click.stop="btn_closeProject"
                    >
                        {{ t('navigation.menuItems.closeProject') }}
                    </button>
                    <button
                        v-if="appStore.isProjectMode || appStore.curSltVideo"
                        class="xc-button menu-button"
                        @click.stop="btn_saveProject"
                    >
                        {{ t('navigation.menuItems.saveProject') }}
                    </button>
                    <div class="menu-divider"></div>
                    <button class="xc-button menu-button" @click.stop="btn_openVideoDialog">
                        {{ t('navigation.menuItems.openVideoFile') }}
                    </button>
                    <div class="menu-divider"></div>
                    <button class="xc-button menu-button" @click.stop="exitApp">
                        {{ t('navigation.menuItems.exit') }}
                    </button>
                </div>
            </div>
            <div
                v-if="appStore.isProjectMode"
                class="menu-item dropdown"
                @click="toggleDropdown($event, 'view')"
            >
                <span class="xc-text">{{ t('navigation.menuItems.view') }}</span>
                <div
                    ref="dropdownMenuRefView"
                    class="dropdown-menu"
                    :class="{ show: isDropdownOpen['view'] }"
                >
                    <button
                        class="xc-button menu-button"
                        @click.stop="btn_viewChange('thumb_show')"
                    >
                        🖼️ {{ t('navigation.menuItems.thumbnailView') }}
                    </button>
                    <button
                        class="xc-button menu-button"
                        @click.stop="btn_viewChange('video_show')"
                    >
                        🎞️ {{ t('navigation.menuItems.videoView') }}
                    </button>
                    <div class="menu-divider"></div>
                    <button class="xc-button menu-button" @click.stop="btn_viewChange('bck_home')">
                        🏠 {{ t('navigation.menuItems.returnHome') }}
                    </button>
                </div>
            </div>
            <div class="menu-item dropdown" @click="toggleDropdown($event, 'tools')">
                <span class="xc-text">{{ t('navigation.tools') }}</span>
                <div
                    ref="dropdownMenuRefTools"
                    class="dropdown-menu"
                    :class="{ show: isDropdownOpen['tools'] }"
                >
                    <button class="xc-button menu-button" @click.stop="btn_mediaInfo">
                        📊 {{ t('navigation.menuItems.mediaInfo') }}
                    </button>
                    <button
                        v-if="appStore.isProjectMode"
                        class="xc-button menu-button"
                        @click.stop="btn_projectSettings"
                    >
                        ⚙️ {{ t('navigation.menuItems.projectSettings') }}
                    </button>
                    <div class="menu-divider"></div>
                    <button class="xc-button menu-button" @click.stop="btn_settings">
                        ⚙️ {{ t('navigation.menuItems.settings') }}
                    </button>
                </div>
            </div>
            <div class="menu-item" @click="showAboutModal">
                <span class="xc-text">{{ t('navigation.menuItems.about') }}</span>
            </div>
        </div>

        <div>
            <button
                class="xc-button"
                style="border: none"
                :title="t('navigation.viewRecentMessages')"
                @click="appStore.bPageResentMsg = true"
            >
                🔔
            </button>
        </div>
    </div>
    <CreateProjectModal
        :visible="showCreateModal"
        @close="showCreateModal = false"
        @created="onProjectCreated"
    />
    <div v-if="isAboutModalVisible" class="modal-overlay" @click.self="hideAboutModal">
        <div class="modal-content">
            <h2>{{ t('navigation.menuItems.about') }} {{ t('common.info') }}</h2>
            <p>{{ t('common.currentVersion') }}：{{ appStore.prj?.version || '1.0.0' }}</p>
            <button class="xc-button" @click="hideAboutModal">{{ t('common.cancel') }}</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useAppStore } from '../stores/AppStore'
import '../assets/common.css'
import util from '../utils/util'
import { useRouter } from 'vue-router'
const router = useRouter()

const appStore = useAppStore()
import { IpcApi } from '../utils/ipcApi'
import * as Dty from '../../../bridge/dataTypedef'

import { useI18n } from 'vue-i18n'
import CreateProjectModal from './CreateProjectModal.vue'

const { t } = useI18n()

const showCreateModal = ref(false)

const isDropdownOpen = ref<{ home: boolean; video: boolean; view: boolean; tools: boolean }>({
    home: false,
    video: false,
    view: false,
    tools: false
})

const dropdownMenuRefHome = ref<HTMLElement | null>(null)
const dropdownMenuRefVideo = ref<HTMLElement | null>(null)
const dropdownMenuRefView = ref<HTMLElement | null>(null)
const dropdownMenuRefTools = ref<HTMLElement | null>(null)

const isAboutModalVisible = ref<boolean>(false)

const toggleDropdown = (event: MouseEvent, menu: string): void => {
    event.stopPropagation()
    Object.keys(isDropdownOpen.value).forEach((key) => {
        isDropdownOpen.value[key] = false
    })
    isDropdownOpen.value[menu] = !isDropdownOpen.value[menu]
}

const btn_createPrj = (): void => {
    showCreateModal.value = true
    isDropdownOpen.value.home = false
}

const onProjectCreated = async (): Promise<void> => {
    const req = await util.start_app()
    if (req.code != 0) {
        util.addToastErr(`${t('navigation.startupFailed')} ${req.status}`)
        return
    }
    util.addToastInfo(t('navigation.openProjectSuccess'))
    router.push('/')
}

const btn_openProject = async (): Promise<void> => {
    isDropdownOpen.value.home = false
    const req: Dty.Req = {
        cmd: Dty.CmdType.prjOpen
    }
    const response: Dty.Resp<Dty.Prj | Dty.ClipProject> = await IpcApi.trigger_event(req)
    if (response.code != 0) {
        if (response.status !== 'user canceled') {
            util.addToastErr(`${t('navigation.openProjectFailed')}: ${response.status}`)
        }
        return
    }

    if (!response.data) return

    if (response.data.type === Dty.ProjectType.FileManagement) {
        const prj = response.data as Dty.Prj
        appStore.prj = prj
        appStore.appInfo.prjFile = prj.path || ''
        appStore.clipProject = null

        const startReq = await util.start_app()
        if (startReq.code != 0) {
            util.addToastErr(`${t('navigation.startupFailed')} ${startReq.status}`)
            return
        }

        const searchReq = new Dty.FilesReq()
        searchReq.status = [appStore.fileSearchStatus]
        await util.files_get(searchReq)

        util.addToastInfo(t('navigation.openProjectSuccess'))
    } else if (response.data.type === Dty.ProjectType.ClipEdit) {
        const clipProject = response.data as Dty.ClipProject
        await openClipProjectData(clipProject)
    }

    router.push('/')
}

const openClipProjectData = async (clipProject: Dty.ClipProject): Promise<void> => {
    if (appStore.isProjectMode) {
        const closeReq: Dty.Req = {
            cmd: Dty.CmdType.prjClose
        }
        await IpcApi.trigger_event(closeReq)
        appStore.prj = null
        appStore.appInfo.prjFile = ''
    }

    const openReq: Dty.Req<Dty.Req_SltFile> = {
        cmd: Dty.CmdType.openExternalVideo,
        data: { filepath: clipProject.filePath }
    }
    const openResp: Dty.Resp<Dty.File> = await IpcApi.trigger_event(openReq)
    if (openResp.code === 0 && openResp.data) {
        appStore.curSltVideo = openResp.data
        appStore.curSltVideoName4Play = openResp.data.name
        appStore.clipProject = clipProject

        if (clipProject.splitInfo && clipProject.splitInfo.length > 0) {
            if (!appStore.curSltVideo.splitInfo) {
                appStore.curSltVideo.splitInfo = new Dty.SqlitInfos()
            }
            appStore.curSltVideo.splitInfo.splits = clipProject.splitInfo
            util.update_bar_clips()
        }

        util.addToastInfo(`${t('navigation.menuItems.openProject')} ${t('common.success')}`)
    } else {
        util.addToastErr(`${t('homeEditor.openVideoFailed')}: ${openResp.status}`)
    }
}

const btn_closeProject = async (): Promise<void> => {
    isDropdownOpen.value.home = false

    if (appStore.isProjectMode) {
        const closeReq: Dty.Req = {
            cmd: Dty.CmdType.prjClose
        }
        await IpcApi.trigger_event(closeReq)
        appStore.prj = null
        appStore.appInfo.prjFile = ''
    }

    if (appStore.curSltVideo) {
        appStore.clipProject = null
        appStore.curSltVideo = null
        appStore.curSltVideoName4Play = ''
        util.clear_cur_slt_video_info(null)
    }

    router.push('/welcome')
    util.addToastInfo(t('navigation.menuItems.closeProject'))
}

const btn_saveProject = async (): Promise<void> => {
    isDropdownOpen.value.home = false

    if (appStore.isProjectMode) {
        const response = await util.saveFileManagementProject()
        if (response.code === 0) {
            util.addToastInfo(`${t('navigation.menuItems.saveProject')} ${t('common.success')}`)
        } else if (response.status !== 'user canceled') {
            util.addToastErr(
                `${t('navigation.menuItems.saveProject')} ${t('common.failed')}: ${response.status}`
            )
        }
    } else if (appStore.curSltVideo) {
        const response = await util.saveClipProject()
        if (response.code === 0) {
            util.addToastInfo(`${t('navigation.menuItems.saveProject')} ${t('common.success')}`)
        } else if (response.status !== 'user canceled') {
            util.addToastErr(
                `${t('navigation.menuItems.saveProject')} ${t('common.failed')}: ${response.status}`
            )
        }
    }
}

const btn_openVideoDialog = async (): Promise<void> => {
    isDropdownOpen.value.home = false
    const req: Dty.Req = {
        cmd: Dty.CmdType.openVideoDialog
    }
    const response: Dty.Resp<string> = await IpcApi.trigger_event(req)
    if (response.code === 0 && response.data) {
        router.push('/')

        if (appStore.isProjectMode) {
            const closeReq: Dty.Req = {
                cmd: Dty.CmdType.prjClose
            }
            await IpcApi.trigger_event(closeReq)
            appStore.prj = null
            appStore.appInfo.prjFile = ''
        }

        appStore.clipProject = null

        const openReq: Dty.Req<Dty.Req_SltFile> = {
            cmd: Dty.CmdType.openExternalVideo,
            data: { filepath: response.data }
        }
        const openResp: Dty.Resp<Dty.File> = await IpcApi.trigger_event(openReq)
        if (openResp.code === 0 && openResp.data) {
            appStore.curSltVideo = openResp.data
            appStore.curSltVideoName4Play = openResp.data.name
            util.addToastInfo(t('homeEditor.openVideoSuccess'))
        } else {
            util.addToastErr(`${t('homeEditor.openVideoFailed')}: ${openResp.status}`)
        }
    }
}

const exitApp = (): void => {
    isDropdownOpen.value.home = false
    window.close()
}

const btn_viewChange = (mode: string): void => {
    switch (mode) {
        case 'thumb_show':
            util.viewModelChange('thumbnail')
            break
        case 'video_show':
            util.viewModelChange('video')
            break
        case 'bck_home':
            router.push('/')
            break
        default:
            break
    }
    isDropdownOpen.value.view = false
}

const showAboutModal = (): void => {
    isAboutModalVisible.value = true
}

const hideAboutModal = (): void => {
    isAboutModalVisible.value = false
}

const handleClickOutside = (event: MouseEvent): void => {
    if (dropdownMenuRefHome.value && !dropdownMenuRefHome.value.contains(event.target as Node)) {
        isDropdownOpen.value.home = false
    }
    if (dropdownMenuRefVideo.value && !dropdownMenuRefVideo.value.contains(event.target as Node)) {
        isDropdownOpen.value.video = false
    }
    if (dropdownMenuRefView.value && !dropdownMenuRefView.value.contains(event.target as Node)) {
        isDropdownOpen.value.view = false
    }
    if (dropdownMenuRefTools.value && !dropdownMenuRefTools.value.contains(event.target as Node)) {
        isDropdownOpen.value.tools = false
    }
}

const btn_mediaInfo = (): void => {
    isDropdownOpen.value.tools = false
    router.push('/media_info')
}

const btn_projectSettings = (): void => {
    isDropdownOpen.value.tools = false
    router.push('/project_settings')
}

const btn_settings = (): void => {
    isDropdownOpen.value.tools = false
    router.push('/app_setting')
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.home-navigation {
    height: var(--xc-home-nac-height);
    width: 100%;
    display: flex;
    background-color: #252526;
    color: #ccc;
    align-items: center;
    justify-content: space-between;
}

.btn-container {
    display: flex;
    flex-shrink: 0;
}

.menu-item {
    padding: 0 10px;
    cursor: pointer;
    height: 100%;
    display: flex;
    align-items: center;
}

.menu-item:hover {
    background-color: #37373d;
}

.dropdown {
    position: relative;
}

.dropdown-menu {
    display: none;
    position: absolute;
    top: 30px;
    left: 0;
    background-color: #333;
    min-width: 180px;
    box-shadow: 0 8px 16px 0 rgba(0, 0, 0, 0.2);
    z-index: 100;
    border-radius: 4px;
    border: 1px solid #444;
}

.dropdown-menu.show {
    display: block;
}

.menu-button {
    color: #ccc;
    padding: 10px 16px;
    text-decoration: none;
    display: block;
    background: none;
    border: none;
    text-align: left;
    width: 100%;
    cursor: pointer;
}

.menu-button:hover {
    background-color: #37373d;
}

.menu-divider {
    height: 1px;
    background-color: #444;
    margin: 4px 8px;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background-color: #333;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #444;
    color: #ccc;
    min-width: 300px;
    text-align: center;
}

.modal-content h2 {
    margin: 0 0 16px 0;
    font-size: 16px;
}

.modal-content p {
    margin: 0 0 20px 0;
    color: #858585;
}
</style>
