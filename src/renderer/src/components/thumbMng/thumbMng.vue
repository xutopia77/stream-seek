<template>
    <div class="thumb-mng-container">
        <div class="preview-area">
            <div class="preview-image xc-scrollbar">
                <ThumbView></ThumbView>
            </div>
            <div class="work-panel">
                <ThumbList v-if="rightPanel === Dty.WorkPanel.List" />
            </div>
        </div>
        <div class="control-bar">
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
.thumb-mng-container {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--xc-background-color);
}

.preview-area {
    flex: 1;
    display: flex;
    overflow: hidden;
}

.preview-image {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #1a1a1a;
    overflow: auto;
}

.work-panel {
    width: 20%;
    max-width: 250px;
    min-width: 200px;
    background-color: #252526;
    border-left: 1px solid #333;
    overflow: hidden;
}

.control-bar {
    height: 60px;
    background-color: #252526;
    border-top: 1px solid #333;
}
</style>
