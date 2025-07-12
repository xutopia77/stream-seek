<template>
  <div class="create-prj-comtainer">
    <router-link to="/" class="no-underline-link">
      <button class="common-button">返回主页</button>
    </router-link>
    <br />
    <input v-model="dataBasePath" type="text" placeholder="请输入数据路径" style="width: 100%" />
    <button class="common-button" @click="btnclk_create_prj">创建项目</button>
    <label>项目创建成功后，需要到 功能 界面中，项目同步</label>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../stores/AppStore'
const appStore = useAppStore()
import '../assets/common.css'
// import util from '../utils/util'
import { useRouter } from 'vue-router'
const router = useRouter()
import { IpcApi } from '../utils/IpcApi'
import MessageShow from './util/MessageShow'
import * as DataTypes from '../../../bridge/dataTypedef'

const dataBasePath = computed({
  get: () => {
    return appStore.prj.dataFolder
  },
  set: (newVal: string) => {
    appStore.prj.dataFolder = newVal
  }
})

async function btnclk_create_prj(): Promise<void> {
  if (dataBasePath.value == null || dataBasePath.value === '') {
    return MessageShow.error('请输入数据路径')
  }
  const req: DataTypes.Req<DataTypes.CreatePrjReq> = {
    cmd: 'create_prj',
    data: {
      dataBasePath: dataBasePath.value
    }
  }
  const response: DataTypes.Resp = await IpcApi.trigger_event(req)
  if (response.code === 0) {
    if (response.bOver === false) {
      MessageShow.info(`正在处理ing`)
    } else {
      MessageShow.success('创建项目成功')
    }
    router.push('/')
  } else {
    MessageShow.error(`创建项目失败: ${response.status}`)
  }
}
</script>
<style scoped>
.create-prj-comtainer {
  width: 100%;
  height: calc(100% - var(--xc-home-nac-height));
  margin: 0;
  padding: 0;
  background-color: var(--xc-page-background-color);
  color: var(--xc-page-text-color);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>
