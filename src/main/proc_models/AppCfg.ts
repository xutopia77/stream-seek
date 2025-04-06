import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'
import { console } from 'inspector'
import logger from './Logger'

// 初始化应用配置的函数
async function initApp(appCfg: AppCfg): Promise<void> {
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
  const isDev = process.env.NODE_ENV === 'development'
  const appPath = app.getAppPath()
  appCfg.ffmpegExe = path.join(appPath, '../assets/bin/ffmpeg.exe')
  appCfg.ffprobeExe = path.join(appPath, '../assets/bin/ffprobe.exe')
  if (isDev) {
    appCfg.ffmpegExe = path.join(appPath, 'assets/bin/ffmpeg.exe')
    appCfg.ffprobeExe = path.join(appPath, 'assets/bin/ffprobe.exe')
  }
}

// 定义 AppCfg 类
class AppCfg {
  appData: string
  thumbnail_dir: string = ''
  file_prj_dir: string = ''
  trashFolder: string = '.trash'
  ffmpegExe: string = ''
  ffprobeExe: string = ''
  prj = {
    name: 'stream_manager',
    version: '0.0.1'
  }

  folderClassifyNum: number = 10

  constructor() {
    this.appData = './appData'
  }

  async initCfg(): Promise<void> {
    try {
      await initApp(this)
    } catch (error) {
      logger.error('initCfg error:', error)
    }
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
