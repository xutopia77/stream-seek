<template>
    <div class="play-ctrl">
        <span class="xc-text" style="padding-right: 3px">{{ t('thumbCtrlBar.totalFiles') }}</span>
        <div class="right-area-ctrl">
            <button
                class="xc-button btn-noborder"
                :title="t('thumbCtrlBar.deleteFile')"
                @click="btn_thumbDel()"
            >
                {{ t('thumbCtrlBar.delete') }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useAppStore } from '../../stores/AppStore'
import { useI18n } from 'vue-i18n'
const appStore = useAppStore()
import '@renderer/assets/common.css'
import util from '@renderer/utils/util'
import * as Dty from '../../../../bridge/dataTypedef'

const { t } = useI18n()

function btn_thumbDel(): void {
    const curChkThumb = appStore.curChkThumb
    if (curChkThumb == null) {
        util.addToastInfo(t('thumbCtrlBar.noSelectedFile'))
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
        util.addToastInfo(t('thumbCtrlBar.noSelectedFile'))
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
