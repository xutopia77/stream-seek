<template>
    <div class="thumbnail-management-container xc-scrollbar">
        <div class="toolbar">
            <button class="action-btn refresh-btn" @click="loadThumbnails">🔄 刷新</button>
            <button
                class="action-btn delete-btn"
                :disabled="selectedCount === 0"
                @click="deleteSelectedThumbnails"
            >
                🗑️ 删除选中 ({{ selectedCount }})
            </button>
            <div class="status-info">总共 {{ thumbnails.length }} 张缩略图</div>
        </div>

        <div class="thumbnail-grid">
            <div
                v-for="thumb in thumbnails"
                :key="thumb.path"
                class="thumbnail-card"
                :class="{ selected: thumb.selected }"
                @click="toggleSelection(thumb)"
            >
                <div class="thumbnail-wrapper">
                    <img :src="thumbUrlMake(thumb)" :alt="thumb.name" />
                    <div class="checkbox-overlay">
                        <span>{{ thumb.selected ? '✅' : '⬜' }}</span>
                    </div>
                </div>
                <div class="thumbnail-info">
                    <span class="thumbnail-name" :title="thumb.name">{{
                        formatThumbnailName(thumb.name)
                    }}</span>
                    <span class="thumbnail-time">{{ formatTime(thumb.name) }}</span>
                </div>
            </div>
        </div>

        <div v-if="loading" class="loading-overlay">
            <div class="loading-spinner">⏳ 加载中...</div>
        </div>

        <div v-if="!thumbnails.length && !loading" class="empty-state">暂无缩略图数据</div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import '@renderer/assets/common.css'
import { IpcApi } from '@renderer/utils/ipcApi'
import * as DataTypes from '../../../../bridge/dataTypedef'
import { useAppStore } from '@renderer/stores/AppStore'

const appStore = useAppStore()

// 定义缩略图对象的类型
interface Thumbnail {
    path: string
    name: string
    indexTime: number
    selected: boolean
}

// 响应式数据
const thumbnails = ref<Thumbnail[]>([])
const loading = ref<boolean>(false)

// 计算选中的缩略图数量
const selectedCount = computed(() => {
    return thumbnails.value.filter((thumb) => thumb.selected).length
})

// 格式化缩略图名称显示
function formatThumbnailName(name: string): string {
    if (!name) return ''
    // 截取文件名的前几位数字作为显示
    if (name.length > 14) {
        return `${name.substring(0, 8)}...${name.substring(name.length - 6)}`
    }
    return name
}

// 格式化时间显示
function formatTime(name: string): string {
    if (!name) return ''
    // 从文件名中提取时间信息
    const timeStr = name.replace(/\.\w+$/, '') // 移除扩展名
    if (timeStr.length >= 14) {
        const year = timeStr.slice(0, 4)
        const month = timeStr.slice(4, 6)
        const day = timeStr.slice(6, 8)
        const hour = timeStr.slice(8, 10)
        const minute = timeStr.slice(10, 12)
        const second = timeStr.slice(12, 14)
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`
    }
    return timeStr
}

// 生成缩略图URL
function thumbUrlMake(thumb: Thumbnail): string {
    // 使用当前选中的视频信息来生成缩略图URL
    if (!appStore.curSltVideo) {
        console.warn('未选中视频')
        return ''
    }

    // 注意：这里需要根据实际的后端API设计来调整
    // 目前假设后端支持根据视频名和缩略图时间戳获取缩略图
    return `http://localhost:58080/thumb_get?video=${encodeURIComponent(appStore.curSltVideo.name)}&thumb=${encodeURIComponent(thumb.path)}`
}

// 切换缩略图选中状态
function toggleSelection(thumb: Thumbnail): void {
    thumb.selected = !thumb.selected
}

// 加载缩略图
async function loadThumbnails(): Promise<void> {
    if (!appStore.curSltVideo) {
        console.warn('未选中视频，无法加载缩略图')
        return
    }

    loading.value = true
    try {
        // 这里需要从后端获取视频的缩略图列表
        // 由于现有API结构，我们可能需要创建新的IPC调用来获取缩略图列表
        const resp = await IpcApi.trigger_event<DataTypes.File, DataTypes.File>({
            cmd: DataTypes.CmdType.thumbGet,
            data: appStore.curSltVideo
        })

        if (resp.code === 0 && resp.data?.thumbnail?.path) {
            thumbnails.value = resp.data.thumbnail.path.map((path) => ({
                path,
                name: path,
                indexTime: DataTypes.FileTools.parse_timestr_2_seconds(path),
                selected: false
            }))
        } else {
            console.warn('未能获取缩略图列表:', resp.status)
            thumbnails.value = []
        }
    } catch (error) {
        console.error('加载缩略图失败:', error)
        thumbnails.value = []
    } finally {
        loading.value = false
    }
}

// 删除选中的缩略图
async function deleteSelectedThumbnails(): Promise<void> {
    if (selectedCount.value === 0) return

    const selectedThumbs = thumbnails.value.filter((thumb) => thumb.selected)
    if (!confirm(`确定要删除选中的 ${selectedThumbs.length} 张缩略图吗？`)) {
        return
    }

    loading.value = true
    try {
        // 这里需要实现删除缩略图的后端调用
        // 可能需要一个新的IPC调用
        for (const thumb of selectedThumbs) {
            // 实现删除逻辑 - 这里需要后端API支持
            console.log('删除缩略图:', thumb.path)
        }

        // 从列表中移除已删除的缩略图
        thumbnails.value = thumbnails.value.filter((thumb) => !thumb.selected)

        alert(`成功删除 ${selectedThumbs.length} 张缩略图`)
    } catch (error) {
        console.error('删除缩略图失败:', error)
        alert('删除缩略图失败: ' + error)
    } finally {
        loading.value = false
    }
}

// 组件挂载时加载缩略图
onMounted(() => {
    loadThumbnails()
})

// 监听当前选中视频的变化
// 注意：这需要根据实际的store实现来调整
</script>

<style scoped>
.thumbnail-management-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    overflow: hidden;
}

.toolbar {
    display: flex;
    align-items: center;
    padding: 10px;
    background-color: var(--xc-header-bg-color);
    border-bottom: 1px solid var(--xc-border-color);
    gap: 10px;
}

.action-btn {
    padding: 6px 12px;
    border: 1px solid var(--xc-border-color);
    background-color: var(--xc-button-bg-color);
    color: var(--xc-text-color);
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.action-btn:hover:not(:disabled) {
    background-color: var(--xc-hover-bg-color);
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.delete-btn {
    background-color: #dc3545;
    color: white;
}

.delete-btn:hover:not(:disabled) {
    background-color: #c82333;
}

.refresh-btn {
    background-color: #28a745;
    color: white;
}

.refresh-btn:hover {
    background-color: #218838;
}

.status-info {
    margin-left: auto;
    font-size: 14px;
    color: var(--xc-text-color);
}

.thumbnail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
    padding: 10px;
    flex: 1;
    overflow-y: auto;
}

.thumbnail-card {
    border: 2px solid transparent;
    border-radius: 8px;
    overflow: hidden;
    background-color: var(--xc-panel-bg-color);
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
}

.thumbnail-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.thumbnail-card.selected {
    border-color: #007bff;
    background-color: rgba(0, 123, 255, 0.1);
}

.thumbnail-wrapper {
    position: relative;
    width: 100%;
    padding-top: 100%; /* 1:1 aspect ratio */
}

.thumbnail-wrapper img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px 6px 0 0;
}

.checkbox-overlay {
    position: absolute;
    top: 4px;
    right: 4px;
    background-color: rgba(0, 0, 0, 0.6);
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 12px;
}

.thumbnail-info {
    padding: 5px;
    text-align: center;
    font-size: 12px;
}

.thumbnail-name {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
}

.thumbnail-time {
    display: block;
    color: var(--xc-secondary-text-color);
    font-size: 10px;
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
}

.loading-spinner {
    color: white;
    font-size: 18px;
}

.empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    color: var(--xc-secondary-text-color);
    font-size: 16px;
}
</style>
