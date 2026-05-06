// // Define Window type extension to resolve 'electron' property does not exist issue
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

import * as Dty from '../../../bridge/dataTypedef'

export class IpcApi {
    static cseq: number = 0
    // Add return type annotation for function
    static async trigger_event<T = string, R = string>(req: Dty.Req<T>): Promise<Dty.Resp<R>> {
        const sendReq: Dty.Req<string> = {
            ...req,
            data: req.data ? JSON.stringify(req.data) : undefined
        }
        sendReq.cseq = this.cseq++
        const reqStr = JSON.stringify(sendReq)
        if (sendReq.cmd == 'slt_video') {
            // console.log(`Arguments: ${reqStr}`)
        }
        try {
            const response = await window.electron.ipcRenderer.invoke('render_event', reqStr)
            return {
                ...response, // 1. Spread all properties of response object
                data: response.data // 2. Check if response.data exists
                    ? (JSON.parse(response.data) as R) // 3. If exists, parse JSON and type assert as R
                    : undefined // 4. If not exists, set to undefined
            }
        } catch (error) {
            console.error('err:', error)
            const resp = new Dty.Resp<R>()
            return resp.err(String(error))
        }
    }
}

// The commented code below may be different attempts during development, preserved and converted to TypeScript style
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
//           console.log('Selected folder path:', folderPath);
          // Send open-folder event to main process
          window.electron.ipcRenderer.send('render_event', folderPath);
          // Receive information returned from backend
          const fileInfo = await window.electron.ipcRenderer.invoke('render_event', folderPath);
          console.log('File info in folder:', fileInfo);
//         }
//       });

//       input.click();
//     } catch (error) {
//       console.error('Error opening folder:', error);
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
//       //   console.log('Selected folder path:', folderPath);
        //   // Send open-folder event to main process
        //   window.electron.ipcRenderer.send('render_event', folderPath);
        //   // const fileInfo = await ipcRenderer.invoke('render_event', folderPath);
        //   // console.log('File info in folder:', fileInfo);
//       // }
//     } catch (error) {
//       console.error('Error opening folder:', error);
//     }
//   }
// }
