import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'
import logger from './Logger'
import * as DataTypes from '../../bridge/dataTypedef'

// 初始化应用配置的函数
async function initApp(appCfg: AppCfg): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development'
  const appPath = app.getAppPath()
  appCfg.appDir = path.join(appPath, '../../')
  if (isDev) {
    appCfg.appDir = appPath
  }

  appCfg.appData = path.join(appCfg.appDir, 'appData')
  logger.log('appData:', appCfg.appData)

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
  appCfg.ffmpegExe = path.join(appPath, '../assets/bin/ffmpeg.exe')
  appCfg.ffprobeExe = path.join(appPath, '../assets/bin/ffprobe.exe')
  if (isDev) {
    appCfg.ffmpegExe = path.join(appPath, 'assets/bin/ffmpeg.exe')
    appCfg.ffprobeExe = path.join(appPath, 'assets/bin/ffprobe.exe')
  }
}

class AppCfg {
  appData: string // 程序运行数据文件夹
  thumbnail_dir: string = ''
  file_prj_dir: string = ''
  trashFolder: string = '.trash'
  ffmpegExe: string = ''
  ffprobeExe: string = ''
  appInfo: DataTypes.AppInfo = new DataTypes.AppInfo()
  prj: DataTypes.Prj = {
    name: 'stream_manager',
    version: '0.0.1',
    dataFolder: ''
  }

  folderClassifyNum: number = 10
  appDir: string = ''

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
}

const appCfg = new AppCfg()
export default appCfg
