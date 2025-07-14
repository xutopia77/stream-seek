<template>
    <div class="admin-container">
        <router-link to="/" class="no-underline-link">
            <button class="xc-button">返回主页</button>
        </router-link>
        <div class="search-title-info">
            <span class="common-text">录像片段管理</span>
            <span class="common-text">{{ searchFolder }}</span>
        </div>

        <div class="query-action">
            <QueryForm style="width: 85%" />
            <VideoAction style="width: 15%" />
        </div>
        <ResultDisplay />
    </div>
</template>

<script lang="ts" setup>
// import { computed } from 'vue'
import VideoAction from '../video_search/VideoAction.vue'
import QueryForm from '../video_search/QueryForm.vue'
import ResultDisplay from '../video_search/ResultDisplay.vue'
// import { useAppStore } from '../../stores/AppStore'
// const appStore = useAppStore()
const searchFolder = ''
</script>

<style scoped>
.admin-container {
    width: 100%;
    height: calc(100% - 30px);
    margin: 0;
    padding: 0;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
}

.search-title-info {
    display: flex;
    width: 100%;
}

.search-title-info span {
    margin-right: 5px;
}

.query-action {
    display: flex;
    flex-direction: row;
    width: 100%;
}
</style>
