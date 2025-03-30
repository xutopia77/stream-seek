<template>
  <div class="video-list common-scrollbar">
    <ul>
      <li v-for="(video, index) in videoList" :key="index" @click="playVideo(video)">
        <span class="common-text">{{ `${index + 1}:${video.title}` }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount } from 'vue'
import { useAppStore } from '../../stores/AppStore'
const appStore = useAppStore()
import '../../assets/common.css'
import * as DataTypes from '../../../../bridge/dataTypedef'
const videoList = computed<DataTypes.FileInfo[]>(() => appStore.videoList)

onBeforeMount(() => {
  // const videoList = ref([
  //   {
  //     title: '00_20250313113251_20250313114420.mp4',
  //     src: 'file://D:/02_workspace/05_timeCapsule/01_stream_manager_ui/stream_manager_ui/src/data/00_20250313113251_20250313114420.mp4'
  //   }
  // ])
  // appStore.setData('videoList', videoList.value)
})

const playVideo = (video: DataTypes.FileInfo): void => {
  appStore.curSltVideo = video
}
</script>

<style scoped>
.video-list {
  height: 100%;
  width: 10%;
  min-width: 200px;
  max-width: 300px;
  padding: 0;
  margin: 0;
  background-color: var(--common-page-background-color);
  /* VSCode 侧边栏背景色 */
  color: #ccc;
  /* 文字颜色 */
  white-space: nowrap;
  overflow-x: auto;
  border-right: 1px solid #333;
  /* 右侧边框 */
}

/* 兼容 Firefox */
.video-list {
  scrollbar-width: thin;
  scrollbar-color: #555 #333;
}

.video-list ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.video-list li {
  cursor: pointer;
  padding: 2px 2px;
  /* 增加内边距 */
  border-bottom: 1px solid #333;
  /* 底部边框 */
}

.video-list li:hover {
  background-color: #37373d;
  /* 鼠标悬停背景色 */
}

.video-list li:active {
  background-color: #094771;
  /* 鼠标点击背景色 */
}
</style>
