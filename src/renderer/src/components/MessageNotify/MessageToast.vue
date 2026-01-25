<template>
    <div class="toast-container">
        <transition-group name="toast" tag="div">
            <div v-for="toast in appStore.toasts" :key="toast.id" class="toast" :class="toast.type">
                <span class="toast-icon">{{ getIcon(toast.type) }}</span>
                <span class="toast-message">{{ toast.message }}</span>
            </div>
        </transition-group>
    </div>
</template>

<script setup lang="ts">
// import Utils from '@renderer/utils/util'
import { useAppStore } from '@renderer/stores/AppStore'
const appStore = useAppStore()
import * as DatType from '../../../../bridge/dataTypedef'

// 获取图标
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
</script>

<style scoped>
.toast-container {
    position: fixed;
    top: 32px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.toast {
    display: flex;
    align-items: center;
    padding: 3px 5px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 14px;
    font-weight: 500;
    min-width: 250px;
    backdrop-filter: blur(10px);
    animation-duration: 0.3s;
}

.toast.success {
    background-color: rgba(40, 167, 69, 0.9);
    color: white;
    border: 1px solid rgba(40, 167, 69, 0.5);
}

.toast.error {
    background-color: rgba(220, 53, 69, 0.9);
    color: white;
    border: 1px solid rgba(220, 53, 69, 0.5);
}

.toast.warning {
    background-color: rgba(255, 193, 7, 0.9);
    color: #212529;
    border: 1px solid rgba(255, 193, 7, 0.5);
}

.toast.info {
    background-color: rgba(23, 162, 184, 0.9);
    color: white;
    border: 1px solid rgba(23, 162, 184, 0.5);
}

.toast-icon {
    margin-right: 2px;
    font-size: small;
}

/* 进入和离开动画 */
.toast-enter-active {
    animation: toast-in 0.3s ease-out forwards;
}

.toast-leave-active {
    animation: toast-out 0.3s ease-in forwards;
}

@keyframes toast-in {
    0% {
        transform: translateX(100%);
        opacity: 0;
    }

    100% {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes toast-out {
    0% {
        transform: translateX(0);
        opacity: 1;
    }

    100% {
        transform: translateX(100%);
        opacity: 0;
    }
}
</style>
