<template>
  <transition name="my-message-fade" @before-leave="onClose" @after-leave="$emit('destroy')">
    <div
      v-show="visible"
      ref="messageRef"
      :class="[
        'my-message',
        { ['my-message-' + type]: type },
        { 'my-message-center': center },
        { 'my-message-closable': showClose },
        { 'my-message-plain': plain },
        customClass
      ]"
      :style="customStyle"
      role="alert"
      @mouseenter="clearTimer"
      @mouseleave="startTimer"
    >
      <span v-if="repeatNum > 1" class="my-message-badge">{{ repeatNum }}</span>
      <i v-if="iconComponent" :class="[iconClass]"></i>
      <p v-if="!dangerouslyUseHTMLString" class="my-message-content">
        {{ message }}
      </p>
      <p v-else class="my-message-content" v-html="message" />
      <i v-if="showClose" class="my-message-close-btn" @click.stop="close"></i>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps({
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'info'
  },
  duration: {
    type: Number,
    default: 3000
  },
  showClose: {
    type: Boolean,
    default: false
  },
  center: {
    type: Boolean,
    default: false
  },
  plain: {
    type: Boolean,
    default: false
  },
  dangerouslyUseHTMLString: {
    type: Boolean,
    default: false
  },
  customClass: {
    type: String,
    default: ''
  },
  customStyle: {
    type: Object,
    default: () => ({})
  },
  repeatNum: {
    type: Number,
    default: 1
  }
})

const visible = ref(true)
const messageRef = ref(null)
let timer = null

const iconMap = {
  success: 'my-message-icon-success',
  warning: 'my-message-icon-warning',
  info: 'my-message-icon-info',
  error: 'my-message-icon-error'
}

const iconComponent = computed(() => {
  return iconMap[props.type]
})

const iconClass = computed(() => {
  return `my-message-icon ${iconComponent.value}`
})

const onClose = (): void => {
  visible.value = false
}

const close = (): void => {
  onClose()
}

const clearTimer = (): void => {
  if (timer) {
    clearTimeout(timer)
  }
}

const startTimer = (): void => {
  if (props.duration > 0) {
    setTimeout(() => {
      onClose()
    }, props.duration)
  }
}

onMounted(() => {
  startTimer()
})

watch(
  () => props.repeatNum,
  () => {
    clearTimer()
    startTimer()
  }
)
</script>

<style scoped>
/* 基本样式 */
.my-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  z-index: 9999;
}

/* 不同类型的样式 */
.my-message-success {
  background-color: #f0f9eb;
  color: #67c23a;
}

.my-message-warning {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.my-message-info {
  background-color: #edf2fc;
  color: #909399;
}

.my-message-error {
  background-color: #fef0f0;
  color: #f56c6c;
}

/* 居中样式 */
.my-message-center {
  text-align: center;
}

/* 可关闭样式 */
.my-message-closable {
  padding-right: 30px;
}

/* 简洁样式 */
.my-message-plain {
  background-color: transparent;
  box-shadow: none;
}

/* 徽章样式 */
.my-message-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #ff0000;
  color: #fff;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  font-size: 12px;
  text-align: center;
  line-height: 16px;
}

/* 图标样式 */
.my-message-icon {
  margin-right: 8px;
}

.my-message-icon-success::before {
  content: '✔';
}

.my-message-icon-warning::before {
  content: '⚠';
}

.my-message-icon-info::before {
  content: 'ℹ';
}

.my-message-icon-error::before {
  content: '✖';
}

/* 关闭按钮样式 */
.my-message-close-btn {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  cursor: pointer;
}

.my-message-close-btn::before {
  content: '×';
}

/* 动画样式 */
.my-message-fade-enter-active,
.my-message-fade-leave-active {
  transition: opacity 0.3s;
}

.my-message-fade-enter,
.my-message-fade-leave-to {
  opacity: 0;
}
</style>
