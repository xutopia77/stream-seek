<template>
    <div class="page-contianer">
        <div class="table-content xc-scrollbar">
            <table class="path-table">
                <thead>
                    <tr>
                        <th class="index-col">{{ t('adminTagMng.serialNumber') }}</th>
                        <th>{{ t('adminTagMng.name') }}</th>
                        <th>{{ t('adminTagMng.color') }}</th>
                        <th>{{ t('adminTagMng.description') }}</th>
                        <th>{{ t('adminTagMng.operations') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="(item, index) in allTags"
                        :key="index"
                        :class="{ selected: selectedTagItem?.name === item.name }"
                        @click="selectTag(item)"
                    >
                        <td class="index-col">{{ index + 1 }}</td>
                        <td>{{ tagNameShowMake(item.name) }}</td>
                        <td>
                            <div
                                :style="{
                                    backgroundColor: item.color,
                                    width: '20px',
                                    height: '20px'
                                }"
                            ></div>
                        </td>
                        <td class="description-col">{{ item.description }}</td>
                        <td>
                            <button
                                class="xc-button"
                                style="margin-right: 10px"
                                @click.stop="btn_showEditDialog(item)"
                            >
                                {{ t('adminTagMng.edit') }}
                            </button>
                            <button class="xc-button" @click.stop="btn_deletetag(item)">
                                {{ t('adminTagMng.delete') }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Edit Dialog -->
        <div v-if="isEditDialogVisible" class="dialog-overlay" @click.self="closeEditDialog">
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>{{ t('adminTagMng.editTag') }}</h3>
                </div>
                <div class="dialog-body">
                    <div class="form-group">
                        <label>{{ t('adminTagMng.name') }}</label>
                        <input v-model="editingTag.name" type="text" class="xc-input" />
                    </div>
                    <div class="form-group">
                        <label>{{ t('adminTagMng.color') }}</label>
                        <div class="color-input-group">
                            <input v-model="editingTag.color" type="color" class="color-picker" />
                            <input v-model="editingTag.color" type="text" class="xc-input" />
                        </div>
                    </div>
                    <div class="form-group">
                        <label>{{ t('adminTagMng.description') }}</label>
                        <textarea v-model="editingTag.description" class="xc-input textarea" rows="3"></textarea>
                    </div>
                </div>
                <div class="dialog-footer">
                    <button class="xc-button" @click="closeEditDialog">
                        {{ t('common.cancel') }}
                    </button>
                    <button class="xc-button primary" @click="btn_saveTag">
                        {{ t('common.save') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Delete Confirm Dialog -->
        <div v-if="isDeleteDialogVisible" class="dialog-overlay" @click.self="closeDeleteDialog">
            <div class="dialog-content dialog-small">
                <div class="dialog-header">
                    <h3>{{ t('adminTagMng.delete') }}</h3>
                </div>
                <div class="dialog-body">
                    <p>{{ t('adminTagMng.deleteConfirm') }}</p>
                </div>
                <div class="dialog-footer">
                    <button class="xc-button" @click="closeDeleteDialog">
                        {{ t('common.cancel') }}
                    </button>
                    <button class="xc-button danger" @click="btn_confirmDelete">
                        {{ t('adminTagMng.delete') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAppStore } from '../../stores/AppStore'
import { useI18n } from 'vue-i18n'
import util from '../../utils/util'
const appStore = useAppStore()
import * as Dty from '../../../../bridge/dataTypedef'

const { t } = useI18n()

onMounted(async () => {
    await util.tags_get(null)
})

const allTags = computed(() => {
    return appStore.tags
})
const selectedTagItem = ref<Dty.Tag | null>(null)
function selectTag(item: Dty.Tag): void {
    selectedTagItem.value = item
}

// Edit dialog
const isEditDialogVisible = ref(false)
const editingTag = ref<Dty.Tag>({ name: '', color: '', id: 0, description: '' })

function btn_showEditDialog(item: Dty.Tag): void {
    editingTag.value = { ...item }
    isEditDialogVisible.value = true
}

function closeEditDialog(): void {
    isEditDialogVisible.value = false
}

async function btn_saveTag(): Promise<void> {
    const req = new Dty.TagUpdateReq()
    req.id = editingTag.value.id
    req.name = editingTag.value.name
    req.color = editingTag.value.color
    req.description = editingTag.value.description
    await util.tag_update(req)
    closeEditDialog()
}

// Delete dialog
const isDeleteDialogVisible = ref(false)
const deletingTag = ref<Dty.Tag | null>(null)

function btn_deletetag(item: Dty.Tag): void {
    deletingTag.value = item
    isDeleteDialogVisible.value = true
}

function closeDeleteDialog(): void {
    isDeleteDialogVisible.value = false
    deletingTag.value = null
}

async function btn_confirmDelete(): Promise<void> {
    if (deletingTag.value && deletingTag.value.id) {
        await util.tag_delete(deletingTag.value.id)
    }
    closeDeleteDialog()
}

function tagNameShowMake(tagName: string): string {
    switch (tagName) {
        case 'sys_score1':
            return '1☆'
        case 'sys_score2':
            return '2☆'
        case 'sys_score3':
            return '3☆'
        case 'sys_score4':
            return '4☆'
        case 'sys_score5':
            return '5☆'
        case 'sys_score6':
            return '6☆'
        case 'sys_score7':
            return '7☆'
        case 'sys_score8':
            return '8☆'
        case 'sys_score9':
            return '9☆'
        case 'sys_score10':
            return '10☆'
        default:
            return tagName
    }
}
</script>

<style scoped>
.page-contianer {
    display: flex;
    height: 100%;
    width: 100%;
    padding: 0;
    margin: 0;
}

.table-content {
    flex: 1;
    overflow: auto;
}

.description-col {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.dialog-content {
    background-color: #252526;
    border-radius: 8px;
    min-width: 400px;
    max-width: 500px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dialog-small {
    min-width: 300px;
}

.dialog-header {
    padding: 16px 20px;
    border-bottom: 1px solid #3c3c3c;
}

.dialog-header h3 {
    margin: 0;
    color: #ccc;
    font-size: 16px;
}

.dialog-body {
    padding: 20px;
}

.dialog-body p {
    margin: 0;
    color: #ccc;
}

.dialog-footer {
    padding: 16px 20px;
    border-top: 1px solid #3c3c3c;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
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
    color: #ccc;
    font-size: 13px;
}

.form-group .xc-input {
    width: 100%;
    padding: 8px 12px;
    background-color: #3c3c3c;
    border: 1px solid #555;
    border-radius: 4px;
    color: #ccc;
    font-size: 13px;
    box-sizing: border-box;
}

.form-group .xc-input:focus {
    outline: none;
    border-color: #007acc;
}

.form-group .textarea {
    resize: vertical;
    min-height: 60px;
}

.color-input-group {
    display: flex;
    gap: 10px;
    align-items: center;
}

.color-picker {
    width: 40px;
    height: 32px;
    padding: 0;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
    background: transparent;
}

.color-input-group .xc-input {
    flex: 1;
}

.xc-button.primary {
    background-color: #007acc;
    color: #fff;
}

.xc-button.primary:hover {
    background-color: #0098ff;
}

.xc-button.danger {
    background-color: #c42b1c;
    color: #fff;
}

.xc-button.danger:hover {
    background-color: #e74c3c;
}
</style>
