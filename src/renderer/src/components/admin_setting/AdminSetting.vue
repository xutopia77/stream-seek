<template>
    <div class="admin-setting-container">
        <div class="search-title-info">
            <span class="xc-text">工程路径: </span>
            <span class="xc-text">{{ appStore.prj.path }}: </span><br />
            <span class="xc-text">仓库: </span><br />
            <div v-for="(repo, index) in dataRepo" :key="index" class="input-container">
                <span class="xc-text">{{ repo.name }}: </span>
                <span class="xc-text">{{ repo.path }} </span>
                <br />
                <span class="xc-text">缩略图路径: </span>
                <input
                    v-model="repo.thumbnailPath"
                    type="text"
                    style="width: 80%"
                    class="xc-text-input"
                />
            </div>
        </div>
        <hr style="height: 1px; background-color: var(--xc-text-color)" />
        <input v-model="bNeedClassifyFile" type="checkbox" class="xc-check-input" />
        <span class="xc-text">文件规整</span>
        <input v-model="bNeedGenThumbnail" type="checkbox" class="xc-check-input" />
        <span class="xc-text">生成缩略图</span>
        <button class="xc-button" type="button" @click="btnclk_sync_work()">同步项目</button>

        <select v-model="repoType" class="xc-select">
            <option :value="DataTypes.RepoType.Normal">正常</option>
            <option :value="DataTypes.RepoType.Trash">回收站</option>
        </select>
        <button class="xc-button" type="button" @click="btnclk_set_repo_type()">
            设置仓库模式
        </button>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import '@renderer/assets/common.css'
import MessageShow from '../util/MessageShow'
// import { IpcApi } from '../../utils/IpcApi'
import * as DataTypes from '../../../../bridge/dataTypedef'
import { useAppStore } from '../../stores/AppStore'
import util from '@renderer/utils/util'
const appStore = useAppStore()

const dataRepo = ref<DataTypes.DataRepo[]>([
    {
        name: 'test_data',
        path: 'D:/02_workspace/05_timeCapsule/02_stream_manager/test_data',
        thumbnailPath: ''
    },
    { name: '', path: '', thumbnailPath: '' },
    { name: '', path: '', thumbnailPath: '' }
])

watch(
    () => appStore.prj,
    (prj: DataTypes.Prj) => {
        dataRepo.value = prj.dataRepo
    }
)

const bNeedGenThumbnail = ref<boolean>(false)
const bNeedClassifyFile = ref<boolean>(true)

async function btnclk_sync_work(types: DataTypes.SyncType[] = []): Promise<void> {
    let syncTypes: DataTypes.SyncType[] = []
    if (types != null && types.length > 0) {
        syncTypes = types
    } else {
        syncTypes = [DataTypes.SyncType.prjInfo]
        if (bNeedGenThumbnail.value) {
            syncTypes.push(DataTypes.SyncType.thumbnail)
        }
        if (bNeedClassifyFile.value) {
            syncTypes.push(DataTypes.SyncType.classify)
        }
    }

    const response = await util.sync_prj(syncTypes)
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

// ------------------------------------------------
const repoType = ref<DataTypes.RepoType>(DataTypes.RepoType.Normal)
async function btnclk_set_repo_type(): Promise<void> {
    appStore.prj.repoType = repoType.value
    await btnclk_sync_work([DataTypes.SyncType.prjInfo])
    console.log(`repoType: ${repoType.value}`)
}
// ------------------------------------------------

onMounted(() => {
    dataRepo.value = appStore.prj.dataRepo
    repoType.value = appStore.prj.repoType
})
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
