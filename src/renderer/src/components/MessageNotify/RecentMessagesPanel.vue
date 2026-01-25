<template>
    <div v-if="visible" class="global-message-panel" @click.stop>
        <div class="panel-header">
            <p>最近消息</p>
            <button class="clear-button" @click="btn_clear_all_msg">清空所有</button>
            <button class="clear-button" @click="appStore.bPageResentMsg = false">关闭</button>
        </div>
        <div class="message-list">
            <div
                v-for="message in recentMessages"
                :key="message.id"
                class="message-item"
                :class="message.type"
            >
                <span class="message-icon">{{ getIcon(message.type) }}</span>
                <div class="message-content">
                    <span class="message-text">{{ message.message }}</span>
                    <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                </div>
            </div>
            <div v-if="recentMessages.length === 0" class="no-messages">暂无消息</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Utils from '@renderer/utils/util'
import { useAppStore } from '@renderer/stores/AppStore'
const appStore = useAppStore()
import * as DatType from '../../../../bridge/dataTypedef'
const visible = computed(() => appStore.bPageResentMsg)

// 计算最近5条消息（从历史消息中获取）
const recentMessages = computed(() => {
    if (appStore.historyToasts == null) {
        return []
    }
    return appStore.historyToasts.slice(-5).reverse()
})

// 清空所有历史消息
function btn_clear_all_msg(): void {
    Utils.clearHistoryToasts()
}

// 获取消息图标
const getIcon = (type: DatType.MessageShowType): string => {
    switch (type) {
        case 'success':
            return '✅'
        case 'error':
            return '❌'
        case 'warning':
            return '⚠️'
        case 'info':
            return 'ℹ️'
        default:
            return 'ℹ️'
    }
}

// 格式化时间
const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时前`

    const days = Math.floor(hours / 24)
    return `${days}天前`
}
</script>

<style scoped>
.global-message-panel {
    position: fixed;
    top: 70px;
    right: 20px;
    width: 350px;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px;
    border-bottom: 1px solid #eee;
}

.panel-header p {
    margin: 0;
    color: #333;
}

.clear-button {
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 12px;
}

.clear-button:hover {
    background-color: #5a6268;
}

.message-list {
    max-height: 300px;
    overflow-y: auto;
}

.message-item {
    display: flex;
    padding: 3px 5px;
    border-bottom: 1px solid #f0f0f0;
}

.message-item:last-child {
    border-bottom: none;
}

.message-item.success {
    border-left: 4px solid #28a745;
}

.message-item.error {
    border-left: 4px solid #dc3545;
}

.message-item.warning {
    border-left: 4px solid #ffc107;
}

.message-item.info {
    border-left: 4px solid #17a2b8;
}

.message-icon {
    font-size: small;
    margin-right: 2px;
    flex-shrink: 0;
}

.message-content {
    flex: 1;
    font-size: small;
}

.message-text {
    display: block;
    margin-bottom: 5px;
    color: #333;
}

.message-time {
    font-size: small;
    color: #999;
}

.no-messages {
    padding: 30px;
    text-align: center;
    color: #999;
}
</style>
