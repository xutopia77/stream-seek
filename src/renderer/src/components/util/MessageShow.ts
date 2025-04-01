import { createApp, h } from 'vue'
import MyMessage from './MessageShow.vue'
import type { MessageProps } from './MessageShow.vue'

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
        }
      })
  })
  app.mount(container)
  document.body.appendChild(container)
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
