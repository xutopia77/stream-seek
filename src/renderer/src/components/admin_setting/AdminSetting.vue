<template>
    <div class="admin-setting-container">
        <div class="search-title-info">
            <span class="common-text">文件管理 </span>
            <span class="common-text">{{ searchFolder }}</span>
        </div>
        <hr style="height: 1px; background-color: var(--xc-text-color)" />
        <button class="xc-button" type="button" @click="btnclk_sync_work">同步项目</button>
        <button class="xc-button" type="button" @click="btnclk_sync_trash">整理回收站</button>
    </div>
</template>

<script lang="ts" setup>
// import { computed } from 'vue'
import '@renderer/assets/common.css'
import MessageShow from '../util/MessageShow'
import { IpcApi } from '../../utils/IpcApi'
import * as DataTypes from '../../../../bridge/dataTypedef'
import { useAppStore } from '../../stores/AppStore'
const appStore = useAppStore()
const searchFolder = ''

async function btnclk_sync_work(): Promise<void> {
    const req: DataTypes.Req<DataTypes.SyncPrjReq> = {
        cmd: 'sync_prj',
        data: {
            prj: appStore.prj
        }
    }
    const response = await IpcApi.trigger_event(req)
    if (response.code !== 0) {
        MessageShow.error(`同步项目失败: ${response.status}`)
    } else {
        if (response.bOver === false) {
            MessageShow.info('后台执行中...')
        } else {
            MessageShow.success('同步项目')
        }
    }
}

async function btnclk_sync_trash(): Promise<void> {
    const req: DataTypes.Req<DataTypes.Req_SyncTrash> = {
        cmd: 'sync_trash'
    }
    const response = await IpcApi.trigger_event(req)
    if (response.code !== 0) {
        MessageShow.error(`整理回收站: ${response.status}`)
    } else {
        if (response.bOver === false) {
            MessageShow.info('后台执行中...')
        } else {
            MessageShow.success('整理回收站成功')
        }
    }
}
</script>

<style scoped>
.admin-setting-container {
    height: 100%;
    width: 100%;
    padding: 0;
    margin: 0;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>
