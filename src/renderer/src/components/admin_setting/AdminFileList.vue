<template>
    <div class="file-list-page">
        <div class="page-header">
            <h2 class="xc-text">{{ t('fileList.title') }}</h2>
            <router-link to="/admin" class="no-underline-link">
                <button class="xc-button">{{ t('fileList.backToAdmin') }}</button>
            </router-link>
        </div>

        <div class="project-info" v-if="appStore.prj">
            <span class="xc-text">{{ t('fileList.projectName') }}: {{ appStore.prj.name }}</span>
            <span class="xc-text">{{ t('fileList.totalFiles') }}: {{ appStore.videoTotalNum }}</span>
        </div>

        <div class="file-list-container xc-scrollbar">
            <table class="file-table" ref="tableRef">
                <thead>
                    <tr>
                        <th
                            v-for="(col, index) in columns"
                            :key="col.key"
                            class="xc-text resizable-th"
                            :class="{ sortable: col.sortable }"
                            :style="{ width: col.width + 'px', minWidth: col.width + 'px' }"
                            @click="col.sortable && handleSort(col.key)"
                        >
                            <div class="th-content">
                                <span>{{ col.label }}</span>
                                <span v-if="col.sortable" class="sort-icon">
                                    <span v-if="sortState.key === col.key" class="active">
                                        {{ sortState.order === 'asc' ? '▲' : '▼' }}
                                    </span>
                                    <span v-else class="inactive">⇅</span>
                                </span>
                            </div>
                            <div
                                v-if="index < columns.length - 1"
                                class="resize-handle"
                                @mousedown="startResize($event, index)"
                                @click.stop
                            ></div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(file, index) in sortedFileList" :key="file.path" :class="{ 'trash-mode': isTrashMode }">
                        <td class="xc-text">{{ (appStore.fileSearchPage - 1) * appStore.fileSearchPageSize + index + 1 }}</td>
                        <td class="xc-text">{{ file.name }}</td>
                        <td class="xc-text">{{ formatTime(file.startTimeSec) }}</td>
                        <td class="xc-text">{{ formatTime(file.endTimeSec) }}</td>
                        <td class="xc-text">{{ formatDuration(file.duration) }}</td>
                        <td class="xc-text">{{ formatFileSize(file.size) }}</td>
                        <td class="xc-text">{{ formatBitRate(file.mediaInfo?.bit_rate) }}</td>
                        <td class="xc-text">{{ getStatusText(file.status) }}</td>
                        <td class="xc-text file-path">{{ file.path }}</td>
                    </tr>
                    <tr v-if="sortedFileList.length === 0">
                        <td colspan="9" class="xc-text empty-hint">{{ t('fileList.noFiles') }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <PaginationCtrl page-type="video" :compact="true" />
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import { useAppStore } from '@renderer/stores/AppStore'
import { useI18n } from 'vue-i18n'
import PaginationCtrl from '@renderer/components/common/paginationCtrl.vue'
import * as Dty from '../../../../bridge/dataTypedef'
import util from '@renderer/utils/util'
import '@renderer/assets/common.css'

const appStore = useAppStore()
const { t } = useI18n()
const tableRef = ref<HTMLTableElement | null>(null)

const columns = reactive([
    { key: 'index', label: t('fileList.columnIndex'), width: 60, sortable: false },
    { key: 'name', label: t('fileList.columnName'), width: 150, sortable: true },
    { key: 'startTime', label: t('fileList.columnStartTime'), width: 150, sortable: true },
    { key: 'endTime', label: t('fileList.columnEndTime'), width: 150, sortable: true },
    { key: 'duration', label: t('fileList.columnDuration'), width: 100, sortable: true },
    { key: 'size', label: t('fileList.columnSize'), width: 100, sortable: true },
    { key: 'bitrate', label: t('fileList.columnBitrate'), width: 100, sortable: true },
    { key: 'status', label: t('fileList.columnStatus'), width: 100, sortable: true },
    { key: 'path', label: t('fileList.columnPath'), width: 300, sortable: true }
])

const isTrashMode = computed(() => appStore.fileSearchStatus === Dty.Fstatus.Deleted)

const sortState = reactive<{
    key: string | null
    order: 'asc' | 'desc'
}>({
    key: null,
    order: 'asc'
})

const handleSort = (key: string): void => {
    if (sortState.key === key) {
        sortState.order = sortState.order === 'asc' ? 'desc' : 'asc'
    } else {
        sortState.key = key
        sortState.order = 'asc'
    }
}

const sortedFileList = computed((): Dty.File[] => {
    const list = [...appStore.videoList]
    if (!sortState.key) return list

    const key = sortState.key
    const order = sortState.order

    return list.sort((a, b) => {
        let valueA: string | number = ''
        let valueB: string | number = ''

        switch (key) {
            case 'name':
                valueA = a.name.toLowerCase()
                valueB = b.name.toLowerCase()
                break
            case 'startTime':
                valueA = a.startTimeSec
                valueB = b.startTimeSec
                break
            case 'endTime':
                valueA = a.endTimeSec
                valueB = b.endTimeSec
                break
            case 'path':
                valueA = a.path.toLowerCase()
                valueB = b.path.toLowerCase()
                break
            case 'size':
                valueA = a.size
                valueB = b.size
                break
            case 'duration':
                valueA = a.duration
                valueB = b.duration
                break
            case 'bitrate':
                valueA = a.mediaInfo?.bit_rate || 0
                valueB = b.mediaInfo?.bit_rate || 0
                break
            case 'status':
                valueA = a.status
                valueB = b.status
                break
            default:
                return 0
        }

        if (typeof valueA === 'string' && typeof valueB === 'string') {
            return order === 'asc'
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA)
        }

        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return order === 'asc' ? valueA - valueB : valueB - valueA
        }

        return 0
    })
})

const resizing = ref<{
    index: number
    startX: number
    startWidth: number
} | null>(null)

const startResize = (event: MouseEvent, index: number): void => {
    event.preventDefault()
    resizing.value = {
        index,
        startX: event.clientX,
        startWidth: columns[index].width
    }
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', stopResize)
}

const onResize = (event: MouseEvent): void => {
    if (!resizing.value) return
    const diff = event.clientX - resizing.value.startX
    const newWidth = Math.max(50, resizing.value.startWidth + diff)
    columns[resizing.value.index].width = newWidth
}

const stopResize = (): void => {
    resizing.value = null
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
}

onMounted(async (): Promise<void> => {
    if (appStore.prj) {
        const searchReq = new Dty.FilesReq()
        searchReq.status = [appStore.fileSearchStatus]
        await util.files_get(searchReq)
    }
})

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTime = (seconds: number): string => {
    if (!seconds) return '-'
    const date = new Date(seconds * 1000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    const second = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

const formatDuration = (seconds: number): string => {
    if (!seconds) return '00:00:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const formatBitRate = (bitRate: number | undefined): string => {
    if (!bitRate) return '-'
    if (bitRate >= 1000000) {
        return (bitRate / 1000000).toFixed(2) + ' Mbps'
    } else if (bitRate >= 1000) {
        return (bitRate / 1000).toFixed(2) + ' Kbps'
    }
    return bitRate + ' bps'
}

const getStatusText = (status: Dty.Fstatus): string => {
    switch (status) {
        case Dty.Fstatus.Normal:
            return t('fileList.statusNormal')
        case Dty.Fstatus.Deleted:
            return t('fileList.statusDeleted')
        case Dty.Fstatus.Destroy:
            return t('fileList.statusDestroyed')
        default:
            return t('fileList.statusUnknown')
    }
}
</script>

<style scoped>
.file-list-page {
    display: flex;
    flex-direction: column;
    height: calc(100% - var(--xc-home-nac-height));
    width: 100%;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    border-bottom: 1px solid #333;
}

.page-header h2 {
    margin: 0;
}

.project-info {
    display: flex;
    gap: 20px;
    padding: 8px 20px;
    background-color: #252526;
    border-bottom: 1px solid #333;
}

.file-list-container {
    flex: 1;
    overflow-y: auto;
    padding: 0 20px;
}

.file-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
}

.file-table th,
.file-table td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.resizable-th {
    background-color: #2d2d30;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 1;
    user-select: none;
    border-right: 1px solid #444;
}

.resizable-th:last-child {
    border-right: none;
}

.resizable-th.sortable {
    cursor: pointer;
}

.resizable-th.sortable:hover {
    background-color: #3c3c41;
}

.th-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
}

.sort-icon {
    font-size: 12px;
    margin-left: 4px;
}

.sort-icon .active {
    color: #007fd4;
}

.sort-icon .inactive {
    color: #666;
}

.resizable-th.sortable:hover .sort-icon .inactive {
    color: #999;
}

.resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    cursor: col-resize;
    background-color: transparent;
    z-index: 2;
}

.resize-handle:hover {
    background-color: #007fd4;
}

.file-table tr:hover {
    background-color: #2a2d2e;
}

.file-table tr.trash-mode td {
    color: #888888;
}

.file-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.empty-hint {
    text-align: center;
    padding: 40px;
    color: #888;
}

.no-underline-link {
    text-decoration: none;
}
</style>
