<template>
    <div v-if="visible" class="modal-overlay" @click.self="close">
        <div class="modal-container">
            <div class="modal-header">
                <h3>{{ t('createProject.title') }}</h3>
                <button class="close-btn" @click="close">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>{{ t('createProject.repoName') }}</label>
                    <input
                        v-model="repoName"
                        type="text"
                        class="xc-text-input"
                        :placeholder="t('createProject.repoNamePlaceholder')"
                    />
                </div>
                <div class="form-group">
                    <label>{{ t('createProject.repoPath') }}</label>
                    <div class="path-input-group">
                        <input
                            v-model="repoPath"
                            type="text"
                            class="xc-text-input"
                            :placeholder="t('createProject.repoPathPlaceholder')"
                            readonly
                        />
                        <button class="xc-button" @click="selectFolder">
                            {{ t('createProject.browse') }}
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label>{{ t('createProject.projectLocation') }}</label>
                    <div class="path-input-group">
                        <input
                            v-model="projectPath"
                            type="text"
                            class="xc-text-input"
                            :placeholder="t('createProject.projectLocationPlaceholder')"
                            readonly
                        />
                        <button class="xc-button" @click="selectProjectFolder">
                            {{ t('createProject.browse') }}
                        </button>
                    </div>
                    <span class="hint-text">{{ t('createProject.projectLocationHint') }}</span>
                </div>
            </div>
            <div class="modal-footer">
                <button class="xc-button" @click="close">{{ t('common.cancel') }}</button>
                <button class="xc-button primary" :disabled="!canCreate" @click="createProject">
                    {{ t('createProject.create') }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IpcApi } from '../utils/ipcApi'
import * as Dty from '../../../bridge/dataTypedef'
import util from '../utils/util'

defineProps<{
    visible: boolean
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'created'): void
}>()

const { t } = useI18n()

const repoName = ref('')
const repoPath = ref('')
const projectPath = ref('')

const canCreate = computed(() => {
    return (
        repoName.value.trim() !== '' &&
        repoPath.value.trim() !== '' &&
        projectPath.value.trim() !== ''
    )
})

const selectFolder = async (): Promise<void> => {
    const response = await IpcApi.trigger_event({
        cmd: Dty.CmdType.selectFolder
    })
    if (response.code === 0 && response.data) {
        repoPath.value = response.data
    }
}

const selectProjectFolder = async (): Promise<void> => {
    const response = await IpcApi.trigger_event({
        cmd: Dty.CmdType.selectFolder
    })
    if (response.code === 0 && response.data) {
        projectPath.value = response.data
    }
}

const createProject = async (): Promise<void> => {
    if (!canCreate.value) return

    const dataRepo: Dty.DataRepo[] = [
        {
            name: repoName.value.trim(),
            path: repoPath.value.trim(),
            thumbnailPath: '',
            framePath: ''
        }
    ]

    const response = await util.create_prj_with_path(dataRepo, projectPath.value.trim())

    if (response.code === 0) {
        util.addToastInfo(t('createProject.createSuccess'))
        emit('created')
        close()
    } else {
        util.addToastErr(`${t('createProject.createFailed')}: ${response.status}`)
    }
}

const close = (): void => {
    repoName.value = ''
    repoPath.value = ''
    projectPath.value = ''
    emit('close')
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-container {
    background-color: #252526;
    border: 1px solid #3c3c3c;
    border-radius: 6px;
    width: 480px;
    max-width: 90%;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #3c3c3c;
}

.modal-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: #ffffff;
}

.close-btn {
    background: none;
    border: none;
    color: #858585;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}

.close-btn:hover {
    color: #ffffff;
}

.modal-body {
    padding: 16px;
}

.form-group {
    margin-bottom: 16px;
}

.form-group:last-child {
    margin-bottom: 0;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: #cccccc;
}

.path-input-group {
    display: flex;
    gap: 8px;
}

.path-input-group .xc-text-input {
    flex: 1;
}

.hint-text {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: #858585;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid #3c3c3c;
}

.primary {
    background-color: #007acc;
    color: #ffffff;
}

.primary:hover {
    background-color: #0098ff;
}

.primary:disabled {
    background-color: #3c3c3c;
    color: #858585;
    cursor: not-allowed;
}
</style>
