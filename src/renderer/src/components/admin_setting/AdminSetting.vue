<template>
  <div class="admin-setting-container">
    <router-link to="/" class="no-underline-link">
      <button class="common-button">返回主页</button>
    </router-link>
    <div class="search-title-info">
      <span class="common-text">文件管理 </span>
      <span class="common-text">{{ searchFolder }}</span>
    </div>
    <hr style="height: 1px; background-color: var(--common-page-text-color)" />
    <button class="common-button" type="button" @click="btnclk_sync_work">创建工程</button>
    <button class="common-button" type="button" @click="btnclk_sync_trash">整理回收站</button>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import '../../assets/common.css'
import MessageShow from '../util/MessageShow'
import { IpcApi } from '../../utils/IpcApi'
import * as DataTypes from '../../../../bridge/dataTypedef'
import { useAppStore } from '../../stores/AppStore'
const appStore = useAppStore()
const searchFolder = computed<string>(() => {
  return appStore.curOpenedFolder
})

async function btnclk_sync_work(): Promise<void> {
  const req: DataTypes.Req<DataTypes.Req_SyncWork> = {
    cmd: 'sync_work',
    data: {
      folder: appStore.curOpenedFolder
    }
  }
  const response = await IpcApi.trigger_event(req)
  if (response.code !== 0) {
    MessageShow.error(`创建工程: ${response.status}`)
  } else {
    if (response.bOver === false) {
      MessageShow.info('后台执行中...')
    } else {
      MessageShow.success('创建工程成功')
    }
  }
}

async function btnclk_sync_trash(): Promise<void> {
  const req: DataTypes.Req<DataTypes.Req_SyncTrash> = {
    cmd: 'sync_trash',
    data: {
      folder: appStore.curOpenedFolder
    }
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
  background-color: var(--common-page-background-color);
  color: var(--common-page-text-color);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>
