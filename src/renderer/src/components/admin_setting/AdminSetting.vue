<template>
    <div class="admin-setting-container">
        <div class="setting-card">
            <h3 class="setting-title">{{ t('adminSetting.projectInfo') }}</h3>
            <div v-if="appStore.prj" class="project-info">
                <div class="info-item">
                    <span class="info-label">{{ t('adminSetting.projectPath') }}:</span>
                    <span class="info-value">{{ appStore.prj.path }}</span>
                </div>
                <div v-for="(repo, index) in appStore.prj.dataRepo" :key="index" class="repo-item">
                    <span class="info-label">{{ t('adminSetting.repoPath') }}:</span>
                    <span class="info-value">{{ repo.path }}</span>
                </div>
            </div>
            <div v-else class="no-project">
                <span class="hint-text">{{ t('adminSetting.noProjectOpened') }}</span>
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
import { onMounted, ref } from 'vue'
import '@renderer/assets/common.css'
import { IpcApi } from '../../utils/ipcApi'
import * as Dty from '../../../../bridge/dataTypedef'
import { useAppStore } from '@renderer/stores/AppStore'
import { useI18n } from 'vue-i18n'
const appStore = useAppStore()
import util from '@renderer/utils/util'

const { t } = useI18n()

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
    if (!appStore.prj) {
        util.addToastErr(t('adminSetting.pleaseOpenProject'))
        return
    }
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
            const searchReq = new Dty.FilesReq()
            searchReq.status = [appStore.fileSearchStatus]
            await util.files_get(searchReq)
        }
    }
}

onMounted(() => {})
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
    gap: 12px; /* Reduce gap */
    overflow: hidden; /* Prevent scrollbar */
    box-sizing: border-box; /* Ensure padding doesn't add extra size */
}

.setting-card {
    background-color: #2d2d30;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 12px; /* Reduce padding */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    flex-shrink: 0; /* Prevent card from being compressed */
}

.setting-title {
    margin: 0 0 10px 0; /* Reduce bottom margin */
    padding-bottom: 6px;
    border-bottom: 1px solid #444;
    color: #ddd;
    font-size: 15px; /* Slightly reduce font size */
    font-weight: 600;
}

.info-item {
    display: flex;
    margin-bottom: 6px; /* Reduce bottom margin */
    align-items: center;
}

.info-label {
    display: inline-block;
    width: 80px;
    color: #aaa;
    font-size: 13px; /* Slightly reduce font size */
    margin-right: 8px; /* Reduce right margin */
}

.info-value {
    color: #ccc;
    font-size: 13px; /* Slightly reduce font size */
    word-break: break-all;
    flex: 1;
}

.repo-item {
    display: flex;
    margin-bottom: 4px;
    align-items: flex-start;
}

.no-project {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.hint-text {
    color: #666;
    font-size: 13px;
}

.option-item {
    display: flex;
    align-items: center;
    margin-bottom: 10px; /* Reduce bottom margin */
}

.option-label {
    margin-left: 6px; /* Reduce left margin */
    color: #ccc;
    font-size: 13px; /* Slightly reduce font */
}

.mode-selector {
    display: flex;
    align-items: center;
    gap: 8px; /* Reduce spacing */
}

/* Optimize for longer text */
.info-value {
    min-width: 0; /* Allow shrinking */
}
</style>
