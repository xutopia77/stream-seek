export class IpcApi {
  async trigger_event(reqStr) {
    // console.log(`Arguments: ${reqStr}`)
    try {
      return await window.electron.ipcRenderer.invoke('render_event', reqStr)
    } catch (error) {
      console.error('err:', error)
      return { code: 1, status: 'error', message: error }
    }
  }
}

// export class IpcApi {
//   async trigger_event(event, ...args) {
//     console.log(`Triggering event: ${event}`)
//     console.log(`Arguments: ${args}`)

//     try {
//       const input = document.createElement('input')
//       input.type = 'file'
//       input.webkitdirectory = true
//       input.multiple = false

//       input.addEventListener('change', async () => {
//         const files = input.files
//         if (files.length > 0) {
//           const folderPath = files[0].webkitRelativePath.split('/')[0]
//           console.log('选择的文件夹路径:', folderPath)
//           // 发送 open-folder 事件到主进程
//           window.electron.ipcRenderer.send('render_event', folderPath)
//           // 接收后端返回的信息
//           const fileInfo = await window.electron.ipcRenderer.invoke('render_event', folderPath)
//           console.log('文件夹中的文件信息:', fileInfo)
//         }
//       })

//       input.click()
//     } catch (error) {
//       console.error('打开文件夹时出错:', error)
//     }
//   }
// }

// export class IpcApi {
//   async trigger_event(event, ...args) {
//     console.log(`Triggering event: ${event}`)
//     console.log(`Arguments: ${args}`)

//     try {
//       window.electron.ipcRenderer.invoke('render_event', "adfsdf")

//       // const { dialog } = require('electron').remote
//       // const result = await dialog.showOpenDialog({
//       //   properties: ['openDirectory']
//       // })

//       // if (!result.canceled) {
//       //   const folderPath = result.filePaths[0]
//       //   console.log('选择的文件夹路径:', folderPath)
//       //   // 发送 open-folder 事件到主进程
//       //   window.electron.ipcRenderer.send('render_event', folderPath)
//       //   // const fileInfo = await ipcRenderer.invoke('render_event', folderPath)
//       //   // console.log('文件夹中的文件信息:', fileInfo)
//       // }
//     } catch (error) {
//       console.error('打开文件夹时出错:', error)
//     }
//   }
// }
