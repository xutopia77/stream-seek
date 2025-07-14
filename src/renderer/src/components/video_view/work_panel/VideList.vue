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
                            toggleVideoSelection(video, ($event.target as HTMLInputElement).checked)
                        "
                    />
                    <span class="checkmark"></span>
                </label>
                <span class="xc-text" @click="playVideo(video)">{{
                    `${index + 1}:${DataTypes.File.makeDisplayName(video)}`
                }}</span>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount } from 'vue'
import { useAppStore } from '../../../stores/AppStore'
const appStore = useAppStore()
import '@renderer/assets/common.css'
import * as DataTypes from '../../../../../bridge/dataTypedef'
const videoList = computed<DataTypes.File[]>(() => appStore.videoList)

// 切换视频的选中状态
const toggleVideoSelection = (video: DataTypes.File, isChecked: boolean): void => {
    console.log(`Video ${video.name} is ${isChecked ? 'selected' : 'deselected'}`)
    if (isChecked) {
        appStore.curCheckedVideo.add(video)
    } else {
        appStore.curCheckedVideo.delete(video)
    }
}

onBeforeMount(() => {})

const playVideo = (video: DataTypes.File): void => {
    appStore.curSltVideo = video
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
