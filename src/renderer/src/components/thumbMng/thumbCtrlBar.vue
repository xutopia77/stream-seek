<template>
    <div class="play-ctrl">
        <span class="xc-text" style="padding-right: 3px">文件总数</span>
        <div class="right-area-ctrl">
            <button class="xc-button btn-noborder" title="上一个文件" @click="btn_thumbDel()">
                删除
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
// import { useAppStore } from '../../stores/AppStore'
import '@renderer/assets/common.css'
// import util from '@renderer/utils/util'
// const appStore = useAppStore()
// import * as Dty from '../../../../bridge/dataTypedef'

function btn_thumbDel(): void {
    console.log('asdf')
}
</script>

<style scoped>
.btn-noborder {
    border: none;
}

.play-ctrl {
    height: 60px;
    width: 100%;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    background-color: #252526;
    /* VSCode 侧边栏背景色 */
}

.right-area-ctrl {
    margin-left: auto;
}
</style>
