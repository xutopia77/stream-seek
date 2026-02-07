<template>
    <div class="thumbnail-management-container xc-scrollbar">
        <div class="layout-container">
            <!-- 左侧：缩略图预览区域 -->
            <div class="left-panel">
                <div class="panel-header">
                    <h3>缩略图预览</h3>
                    <div class="controls">
                        <button @click="refreshThumbnails" class="action-btn refresh-btn">🔄 刷新</button>
                        <button @click="deleteSelectedThumbnails" class="action-btn delete-btn" :disabled="selectedThumbnails.length === 0">
                            🗑️ 删除选中 ({{ selectedThumbnails.length }})
                        </button>
                    </div>
                </div>
                
                <div class="thumbnail-grid">
                    <div 
                        v-for="thumb in currentThumbnails" 
                        :key="thumb.path" 
                        class="thumbnail-card"
                        :class="{ 'selected': isSelected(thumb) }"
                        @click="toggleSelection(thumb)"
                    >
                        <div class="thumbnail-wrapper">
                            <img :src="thumbUrlMake(thumb.path)" :alt="thumb.name" />
                            <div class="checkbox-overlay">
                                <span>{{ isSelected(thumb) ? '✅' : '⬜' }}</span>
                            </div>
                        </div>
                        <div class="thumbnail-info">
                            <span class="thumbnail-name" :title="thumb.name">{{ formatTime(thumb.name) }}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 右侧：文件列表区域 -->
            <div class="right-panel">
                <div class="panel-header">
                    <h3>文件列表</h3>
                    <div class="file-count">
                        共 {{ fileList.length }} 个文件
                    </div>
                </div>
                
                <div class="file-list">
                    <div 
                        v-for="file in fileList" 
                        :key="file.id" 
                        class="file-item"
                        :class="{ 'selected': currentFile?.id === file.id }"
                        @click="selectFile(file)"
                    >
                        <div class="file-info">
                            <span class="file-name" :title="file.name">{{ file.name }}</span>
                            <span class="file-duration">{{ formatDuration(file.duration) }}</span>
                        </div>
                        <div class="file-stats">
                            <span class="thumbnail-count">缩略图: {{ file.thumbnail?.path?.length || 0 }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div v-if="loading" class="loading-overlay">
            <div class="loading-spinner">⏳ 加载中...</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import '@renderer/assets/common.css'
import util from '@renderer/utils/util'
import * as DataTypes from '../../../../bridge/dataTypedef'
import { useAppStore } from '@renderer/stores/AppStore'

const appStore = useAppStore()

// 响应式数据
const fileList = ref<DataTypes.File[]>([])
const currentThumbnails = ref<DataTypes.ThumbnailInfo[]>([])
const selectedThumbnails = ref<DataTypes.ThumbnailInfo[]>([])
const currentFile = ref<DataTypes.File | null>(null)
const loading = ref<boolean>(false)

// 根据当前选中的文件更新缩略图列表
function updateCurrentThumbnails(): void {
    if (currentFile.value && currentFile.value.thumbnail?.path) {
        currentThumbnails.value = currentFile.value.thumbnail.path.map(path => ({
            path,
            name: path,
            indexTime: DataTypes.FileTools.parse_timestr_2_seconds(path)
        }))
    } else {
        currentThumbnails.value = []
    }
}

// 生成缩略图URL
function thumbUrlMake(thumbPath: string): string {
    if (!currentFile.value) {
        console.warn('未选中文件')
        return ''
    }
    return `http://localhost:58080/thumb_get?video=${encodeURIComponent(currentFile.value.name)}&thumb=${encodeURIComponent(thumbPath)}`
}

// 切换缩略图选中状态
function toggleSelection(thumb: DataTypes.ThumbnailInfo): void {
    const index = selectedThumbnails.value.findIndex(t => t.path === thumb.path)
    if (index > -1) {
        selectedThumbnails.value.splice(index, 1)
    } else {
        selectedThumbnails.value.push(thumb)
    }
}

// 检查缩略图是否被选中
function isSelected(thumb: DataTypes.ThumbnailInfo): boolean {
    return selectedThumbnails.value.some(t => t.path === thumb.path)
}

// 选中文件
function selectFile(file: DataTypes.File): void {
    currentFile.value = file
    updateCurrentThumbnails()
    selectedThumbnails.value = [] // 清空选中项
}

// 格式化时间显示
function formatTime(name: string): string {
    if (!name) return ''
    const timeStr = name.replace(/\.\w+$/, '') // 移除扩展名
    if (timeStr.length >= 14) {
        const year = timeStr.slice(0, 4)
        const month = timeStr.slice(4, 6)
        const day = timeStr.slice(6, 8)
        const hour = timeStr.slice(8, 10)
        const minute = timeStr.slice(10, 12)
        const second = timeStr.slice(12, 14)
        return `${hour}:${minute}:${second}`
    }
    return timeStr
}

// 格式化时长显示
function formatDuration(duration: number): string {
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = Math.floor(duration % 60)
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// 刷新缩略图
async function refreshThumbnails(): Promise<void> {
    loading.value = true
    try {
        // 使用util.thumbGet()获取缩略图文件列表
        const resp = await util.thumbGet()
        if (resp.code === 0 && resp.data?.files) {
            fileList.value = resp.data.files
            
            // 更新appStore.thumbList.thumbnail
            appStore.thumbList = resp.data.files
            
            // 如果当前没有选中文件且列表不为空，选择第一个文件
            if (!currentFile.value && fileList.value.length > 0) {
                selectFile(fileList.value[0])
            }
        } else {
            console.warn('获取文件列表失败:', resp.status)
            fileList.value = []
        }
    } catch (error) {
        console.error('刷新缩略图失败:', error)
        fileList.value = []
    } finally {
        loading.value = false
    }
}

// 删除选中的缩略图
async function deleteSelectedThumbnails(): Promise<void> {
    if (selectedThumbnails.value.length === 0 || !currentFile.value) return
    
    if (!confirm(`确定要删除选中的 ${selectedThumbnails.value.length} 张缩略图吗？`)) {
        return
    }
    
    loading.value = true
    try {
        // TODO: 实现删除缩略图的后端调用
        console.log('删除缩略图:', selectedThumbnails.value)
        
        // 从当前文件的缩略图列表中移除
        if (currentFile.value.thumbnail?.path) {
            const pathsToRemove = selectedThumbnails.value.map(t => t.path)
            currentFile.value.thumbnail.path = currentFile.value.thumbnail.path.filter(
                path => !pathsToRemove.includes(path)
            )
            
            // 更新缩略图列表
            updateCurrentThumbnails()
        }
        
        // 清空选中项
        selectedThumbnails.value = []
        
        alert(`成功删除 ${selectedThumbnails.value.length} 张缩略图`)
    } catch (error) {
        console.error('删除缩略图失败:', error)
        alert('删除缩略图失败: ' + error)
    } finally {
        loading.value = false
    }
}

// 初始化数据
onMounted(async () => {
    await refreshThumbnails()
})

// 监听appStore.thumbList的变化
watch(
    () => appStore.thumbList,
    (newList) => {
        fileList.value = newList
        if (!currentFile.value && newList.length > 0) {
            selectFile(newList[0])
        }
    },
    { deep: true }
)
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