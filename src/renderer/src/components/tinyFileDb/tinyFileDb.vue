<template>
    <div class="tiny-file-container">
        <div class="form-section">
            <div class="form-group">
                <label>{{ t('tinyFileDb.thumbnailFilePath') }}</label>
                <input
                    v-model="tinyFilePath"
                    class="xc-input"
                    type="text"
                    :placeholder="t('tinyFileDb.thumbnailFilePath')"
                />
            </div>
            <div class="form-group">
                <label>{{ t('tinyFileDb.thumbnailDbPath') }}</label>
                <input
                    v-model="tinyFileDbPath"
                    class="xc-input"
                    type="text"
                    :placeholder="t('tinyFileDb.thumbnailDbPath')"
                />
            </div>
        </div>

        <div class="description-section">
            <p>{{ t('tinyFileDb.description') }}</p>
        </div>

        <div class="action-section">
            <button class="xc-button primary" @click="btnclk_Tiny2DbStart">
                {{ t('tinyFileDb.start') }}
            </button>
            <button class="xc-button" @click="btnclk_Tiny2DbSop">
                {{ t('tinyFileDb.stop') }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import '@renderer/assets/common.css'
import * as Dty from '../../../../bridge/dataTypedef'
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
.tiny-file-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.form-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    font-size: 13px;
    color: #ccc;
}

.form-group .xc-input {
    width: 100%;
    padding: 8px 12px;
    background-color: #3c3c3c;
    border: 1px solid #555;
    border-radius: 4px;
    color: #ccc;
    font-size: 13px;
}

.form-group .xc-input:focus {
    outline: none;
    border-color: #007acc;
}

.description-section {
    padding: 16px;
    background-color: #2d2d30;
    border-radius: 4px;
    border: 1px solid #444;
}

.description-section p {
    margin: 0;
    color: #858585;
    font-size: 13px;
    line-height: 1.5;
}

.action-section {
    display: flex;
    gap: 12px;
}

.xc-button.primary {
    background-color: #007acc;
    color: #fff;
    border-color: #007acc;
}

.xc-button.primary:hover {
    background-color: #0098ff;
    border-color: #0098ff;
}
</style>
