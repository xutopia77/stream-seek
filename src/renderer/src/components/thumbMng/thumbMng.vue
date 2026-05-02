<template>
    <div class="video-preview-container">
        <div class="preview-container">
            <div class="preview-image">
                <ThumbView></ThumbView>
            </div>
            <div class="work-panel">
                <ThumbList v-if="rightPanel === Dty.WorkPanel.List" />
            </div>
        </div>
        <div class="control-container">
            <ThumbInfoBar />
            <ThumbCtrlBar />
        </div>
    </div>
</template>

<script lang="ts" setup>
import ThumbList from './thumbFileList.vue'
import ThumbView from './thumbView.vue'
import ThumbCtrlBar from './thumbCtrlBar.vue'
import { onMounted, computed } from 'vue'
import util from '@renderer/utils/util'
import { useAppStore } from '@renderer/stores/AppStore'
const appStore = useAppStore()
import * as Dty from '../../../../bridge/dataTypedef'

let rightPanel = computed(() => appStore.rightPanel)

onMounted(() => {
    let searchReq = new Dty.FilesReq()
    searchReq.status.push(Dty.Fstatus.Destroy)
    util.thumbsGet(searchReq)
})
</script>

<style scoped>
.video-preview-container {
    height: calc(100% - var(--xc-home-nac-height));
    width: 100%;
    padding: 0;
    margin: 0;
    background-color: #f0f2f7;
    display: flex;
    flex-direction: column;
}

.preview-container {
    width: 100%;
    height: calc(100% - 60px);
    padding: 0;
    margin: 0;
    display: flex;
}

.preview-image {
    height: 100%;
    flex: 1;
    padding: 0;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: black;
}

.work-panel {
    height: 100%;
    width: 20%;
    max-width: 250px;
    padding: 0;
    margin: 0;
}

.preview-image video {
    max-height: 100%;
    width: 100%;
    padding: 0;
    margin: 0;
    object-fit: contain;
    /* 确保视频适应容器 */
}

.control-container {
    height: 60px;
    width: 100%;
    padding: 0;
    margin: 0;
}
</style>