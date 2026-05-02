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
                    <button class="xc-button menu-button" @click.stop="btn_openPrj">
                        {{ t('navigation.menuItems.openProject') }}
                    </button>
                    <button class="xc-button menu-button" @click.stop="btn_openVideoDialog">
                        {{ t('navigation.menuItems.openVideoFile') }}
                    </button>
                    <button class="xc-button menu-button" @click.stop="exitApp">
                        {{ t('navigation.menuItems.exit') }}
                    </button>
                </div>
            </div>
            <div v-if="appStore.isProjectMode" class="menu-item dropdown" @click="toggleDropdown($event, 'view')">
                <span class="xc-text">{{ t('navigation.menuItems.view') }}</span>
                <div
                    ref="dropdownMenuRefView"
                    class="dropdown-menu"
                    :class="{ show: isDropdownOpen['view'] }"
                >
                    <button class="xc-button menu-button" @click.stop="btn_viewChange('list_show')">
                        {{ t('navigation.menuItems.fileList') }}
                    </button>
                    <button
                        class="xc-button menu-button"
                        @click.stop="btn_viewChange('operate_show')"
                    >
                        {{ t('navigation.menuItems.operationPanel') }}
                    </button>
                    <button
                        class="xc-button menu-button"
                        @click.stop="btn_viewChange('thumb_show')"
                    >
                        {{ t('navigation.menuItems.thumbnailView') }}🖼️
                    </button>
                    <button
                        class="xc-button menu-button"
                        @click.stop="btn_viewChange('video_show')"
                    >
                        {{ t('navigation.menuItems.videoView') }}🎞️
                    </button>
                    <button class="xc-button menu-button" @click.stop="btn_viewChange('bck_home')">
                        {{ t('navigation.menuItems.returnHome') }}
                    </button>
                </div>
            </div>
            <div v-if="appStore.isProjectMode" class="menu-item">
                <span class="xc-text" @click="btn_function()">{{
                    t('navigation.menuItems.function')
                }}</span>
            </div>
            <div class="menu-item" @click="showAboutModal">
                <span class="xc-text">{{ t('navigation.menuItems.about') }}</span>
            </div>
        </div>

        <div class="info-container">
            <span class="xc-text" :title="statusInfoTitle">{{ statusInfo }}</span>
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
    <!-- 关于模态框 -->
    <div v-if="isAboutModalVisible" class="modal-overlay" @click.self="hideAboutModal">
        <div class="modal-content">
            <h2>{{ t('navigation.menuItems.about') }} {{ t('common.info') }}</h2>
            <p>{{ t('common.currentVersion') }}：{{ appStore.prj.version || '1.0.0' }}</p>
            <button @click="hideAboutModal">{{ t('common.cancel') }}</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useAppStore } from '../stores/AppStore'
import '../assets/common.css'
import util from '../utils/util'
import { useRouter } from 'vue-router'
const router = useRouter()

const appStore = useAppStore()
import { IpcApi } from '../utils/ipcApi'
import * as Dty from '../../../bridge/dataTypedef'

import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// const changeLang = () => {
//   locale.value = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
// }

// 控制下拉菜单是否显示
const isDropdownOpen = ref<{ home: boolean; video: boolean; view: boolean }>({
    home: false,
    video: false,
    view: false
})

// 用于存储下拉菜单的 DOM 引用
const dropdownMenuRefHome = ref<HTMLElement | null>(null)
const dropdownMenuRefVideo = ref<HTMLElement | null>(null)
const dropdownMenuRefView = ref<HTMLElement | null>(null)

// 控制关于模态框是否显示
const isAboutModalVisible = ref<boolean>(false)

// 状态信息相关
let statusInfoTitle = ref<string>('')
let statusInfo = ref<string>('')

function navContentMake(): void {
    if (appStore.prj == null) {
        statusInfoTitle.value = t('navigation.repositoryFiles')
        statusInfo.value = appStore.homeNavContent
        return
    }
    statusInfoTitle.value = appStore.prj.repoType == Dty.RepoType.Normal ? t('navigation.repositoryFiles') : t('navigation.recycleBinFiles')
    const repoStr = appStore.prj.repoType == Dty.RepoType.Normal ? '🗄️' : '🗑️'
    statusInfo.value = `${repoStr} ${appStore.homeNavContent}`
}

watch(
    () => [appStore.homeNavContent, appStore.prj?.repoType],
    () => {
        navContentMake()
    }
)

// 切换下拉菜单的显示状态
const toggleDropdown = (event: MouseEvent, menu: string): void => {
    event.stopPropagation() // 阻止事件冒泡
    // 先将所有下拉菜单隐藏
    Object.keys(isDropdownOpen.value).forEach((key) => {
        isDropdownOpen.value[key] = false
    })
    // 再切换当前点击的下拉菜单显示状态
    isDropdownOpen.value[menu] = !isDropdownOpen.value[menu]
}

const btn_createPrj = async (): Promise<void> => {
    router.push('/create_prj')
    isDropdownOpen.value.home = false
}

const btn_openPrj = async (): Promise<void> => {
    const req: Dty.Req = {
        cmd: Dty.CmdType.prjOpen
    }
    const response: Dty.Resp = await IpcApi.trigger_event(req)
    if (response.code != 0) {
        console.log(t('navigation.openProjectFailed'))
    } else {
        if (response.bOver == false) {
            util.addToastInfo(t('navigation.backgroundExecuting'))
        } else {
            const req = await util.start_app()
            if (req.code != 0) {
                util.addToastErr(`${t('navigation.startupFailed')} ${req.status}`)
                return
            }
            util.addToastInfo(t('navigation.openProjectSuccess'))
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
        
        // If in project mode, close the project first
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

// 退出应用的处理函数
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
        case 'operate_show':
            appStore.rightPanel = Dty.WorkPanel.Operate
            break
        case 'list_show':
            appStore.rightPanel = Dty.WorkPanel.List
            break
        case 'bck_home':
            router.push('/')
            break
        default:
            break
    }
    isDropdownOpen.value.view = false
}

// 显示关于模态框
const showAboutModal = (): void => {
    isAboutModalVisible.value = true
}

// 隐藏关于模态框
const hideAboutModal = (): void => {
    isAboutModalVisible.value = false
}

// 点击页面其他地方隐藏下拉菜单
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
}

function btn_function(): void {
    router.push('/admin')
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
    navContentMake()
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* 整体导航栏样式 */
.home-navigation {
    height: var(--xc-home-nac-height);
    width: 100%;
    display: flex;
    background-color: #252526;
    color: #ccc;
    align-items: center;
}

.btn-container {
    display: flex;
    /*  防止按钮缩小 */
    flex-shrink: 0;
}

/* 菜单项样式 */
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

/* 下拉菜单容器样式 */
.dropdown {
    position: relative;
}

/* 下拉菜单样式 */
.dropdown-menu {
    display: none;
    position: absolute;
    top: 30px;
    left: 0;
    background-color: #333;
    min-width: 160px;
    box-shadow: 0 8px 16px 0 rgba(0, 0, 0, 0.2);
    z-index: 1;
    /* 添加圆角和边框 */
    border-radius: 4px;
    border: 1px solid #444;
}

/* 下拉菜单显示时的样式 */
.dropdown-menu.show {
    display: block;
}

.menu-button {
    color: #ccc;
    padding: 12px 16px;
    text-decoration: none;
    display: block;
    background: none;
    border: none;
    text-align: left;
    width: 95%;
}

.dropdown-menu button:hover {
    background-color: #37373d;
}

/* 模态框遮罩层样式 */
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
    z-index: 2;
}

/* 模态框内容样式 */
.modal-content {
    background-color: #333;
    padding: 20px;
    border-radius: 4px;
    border: 1px solid #444;
    color: #ccc;
    width: 300px;
    text-align: center;
}

.modal-content button {
    margin-top: 20px;
    padding: 8px 16px;
    background-color: #37373d;
    color: #ccc;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.modal-content button:hover {
    background-color: #444;
}

.info-container {
    margin-left: auto;
}
</style>