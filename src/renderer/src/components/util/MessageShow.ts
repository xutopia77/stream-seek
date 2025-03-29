import { createApp, h } from 'vue'
import MyMessage from './MessageShow.vue'

const MyMessageFn = (options: {
  message: string
  type?: string
  duration?: number
  [key: string]: any
}) => {
  const { message, type = 'info', duration = 3000, ...rest } = options
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

MyMessageFn.success = (options: string | { message: string; [key: string]: any }) => {
  const opt = typeof options === 'string' ? { message: options } : options
  return MyMessageFn({ ...opt, type: 'success' })
}

MyMessageFn.warning = (options: string | { message: string; [key: string]: any }) => {
  const opt = typeof options === 'string' ? { message: options } : options
  return MyMessageFn({ ...opt, type: 'warning' })
}

MyMessageFn.info = (options: string | { message: string; [key: string]: any }) => {
  const opt = typeof options === 'string' ? { message: options } : options
  return MyMessageFn({ ...opt, type: 'info' })
}

MyMessageFn.error = (options: string | { message: string; [key: string]: any }) => {
  const opt = typeof options === 'string' ? { message: options } : options
  return MyMessageFn({ ...opt, type: 'error' })
}

export default MyMessageFn
