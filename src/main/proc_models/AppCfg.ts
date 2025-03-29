import * as path from 'path'
import * as fs from 'fs'

// 定义 AppCfg 类的接口
interface AppCfgInterface {
  appData: string
  thumbnail_dir: string
  file_prj_dir: string
  prj: {
    name: string
    version: string
  }
  init(): Promise<void>
  quiteApp(): Promise<void>
}

// 初始化应用配置的函数
async function initApp(appCfg: AppCfgInterface): Promise<void> {
  if (!fs.existsSync(appCfg.appData)) {
    fs.mkdirSync(appCfg.appData)
  }
  const cfgDir = path.join(appCfg.appData, 'cfg')
  if (!fs.existsSync(cfgDir)) {
    fs.mkdirSync(cfgDir)
  }
  appCfg.thumbnail_dir = path.join(appCfg.appData, 'thumbnail')
  if (!fs.existsSync(appCfg.thumbnail_dir)) {
    fs.mkdirSync(appCfg.thumbnail_dir)
  }
  appCfg.file_prj_dir = path.join(appCfg.appData, 'file_prj')
  if (!fs.existsSync(appCfg.file_prj_dir)) {
    fs.mkdirSync(appCfg.file_prj_dir)
  }
}

// 定义 AppCfg 类
class AppCfg implements AppCfgInterface {
  appData: string
  thumbnail_dir: string = ''
  file_prj_dir: string = ''
  prj = {
    name: 'stream_manager',
    version: '0.0.1'
  }

  constructor() {
    this.appData = 'D:/02_workspace/05_timeCapsule/02_stream_manager/record-manager/appData'
  }

  async init(): Promise<void> {
    return await initApp(this)
  }

  async quiteApp(): Promise<void> {
    // 保存 cfg.json
    const cfgPath = path.join(this.appData, 'prj.json')
    const data = JSON.stringify(this.prj)
    try {
      fs.writeFileSync(cfgPath, data)
    } catch (error) {
      console.error('write file err:', error)
    }
  }
}

const appCfg = new AppCfg()
export default appCfg
