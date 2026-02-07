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
                    >{{ `${index + 1}:${DataTypes.File.makeDisplayName(video)}` }}</span
                >
            </li>
        </ul>
        <PaginationCtrl page-type="video" />
    </div>
</template>

<script setup lang="ts">
import PaginationCtrl from '@renderer/components/common/paginationCtrl.vue'
import { computed, onBeforeMount, ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@renderer/stores/AppStore'
const appStore = useAppStore()
import '@renderer/assets/common.css'
import * as DataTypes from '../../../../../bridge/dataTypedef'
// import util from '@renderer/utils/util'

const videoList = computed<DataTypes.File[]>(() => appStore.videoList)

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
const toggleVideoSelection = (
    video: DataTypes.File,
    isChecked: boolean,
    currentIndex: number
): void => {
    console.log(`Video ${video.name} is ${isChecked ? 'selected' : 'deselected'}`)
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

const btn_playVideo = (video: DataTypes.File): void => {
    appStore.curSltVideo = video
}

/**
 * 根据视频等级获取黑色主题下的字体颜色样式
 * @param {Object} video - 视频对象，包含tags数组
 * @returns {string} 带颜色的行内样式字符串
 */
const getVideoLevelColorStyle = (video): string => {
    // 防御性判断：避免tags不存在/为空导致的报错
    if (!video?.tags || video.tags.length === 0) {
        return 'color: #cccccc;' // 默认浅灰色（黑色背景通用）
    }

    // 提取等级名称并统一转为小写，增强鲁棒性
    const levelName = video.tags[0].name.toLowerCase()

    // 黑色主题下的等级颜色映射表（高对比度、层级区分）
    const levelColorMap = {
        sys_score1: '#00c6ff', // 亮蓝色（最高级，最醒目）
        sys_score2: '#76ff03', // 亮绿色（次高级）
        sys_score3: '#ffea00', // 金黄色（中级）
        sys_score4: '#ff9100', // 橙色（次低级）
        sys_score5: '#ff3d00' // 橙红色（最低级）
    }

    // 匹配颜色，无匹配则用默认浅灰色
    const targetColor = levelColorMap[levelName] || '#cccccc'
    console.log(`levelName: ${levelName}, targetColor: ${targetColor}`)
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
