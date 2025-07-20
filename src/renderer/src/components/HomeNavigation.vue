<template>
    <div class="home-navigation">
        <div class="btn-container">
            <div class="menu-item dropdown" @click="toggleDropdown($event, 'home')">
                <!-- 文件 -->
                <span class="xc-text">文件</span>
                <div
                    ref="dropdownMenuRefHome"
                    class="dropdown-menu"
                    :class="{ show: isDropdownOpen['home'] }"
                >
                    <button class="xc-button menu-button" @click="btn_createPrj">创建项目</button>
                    <button class="xc-button menu-button" @click="btn_openPrj">打开项目</button>
                    <button class="xc-button menu-button" @click="exitApp">退出</button>
                </div>
            </div>
            <div class="menu-item dropdown" @click="toggleDropdown($event, 'view')">
                <span class="xc-text">视图</span>
                <div
                    ref="dropdownMenuRefView"
                    class="dropdown-menu"
                    :class="{ show: isDropdownOpen['view'] }"
                >
                    <button class="xc-button menu-button" @click="showFileList">文件列表</button>
                    <button class="xc-button menu-button" @click="showOperationPanel">
                        操作面板
                    </button>
                </div>
            </div>
            <div class="menu-item">
                <span class="xc-text" @click="btn_function()">功能</span>
            </div>
            <div class="menu-item" @click="showAboutModal">
                <span class="xc-text">关于</span>
            </div>
        </div>

        <div class="info-container">
            <span class="xc-text">{{ statusInfo }}</span>
        </div>
    </div>
    <!-- 关于模态框 -->
    <div v-if="isAboutModalVisible" class="modal-overlay" @click.self="hideAboutModal">
        <div class="modal-content">
            <h2>版本信息</h2>
            <p>当前版本：1.0.0</p>
            <button @click="hideAboutModal">取消</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAppStore } from '../stores/AppStore'
import '../assets/common.css'
import util from '../utils/util'
import { useRouter } from 'vue-router'
const router = useRouter()

const appStore = useAppStore()
import { IpcApi } from '../utils/IpcApi'
import MessageShow from './util/MessageShow'
import * as DataTypes from '../../../bridge/dataTypedef'

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
}

const btn_openPrj = async (): Promise<void> => {
    const req: DataTypes.Req = {
        cmd: 'open_prj'
    }
    const response: DataTypes.Resp = await IpcApi.trigger_event(req)
    if (response.code != 0) {
        console.log('打开项目失败')
    } else {
        if (response.bOver == false) {
            MessageShow.success('后台执行中...')
        } else {
            const req = await util.start_app()
            if (req.code != 0) {
                MessageShow.error(`启动失败 ${req.status}`)
                return
            }
            MessageShow.success('打开项目成功')
        }
    }
}

// 退出应用的处理函数
const exitApp = (): void => {
    isDropdownOpen.value.home = false
    window.close()
}

// 显示文件列表的处理函数
const showFileList = (): void => {
    isDropdownOpen.value.view = false
    appStore.rightPanel = DataTypes.WorkPanel.List
}

// 显示操作面板的处理函数
const showOperationPanel = (): void => {
    isDropdownOpen.value.view = false
    appStore.rightPanel = DataTypes.WorkPanel.Operate
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

const statusInfo = computed(() => {
    const curSltVideoName =
        appStore.curVideoInfo == null ? '' : DataTypes.File.makeDisplayName(appStore.curVideoInfo)
    return curSltVideoName
})

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
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
