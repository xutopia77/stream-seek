import { createApp, h } from 'vue'
import MyMessage from './MessageShow.vue'

const MyMessageFn = (options: any) => {
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

const types = ['success', 'warning', 'info', 'error']
types.forEach((type) => {
  MyMessageFn[type] = (options: any) => {
    if (typeof options === 'string') {
      options = { message: options }
    }
    return MyMessageFn({ ...options, type })
  }
})

// 确保正确导出
export default MyMessageFn
