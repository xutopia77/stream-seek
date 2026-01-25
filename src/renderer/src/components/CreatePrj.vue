<template>
    <div class="create-prj-comtainer">
        <router-link to="/" class="no-underline-link">
            <button class="xc-button">返回主页</button>
        </router-link>
        <br />
        <div v-for="(repo, index) in dataRepo" :key="index" class="input-container">
            <div>
                <label>仓库路径：</label>
                <input
                    v-model="repo.name"
                    class="xc-text-input"
                    type="text"
                    placeholder="请输入仓库名称"
                    style="width: 80%"
                />
            </div>
            <div>
                <label>项目路径：</label>
                <input
                    v-model="repo.path"
                    class="xc-text-input"
                    type="text"
                    placeholder="请输入仓库路径"
                    style="width: 80%"
                />
            </div>
        </div>

        <button class="xc-button" @click="btnclk_create_prj">创建项目</button>
        <label>项目创建成功后，需要到 功能 界面中，项目同步</label>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
// import { useAppStore } from '../stores/AppStore'
// const appStore = useAppStore()
import '../assets/common.css'
// import util from '../utils/util'
import { useRouter } from 'vue-router'
const router = useRouter()
import MessageShow from './util/MessageShow'
import * as DataTypes from '../../../bridge/dataTypedef'
import util from '@renderer/utils/util'

// 创建一个ref数组 3个元素
const dataRepo = ref<DataTypes.DataRepo[]>([
    {
        name: 'test_data',
        path: 'D:/02_workspace/05_timeCapsule/02_stream_manager/test_data',
        thumbnailPath: ''
    }
])

async function btnclk_create_prj(): Promise<void> {
    let relRepo = dataRepo.value.filter((repo) => repo.name != null && repo.name !== '')

    if (relRepo == null || relRepo.length === 0) {
        return MessageShow.error('请输入数据路径')
    }
    const response = await util.create_prj(relRepo)
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
