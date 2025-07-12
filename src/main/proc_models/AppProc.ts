import * as path from 'path'
import * as fs from 'fs'
// import mediaProc from './MediaProcess.js'
// import appCfg from './AppCfg.js'
import logger from './Logger'
import appdb from './AppDb'
// import recordsProc from './RecordsProcess.js'
// import { TraversalFolder, workQueue, Util } from './Utils.js'
// // import type { WorkResp } from './Utils.js'
import * as DataTypes from '../../bridge/dataTypedef'
import appCfg from './AppCfg.js'

class AppProc {
  // constructor() {}
  saveAppCfg(): void {
    const cfgPath = path.join(appCfg.appData, 'prj.json')
    const data = JSON.stringify(appCfg.appInfo, null, 2)
    try {
      fs.writeFileSync(cfgPath, data)
    } catch (error) {
      logger.error('write file err:', error)
    }
  }

  async initApp(): Promise<void> {
    await appCfg.initCfg()
  }

  async quiteApp(): Promise<void> {
    this.saveAppCfg()
  }

  async create_prj(
    req: DataTypes.Req<DataTypes.CreatePrjReq>,
    folderPath: string
  ): Promise<DataTypes.Resp<DataTypes.Prj>> {
    const resp = new DataTypes.Resp<DataTypes.Prj>()
    if (req.data == null) {
      return resp.err('req.data is null')
    }
    if (req.data?.dataBasePath === '') {
      return resp.err('dataBasePath is empty')
    }
    // 1, make prj info
    const folderName = path.basename(folderPath)
    const prjInfo: DataTypes.Prj = {
      name: folderName,
      version: '0.0.1',
      dataFolder: req.data.dataBasePath
    }
    {
      // 2, create db folder and init db
      logger.log('create project file:', folderPath)
      const dbFolderPath = path.join(folderPath, 'db')
      if (!fs.existsSync(dbFolderPath)) {
        fs.mkdirSync(dbFolderPath)
      }
      const respDb = await appdb.initDb(dbFolderPath)
      if (respDb.code !== 0) {
        return resp.err('init db error')
      }
      //3, 创建 log 文件夹
      const logFolderPath = path.join(folderPath, 'log')
      if (!fs.existsSync(logFolderPath)) {
        fs.mkdirSync(logFolderPath)
      }
      //4, 创建 thumbnail 文件夹
      const thumbnailFolderPath = path.join(folderPath, 'thumbnail')
      if (!fs.existsSync(thumbnailFolderPath)) {
        fs.mkdirSync(thumbnailFolderPath)
      }
    }
    // 5, write prj info to file
    const projectFilePath = path.join(folderPath, 'project.json')
    const jsonContent = JSON.stringify(prjInfo, null, 2)
    await fs.promises.writeFile(projectFilePath, jsonContent, 'utf-8')
    resp.success('Project file created successfully').data = prjInfo
    appCfg.appInfo.prjFile = projectFilePath
    this.saveAppCfg()
    return resp
  }

  async app_start(): Promise<DataTypes.Resp<DataTypes.AppStartResp>> {
    const resp = new DataTypes.Resp<DataTypes.AppStartResp>()
    resp.data = new DataTypes.AppStartResp()
    const cfgPath = path.join(appCfg.appData, 'prj.json')
    if (!fs.existsSync(cfgPath)) {
      return resp.success('app start not find prj file')
    }
    let data = ''
    //1，read app info json
    try {
      data = fs.readFileSync(cfgPath, { encoding: 'utf-8' })
    } catch (error: unknown) {
      logger.error('read file err :', error)
      return resp.err('read file err ')
    }
    try {
      const jsonData = JSON.parse(data)
      appCfg.appInfo = jsonData
      resp.data.appInfo = appCfg.appInfo
    } catch (error: unknown) {
      logger.info('err parse json:', error)
      return resp.err('解析 JSON 时出错')
    }
    // 2, if appInfo.prjFile isempty, return without prj info
    if (appCfg.appInfo.prjFile == '') {
      resp.data.prj = null
      return resp
    }
    // 3, init db
    const prjFilePath = path.dirname(appCfg.appInfo.prjFile)
    const respDb = await appdb.initDb(path.join(prjFilePath, 'db'))
    if (respDb.code !== 0) {
      return resp.err('init db error')
    }
    // 4, read prj json
    try {
      const prjData = fs.readFileSync(appCfg.appInfo.prjFile, { encoding: 'utf-8' })
      const prjInfo = JSON.parse(prjData)
      appCfg.prj = prjInfo
      resp.data.prj = prjInfo
    } catch (error: unknown) {
      logger.info('err parse json:', error)
      return resp.err('解析 JSON 时出错')
    }
    return resp
  }
  async search_file(
    req: DataTypes.Req<DataTypes.SearchFileReq>
  ): Promise<DataTypes.Resp<DataTypes.SearchFileResp>> {
    if (req.data?.page == undefined) {
      logger.error('search_file err: page is undefined')
    }
    return appdb.search_file()
  }
}

const appProc = new AppProc()
export default appProc
