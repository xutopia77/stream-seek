<template>
  <div class="toast-container">
    <div
      v-for="(toast, index) in toasts"
      :key="index"
      class="toast"
      :style="{ backgroundColor: getToastColor(toast.type) }"
    >
      {{ toast.message }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'

// 定义 toast 的类型接口
interface Toast {
  message: string
  type: 'info' | 'error' | 'debug' | 'success'
}

// 定义 toasts 的类型为 Toast 类型的数组
const toasts = ref<Toast[]>([])

// 定义 addToast 函数的参数和返回值类型
const addToast = (
  message: string,
  type: 'info' | 'error' | 'debug' | 'success' = 'success',
  duration: number = 3000
): void => {
  const newToast: Toast = { message, type }
  toasts.value.push(newToast)

  setTimeout(() => {
    const index = toasts.value.indexOf(newToast)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }, duration)
}

// 封装不同类型的消息提醒接口
const toastTypes = {
  info: '#2196F3',
  error: '#F44336',
  debug: '#FFC107',
  success: '#4CAF50'
} as const

// 定义 getToastColor 函数的参数和返回值类型
const getToastColor = (type: 'info' | 'error' | 'debug' | 'success'): string => {
  return toastTypes[type] || toastTypes.success
}

// 定义不同类型的 toast 函数的参数和返回值类型
const toastInfo = (message: string, duration: number = 3000): void =>
  addToast(message, 'info', duration)
const toastError = (message: string, duration: number = 3000): void =>
  addToast(message, 'error', duration)
const toastDebug = (message: string, duration: number = 3000): void =>
  addToast(message, 'debug', duration)
const toastSuccess = (message: string, duration: number = 3000): void =>
  addToast(message, 'success', duration)

// 定义 window.$toast 的类型
interface ToastInterface {
  info: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  debug: (message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
}

;(window as any).$toast = {
  info: toastInfo,
  error: toastError,
  debug: toastDebug,
  success: toastSuccess
} as ToastInterface

onMounted(() => {
  // 可以在这里添加一些初始化逻辑
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.toast {
  padding: 12px 16px;
  margin-top: 8px;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
    'Helvetica Neue', sans-serif;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  max-width: 300px;
  text-align: center;
  transition: opacity 0.3s ease;
}

.toast.fade-out {
  opacity: 0;
}
</style>
