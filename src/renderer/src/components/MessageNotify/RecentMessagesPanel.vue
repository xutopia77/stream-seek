<template>
    <div v-if="visible" class="global-message-panel" @click.stop>
        <div class="panel-header">
            <h3 class="panel-title">最近消息</h3>
            <div class="header-actions">
                <button class="xc-button small danger" @click="btn_clear_all_msg">清空所有</button>
                <button class="xc-button small primary" @click="appStore.bPageResentMsg = false">
                    关闭
                </button>
            </div>
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
    top: 40px;
    right: 20px;
    width: 350px;
    background-color: var(--bg-color, #2d2d2d);
    border: 1px solid var(--border-color, #444);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    color: var(--text-color, #ffffff);
    font-family: var(--font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px; /* 减少内边距 */
    border-bottom: 1px solid var(--border-color, #444);
    background-color: var(--header-bg-color, #3c3c3c);
    border-radius: 8px 8px 0 0;
}

.panel-title {
    margin: 0;
    font-size: 13px; /* 减小字体大小 */
    font-weight: 600;
    color: var(--text-color, #ffffff);
}

.header-actions {
    display: flex;
    gap: 6px; /* 减少按钮间距 */
}

.message-list {
    max-height: 300px;
    overflow-y: auto;
    padding: 3px 0; /* 减少内边距 */
}

.message-item {
    display: flex;
    padding: 6px 12px; /* 减少内边距 */
    border-bottom: 1px solid var(--border-color, #444);
    transition: background-color 0.2s ease;
    min-height: auto; /* 确保高度由内容决定 */
}

.message-item:hover {
    background-color: var(--hover-bg, #3a3a3a);
}

.message-item:last-child {
    border-bottom: none;
}

.message-item.success {
    border-left: 4px solid var(--success-color, #28a745);
}

.message-item.error {
    border-left: 4px solid var(--error-color, #dc3545);
}

.message-item.warning {
    border-left: 4px solid var(--warning-color, #ffc107);
    color: var(--warning-text, #e0a800);
}

.message-item.info {
    border-left: 4px solid var(--info-color, #17a2b8);
}

.message-icon {
    font-size: 14px; /* 减小图标大小 */
    margin-right: 8px; /* 减少右边距 */
    flex-shrink: 0;
    display: flex;
    align-items: center;
}

.message-content {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.message-text {
    display: block;
    margin-bottom: 3px; /* 减少底部边距 */
    color: var(--text-color, #ffffff);
    word-break: break-word;
    font-size: 12px; /* 减小字体大小 */
}

.message-time {
    font-size: 10px; /* 减小时间标签字体大小 */
    color: var(--muted-text-color, #aaa);
    align-self: flex-end;
}

.no-messages {
    padding: 20px 12px; /* 减少内边距 */
    text-align: center;
    color: var(--muted-text-color, #aaa);
    font-style: italic;
    font-size: 12px; /* 减小字体大小 */
}
</style>
