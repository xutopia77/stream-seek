import { createApp, h } from 'vue'
import MyMessage from './MessageShow.vue'
import type { MessageProps } from './MessageShow.vue'

// 创建一个全局的消息容器
const messageContainer = document.createElement('div')
messageContainer.style.position = 'fixed'
messageContainer.style.top = '20px'
messageContainer.style.left = '50%'
messageContainer.style.transform = 'translateX(-50%)'
messageContainer.style.zIndex = '9999'
document.body.appendChild(messageContainer)

// 记录当前消息的数量
let messageCount = 0;

const MessageShow = (options: MessageProps): void => {
  const { message, type = 'info', duration = 2000, ...rest } = options
  const container = document.createElement('div')
  const app = createApp({
    render: () =>
      h(MyMessage, {
        message,
        type,
        duration,
        ...rest,
        onDestroy: () => {
          app.unmount()
          container.remove()
          messageCount--;
          // 重新计算剩余消息的位置
          const messages = messageContainer.children;
          for (let i = 0; i < messages.length; i++) {
            messages[i].style.top = `${i * (parseInt(getComputedStyle(messages[i]).height) + 10)}px`;
          }
        }
      })
  })
  app.mount(container)
  // 设置每个消息的位置
  container.style.top = `${messageCount * (30 + 10)}px`; // 30 是消息的大致高度，10 是间距
  messageContainer.appendChild(container)
  messageCount++;
}

MessageShow.success = (options: string | MessageProps): void => {
  const opt = typeof options === 'string' ? { message: options } : options
  return MessageShow({ ...opt, type: 'success' })
}

MessageShow.warning = (options: string | MessageProps): void => {
  const opt = typeof options === 'string' ? { message: options } : options
  return MessageShow({ ...opt, type: 'warning' })
}

MessageShow.info = (options: string | MessageProps): void => {
  const opt = typeof options === 'string' ? { message: options } : options
  return MessageShow({ ...opt, type: 'info' })
}

MessageShow.error = (options: string | MessageProps): void => {
  const opt = typeof options === 'string' ? { message: options } : options
  return MessageShow({ ...opt, type: 'error' })
}

export default MessageShow
