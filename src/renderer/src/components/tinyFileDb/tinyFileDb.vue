<template>
    <div class="create-prj-comtainer">
        <router-link to="/" class="no-underline-link">
            <button class="xc-button">返回主页</button>
        </router-link>
        <br />
        <div>
            <label>缩略图文件路径：</label>
            <input
                v-model="tinyFilePath"
                class="xc-text-input"
                type="text"
                placeholder="缩略图文件路径"
                style="width: 80%"
            />
        </div>
        <div>
            <label>缩略图数据库路径：</label>
            <input
                v-model="tinyFileDbPath"
                class="xc-text-input"
                type="text"
                placeholder="缩略图数据库路径"
                style="width: 80%"
            />
        </div>

        <button class="xc-button" @click="btnclk_Tiny2DbStart">开始</button>
        <label>把小文件缩略图文件，整理到数据库中</label>
        <br />
        <button class="xc-button" @click="btnclk_Tiny2DbSop">停止</button>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
// import { useAppStore } from '../stores/AppStore'
// const appStore = useAppStore()
import '@renderer/assets/common.css'
// import { useRouter } from 'vue-router'
// const router = useRouter()
import * as Dty from '../../../../bridge/dataTypedef'
// import util from '@renderer/utils/util'
import { IpcApi } from '@renderer/utils/ipcApi'
import util from '@renderer/utils/util'

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
        util.addToastErr(`文件整理停止触发：${response.status}`)
        return
    }
    util.addToastInfo(`文件整理停止触发成功`)
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
        util.addToastErr(`文件整理：${response.status}`)
        return
    }
    util.addToastInfo(`文件整理开始成功`)
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
