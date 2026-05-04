<template>
    <div class="admin-setting-container">
        <div class="setting-card">
            <h3 class="setting-title">{{ t('adminSetting.projectInfo') }}</h3>
            <div class="info-item">
                <span class="info-label">{{ t('adminSetting.projectPath') }}:</span>
                <span class="info-value">{{ appStore.prj?.path }}</span>
            </div>
            <div v-for="(repo, index) in dataRepo" :key="index" class="repo-item">
                <span class="info-label">{{ t('adminSetting.repoPath') }}:</span>
                <span class="info-value">{{ repo.path }}</span>
            </div>
        </div>

        <div class="setting-card">
            <h3 class="setting-title">{{ t('adminSetting.syncOptions') }}</h3>
            <div class="option-item">
                <input v-model="bNeedClassifyFile" type="checkbox" class="xc-check-input" />
                <span class="option-label">{{ t('adminSetting.fileOrganize') }}</span>
            </div>
            <div class="option-item">
                <input v-model="bNeedGenThumbnail" type="checkbox" class="xc-check-input" />
                <span class="option-label">{{ t('adminSetting.generateThumbnail') }}</span>
            </div>
            <button class="xc-button primary" type="button" @click="btnclk_sync_work()">
                {{ t('adminSetting.syncProject') }}
            </button>
            <button class="xc-button" type="button" @click="btnclk_syncStop()">
                {{ t('adminSetting.stopSync') }}
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import '@renderer/assets/common.css'
import { IpcApi } from '../../utils/ipcApi'
import * as Dty from '../../../../bridge/dataTypedef'
import { useAppStore } from '@renderer/stores/AppStore'
import { useI18n } from 'vue-i18n'
const appStore = useAppStore()
import util from '@renderer/utils/util'

const { t } = useI18n()

const dataRepo = ref<Dty.DataRepo[]>([
    {
        name: 'test_data',
        path: 'D:/02_workspace/05_timeCapsule/02_stream_manager/test_data',
        thumbnailPath: '',
        framePath: ''
    },
    { name: '', path: '', thumbnailPath: '', framePath: '' },
    { name: '', path: '', thumbnailPath: '', framePath: '' }
])

watch(
    () => appStore.prj,
    (prj: Dty.Prj | null) => {
        if (prj) {
            dataRepo.value = prj.dataRepo
        }
    }
)

const bNeedGenThumbnail = ref<boolean>(false)
const bNeedClassifyFile = ref<boolean>(true)

async function btnclk_syncStop(): Promise<void> {
    const req: Dty.Req = {
        cmd: Dty.CmdType.SyncStop
    }
    const response: Dty.Resp = await IpcApi.trigger_event(req)
    if (response.code == Dty.RespCode.Success) {
        if (response.bOver == false) {
            util.addToastInfo(t('adminSetting.stopSyncBackground'))
        } else {
            util.addToastInfo(t('adminSetting.stopSync'))
        }
    } else {
        util.addToastErr(`${t('adminSetting.stopSyncFailed')} ${response.status}`)
    }
    return
}

async function btnclk_sync_work(types: Dty.SyncType[] = []): Promise<void> {
    let syncTypes: Dty.SyncType[] = []
    if (types != null && types.length > 0) {
        syncTypes = types
    } else {
        syncTypes = [Dty.SyncType.prjInfo]
        if (bNeedGenThumbnail.value) {
            syncTypes.push(Dty.SyncType.thumbnail)
        }
        if (bNeedClassifyFile.value) {
            syncTypes.push(Dty.SyncType.classify)
        }
    }
    const response = await util.sync_prj(syncTypes)
    if (response.code !== Dty.RespCode.Success) {
        util.addToastErr(`${t('adminSetting.syncProjectFailed')}: ${response.status}`)
    } else {
        if (response.bOver === false) {
            util.addToastInfo(t('adminSetting.backgroundExecuting'))
        } else {
            util.addToastInfo(`${t('adminSetting.syncProject')}: ${response.status}`)
            await util.start_app()
        }
    }
}

onMounted(() => {
    if (appStore.prj) {
        dataRepo.value = appStore.prj.dataRepo
    }
})
</script>

<style scoped>
.admin-setting-container {
    height: 100%;
    width: 100%;
    padding: 15px;
    margin: 0;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    flex-direction: column;
    gap: 12px; /* 减少间距 */
    overflow: hidden; /* 防止出现滚动条 */
    box-sizing: border-box; /* 确保padding不增加额外尺寸 */
}

.setting-card {
    background-color: #2d2d30;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 12px; /* 减少内边距 */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    flex-shrink: 0; /* 防止卡片被压缩 */
}

.setting-title {
    margin: 0 0 10px 0; /* 减少底部边距 */
    padding-bottom: 6px;
    border-bottom: 1px solid #444;
    color: #ddd;
    font-size: 15px; /* 稍微减小字体 */
    font-weight: 600;
}

.info-item {
    display: flex;
    margin-bottom: 6px; /* 减少底部边距 */
    align-items: center;
}

.info-label {
    display: inline-block;
    width: 80px;
    color: #aaa;
    font-size: 13px; /* 稍微减小字体 */
    margin-right: 8px; /* 减少右边距 */
}

.info-value {
    color: #ccc;
    font-size: 13px; /* 稍微减小字体 */
    word-break: break-all;
    flex: 1;
}

.repo-item {
    display: flex;
    margin-bottom: 4px; /* 减少底部边距 */
    align-items: flex-start;
}

.option-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px; /* 减少底部边距 */
}

.option-label {
    margin-left: 6px; /* 减少左边距 */
    color: #ccc;
    font-size: 13px; /* 稍微减小字体 */
}

.mode-selector {
    display: flex;
    align-items: center;
    gap: 8px; /* 减少间距 */
}

/* 针对较长文本进行优化 */
.info-value {
    min-width: 0; /* 允许收缩 */
}
</style>
