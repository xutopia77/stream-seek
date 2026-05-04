<template>
    <div class="page-container xc-scrollbar">
        <ul>
            <!-- 修改部分：添加动态类名和 checkbox -->
            <li
                v-for="(video, index) in videoList"
                :key="index"
                :class="{ selected: video === appStore.curSltVideo }"
            >
                <label class="vscode-checkbox">
                    <input
                        type="checkbox"
                        :checked="appStore.curCheckedVideo.has(video)"
                        @change="
                            toggleVideoSelection(
                                video,
                                ($event.target as HTMLInputElement).checked,
                                index
                            )
                        "
                    />
                    <span class="checkmark"></span>
                </label>
                <span
                    class="xc-text"
                    :style="getVideoLevelColorStyle(video)"
                    @click="btn_playVideo(video)"
                    >{{ `${index + 1}:${Dty.File.makeDisplayName(video)}` }}</span
                >
            </li>
        </ul>
        <PaginationCtrl page-type="video" :compact="true" />
    </div>
</template>

<script setup lang="ts">
import PaginationCtrl from '@renderer/components/common/paginationCtrl.vue'
import { computed, onBeforeMount, ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@renderer/stores/AppStore'
import { useI18n } from 'vue-i18n'
const appStore = useAppStore()
import '@renderer/assets/common.css'
import * as Dty from '../../../../../bridge/dataTypedef'
// import util from '@renderer/utils/util'

const { t } = useI18n()
const videoList = computed<Dty.File[]>(() => appStore.videoList)

// 记录上一次选中的索引
const lastSelectedIndex = ref(-1)
// 记录 Shift 键是否按下
const isShiftPressed = ref(false)

// 监听键盘事件
const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.shiftKey) {
        isShiftPressed.value = true
    }
}

const handleKeyUp = (): void => {
    isShiftPressed.value = false
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
})

// 切换视频的选中状态
const toggleVideoSelection = (video: Dty.File, isChecked: boolean, currentIndex: number): void => {
    console.log(
        t('videoList.selectionChanged', {
            name: video.name,
            status: isChecked ? 'selected' : 'deselected'
        })
    )
    if (isShiftPressed.value && lastSelectedIndex.value !== -1) {
        const start = Math.min(lastSelectedIndex.value, currentIndex)
        const end = Math.max(lastSelectedIndex.value, currentIndex)
        for (let i = start; i <= end; i++) {
            const item = videoList.value[i]
            if (isChecked) {
                appStore.curCheckedVideo.add(item)
            } else {
                appStore.curCheckedVideo.delete(item)
            }
        }
    } else {
        if (isChecked) {
            appStore.curCheckedVideo.add(video)
        } else {
            appStore.curCheckedVideo.delete(video)
        }
    }
    lastSelectedIndex.value = currentIndex
}

onBeforeMount(() => {})

const btn_playVideo = (video: Dty.File): void => {
    appStore.curSltVideo = video
}

/**
 * 根据视频等级获取黑色主题下的字体颜色样式
 * @param {Object} video - 视频对象，包含tags数组
 * @returns {string} 带颜色的行内样式字符串
 */
const getVideoLevelColorStyle = (video): string => {
    if (appStore.fileSearchStatus === Dty.Fstatus.Deleted) {
        return 'color: #888888;'
    }

    if (!video?.tags || video.tags.length === 0) {
        return 'color: #cccccc;'
    }

    const levelName = video.tags[0].name.toLowerCase()

    const levelColorMap = {
        sys_score1: '#00c6ff',
        sys_score2: '#76ff03',
        sys_score3: '#ffea00',
        sys_score4: '#ff9100',
        sys_score5: '#ff3d00'
    }

    const targetColor = levelColorMap[levelName] || '#cccccc'
    console.log(t('videoList.levelColorMapping', { levelName, targetColor }))
    return `color: ${targetColor};`
}
</script>

<style scoped>
/* 原有的样式保持不变 */
.page-container {
    height: 100%;
    width: calc(100% - 1px);
    padding: 0;
    margin: 0;
    background-color: var(--xc-background-color);
    /* VSCode 侧边栏背景色 */
    color: var(--xc-text-color);
    /* 文字颜色 */
    white-space: nowrap;
    overflow-x: auto;
    border-right: 1px solid #333;
    /* 右侧边框 */
    display: flex;
    flex-direction: column;
}

/* 兼容 Firefox */
.page-container {
    scrollbar-width: thin;
    scrollbar-color: #555 #333;
}

.page-container ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
    flex: 1;
    overflow-y: auto;
}

.page-container li {
    cursor: pointer;
    padding: 2px 2px;
    /* 增加内边距 */
    border-bottom: 1px solid #333;
    /* 底部边框 */
}

.page-container li:hover {
    background-color: #37373d;
    /* 鼠标悬停背景色 */
}

.page-container li:active {
    background-color: #094771;
    /* 鼠标点击背景色 */
}

/* 修改部分：添加选中样式 */
.page-container li.selected {
    background-color: #094771;
    /* VSCode 选中项背景色 */
    color: white;
    /* VSCode 选中项文字颜色 */
}

.vscode-checkbox {
    padding-left: 10px;
    padding-right: 10px;
    padding: 0px;
    margin: 0px;
    opacity: 0.7;
}
</style>
