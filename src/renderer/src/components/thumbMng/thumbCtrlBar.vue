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
import { useAppStore } from '../../stores/AppStore'
const appStore = useAppStore()
import '@renderer/assets/common.css'
import util from '@renderer/utils/util'
import * as Dty from '../../../../bridge/dataTypedef'

function btn_thumbDel(): void {
    const curChkThumb = appStore.curChkThumb
    if (curChkThumb == null) {
        util.addToastInfo('没有选择的文件')
        return
    }

    const req: Dty.DeleteFileReq = new Dty.DeleteFileReq()
    for (const item of curChkThumb) {
        const fInfo = new Dty.File()
        fInfo.path = item.path
        fInfo.repo = item.repo
        req.files.push(fInfo)
    }
    if (req.files.length == 0) {
        util.addToastInfo('没有选择的文件')
        return
    }
    req.type = 'destroy'
    console.log('delete file req', req)
    util.thumbsDel(req)
    appStore.curChkThumb.clear()
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
