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

    if (!fs.existsSync(appCfg.appData)) {
        fs.mkdirSync(appCfg.appData)
    }

    appCfg.log_dir = path.join(appCfg.appData, 'log')
    if (!fs.existsSync(appCfg.log_dir)) {
        fs.mkdirSync(appCfg.log_dir)
    }
    logger.log_dir = appCfg.log_dir
    logger.info('appData:', appCfg.appData)

    const cfgDir = path.join(appCfg.appData, 'cfg')
    if (!fs.existsSync(cfgDir)) {
        fs.mkdirSync(cfgDir)
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
    log_dir: string = '' // 在程序运行路径下
    file_prj_dir: string = ''
    trashFolder: string = '.trash'
    ffmpegExe: string = ''
    ffprobeExe: string = ''
    appInfo: DataTypes.AppInfo = new DataTypes.AppInfo()
    prj: DataTypes.Prj = new DataTypes.Prj()

    folderClassifyNum: number = 10
    appDir: string = ''
    bPrtWorkQueue: boolean = false
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
