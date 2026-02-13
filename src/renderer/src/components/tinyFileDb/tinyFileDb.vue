<template>
    <div class="create-prj-comtainer">
        <router-link to="/" class="no-underline-link">
            <button class="xc-button">{{ t('tinyFileDb.returnHome') }}</button>
        </router-link>
        <br />
        <div>
            <label>{{ t('tinyFileDb.thumbnailFilePath') }}：</label>
            <input
                v-model="tinyFilePath"
                class="xc-text-input"
                type="text"
                :placeholder="t('tinyFileDb.thumbnailFilePath')"
                style="width: 80%"
            />
        </div>
        <div>
            <label>{{ t('tinyFileDb.thumbnailDbPath') }}：</label>
            <input
                v-model="tinyFileDbPath"
                class="xc-text-input"
                type="text"
                :placeholder="t('tinyFileDb.thumbnailDbPath')"
                style="width: 80%"
            />
        </div>

        <button class="xc-button" @click="btnclk_Tiny2DbStart">{{ t('tinyFileDb.start') }}</button>
        <label>{{ t('tinyFileDb.description') }}</label>
        <br />
        <button class="xc-button" @click="btnclk_Tiny2DbSop">{{ t('tinyFileDb.stop') }}</button>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
// import { useAppStore } from '../stores/AppStore'
// const appStore = useAppStore()
import '@renderer/assets/common.css'
// import { useRouter } from 'vue-router'
// const router = useRouter()
import * as Dty from '../../../../bridge/dataTypedef'
// import util from '@renderer/utils/util'
import { IpcApi } from '@renderer/utils/ipcApi'
import util from '@renderer/utils/util'

const { t } = useI18n()
const tinyFilePath = ref('D:/02_workspace/05_timeCapsule/02_stream_manager/test_thumb/thumb')
const tinyFileDbPath = ref('D:/02_workspace/05_timeCapsule/02_stream_manager/test_thumb/thumb_db')

async function btnclk_Tiny2DbSop(): Promise<void> {
    console.log(tinyFilePath.value)
    console.log(tinyFileDbPath.value)

    const req: Dty.Req<string> = {
        cmd: Dty.CmdType.tinyFileDbStop,
        data: ''
    }
    const response: Dty.Resp<string> = await IpcApi.trigger_event(req)
    if (!response.isSuccess()) {
        util.addToastErr(`${t('tinyFileDb.stopError')}: ${response.status}`)
        return
    }
    util.addToastInfo(t('tinyFileDb.stopSuccess'))
}

async function btnclk_Tiny2DbStart(): Promise<void> {
    console.log(tinyFilePath.value)
    console.log(tinyFileDbPath.value)

    const req: Dty.Req<Dty.Tiny2DbReq> = {
        cmd: Dty.CmdType.tinyFileDbStart,
        data: {
            tinyFilePath: tinyFilePath.value,
            tinyFileDbPath: tinyFileDbPath.value
        }
    }
    const response: Dty.Resp<string> = await IpcApi.trigger_event(req)
    if (!response.isSuccess()) {
        util.addToastErr(`${t('tinyFileDb.startError')}: ${response.status}`)
        return
    }
    util.addToastInfo(t('tinyFileDb.startSuccess'))
}
</script>
<style scoped>
.create-prj-comtainer {
    width: 100%;
    height: calc(100% - var(--xc-home-nac-height));
    margin: 0;
    padding: 0;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.input-container {
    margin: 0;
    padding: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--xc-background-color);
}
</style>