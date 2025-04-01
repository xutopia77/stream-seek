// // 定义 Window 类型的扩展，解决 'electron' 属性不存在的问题
// declare global {
//   interface Window {
//     electron: {
//       ipcRenderer: {
//         invoke: (channel: string, ...args: any[]) => Promise<any>
//         send: (channel: string, ...args: any[]) => void
//       }
//     }
//   }
// }

import * as DataTypes from '../../../bridge/dataTypedef'

export class IpcApi {
  // 为函数添加返回类型注解
  async trigger_event<T = string, R = string>(req: DataTypes.Req<T>): Promise<DataTypes.Resp<R>> {
    const sendReq: DataTypes.Req<string> = {
      ...req,
      data: req.data ? JSON.stringify(req.data) : undefined
    }
    const reqStr = JSON.stringify(sendReq)
    // console.log(`Arguments: ${reqStr}`)
    try {
      const response = await window.electron.ipcRenderer.invoke('render_event', reqStr)
      return {
        ...response, // 1. 展开response对象的所有属性
        data: response.data // 2. 条件判断response.data是否存在
          ? (JSON.parse(response.data) as R) // 3. 存在则解析JSON并类型断言为R
          : undefined // 4. 不存在则设为undefined
      }
    } catch (error) {
      console.error('err:', error)
      const resp = new DataTypes.Resp<R>()
      return resp.err(String(error))
    }
  }
}

// 下面注释掉的代码在原文件中可能是开发过程中的不同尝试，这里也保留并转换为 TypeScript 风格
// export class IpcApi {
//   async trigger_event(event: string, ...args: any[]): Promise<void> {
//     console.log(`Triggering event: ${event}`);
//     console.log(`Arguments: ${args}`);

//     try {
//       const input = document.createElement('input');
//       input.type = 'file';
//       input.webkitdirectory = true;
//       input.multiple = false;

//       input.addEventListener('change', async () => {
//         const files = input.files;
//         if (files && files.length > 0) {
//           const folderPath = files[0].webkitRelativePath.split('/')[0];
//           console.log('选择的文件夹路径:', folderPath);
//           // 发送 open-folder 事件到主进程
//           window.electron.ipcRenderer.send('render_event', folderPath);
//           // 接收后端返回的信息
//           const fileInfo = await window.electron.ipcRenderer.invoke('render_event', folderPath);
//           console.log('文件夹中的文件信息:', fileInfo);
//         }
//       });

//       input.click();
//     } catch (error) {
//       console.error('打开文件夹时出错:', error);
//     }
//   }
// }

// export class IpcApi {
//   async trigger_event(event: string, ...args: any[]): Promise<void> {
//     console.log(`Triggering event: ${event}`);
//     console.log(`Arguments: ${args}`);

//     try {
//       await window.electron.ipcRenderer.invoke('render_event', "adfsdf");

//       // const { dialog } = require('electron').remote;
//       // const result = await dialog.showOpenDialog({
//       //   properties: ['openDirectory']
//       // });

//       // if (!result.canceled) {
//       //   const folderPath = result.filePaths[0];
//       //   console.log('选择的文件夹路径:', folderPath);
//       //   // 发送 open-folder 事件到主进程
//       //   window.electron.ipcRenderer.send('render_event', folderPath);
//       //   // const fileInfo = await ipcRenderer.invoke('render_event', folderPath);
//       //   // console.log('文件夹中的文件信息:', fileInfo);
//       // }
//     } catch (error) {
//       console.error('打开文件夹时出错:', error);
//     }
//   }
// }
