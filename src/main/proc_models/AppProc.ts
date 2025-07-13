import * as path from 'path'
import * as fs from 'fs'
import mediaProc from './MediaProcess.js'
// import appCfg from './AppCfg.js'
import logger from './Logger'
import appDb from './AppDb'
import recordsProc from './RecordsProcess.js'
// import { TraversalFolder, workQueue, Util } from './Utils.js'
// // import type { WorkResp } from './Utils.js'
import * as DataTypes from '../../bridge/dataTypedef'
import appCfg from './AppCfg.js'
import { workQueue } from './Utils.js'
class TraversalFolder {
    type: string | null = null // search时才遍历子文件夹
    folder: string | null = null
    bSort: boolean = false

    async proc_one_file(fPath: string, fName: string, stats: fs.Stats): Promise<DataTypes.Resp> {
        const resp: DataTypes.Resp = new DataTypes.Resp()
        const fileTimeInfo = DataTypes.FileTools.parse_filename_mi(fName)
        if (fileTimeInfo == null) {
            logger.warn(`traversal skip: ${fPath}`)
            return resp.err(`traversal skip: ${fPath}`)
        }
        const respMediaInfo = await mediaProc.getVideoInfo(fPath)
        const fileModel: DataTypes.FileModel = {
            name: fName,
            path: fPath,
            startTimeSec: fileTimeInfo.startTimeSec, // 视频开始时间，单位秒
            endTimeSec: fileTimeInfo.endTimeSec, // 视频结束时间，单位秒
            duration: fileTimeInfo.durationSec, // 视频时长
            size: stats.size, // 视频大小，单位字节
            mediaInfo: JSON.stringify(respMediaInfo),
            splitInfo: '',
            frameInfo: '',
            thumbnail: '',
            eventInfo: '',
            type: DataTypes.FileType.Video,
            status: DataTypes.FileStatus.Normal
        }
        const respInsert = await appDb.file_insert(fileModel)
        logger.info(`insert id:${respInsert.data?.id} ${respInsert.status} ${fPath}`)
        return resp
    }

    // 递归遍历文件夹
    private async traversal_folder(): Promise<DataTypes.Resp> {
        const resp = new DataTypes.Resp()
        const folderPath = this.folder
        if (!folderPath) {
            return resp.err('folder is null')
        }
        try {
            const fileInfos: DataTypes.FileInfo[] = []
            const traverseRecursive = async (currentPath: string): Promise<void> => {
                const currentFiles = await fs.promises.readdir(currentPath)
                for (const file of currentFiles) {
                    const filePath = path.join(currentPath, file)
                    const stats = await fs.promises.stat(filePath)
                    if (stats.isDirectory()) {
                        // 判断目录的名称，如果目录的名称是trash，则跳过
                        if (file === '.trash') {
                            // logger.log(`traversal skip: ${filePath}`)
                            continue
                        }
                        await traverseRecursive(filePath)
                    } else {
                        await this.proc_one_file(filePath, file, stats)
                    }
                }
            }
            await traverseRecursive(folderPath)
            if (this.bSort) {
                fileInfos.sort((a, b) => {
                    return a.title.localeCompare(b.title)
                })
            }
            resp.success('success')
            return resp
        } catch (error) {
            console.error('traversal folder err:', error)
            return resp.err(`traversal folder err: ${error}`)
        }
    }

    // 启动文件夹遍历，并且把文件夹中的数据插入到数据库中
    async start(): Promise<DataTypes.Resp> {
        if (this.folder === null) {
            return new DataTypes.Resp().err('folder is null')
        }
        return this.traversal_folder()
    }

    async get_folder_files(): Promise<DataTypes.Resp<DataTypes.SearchFileResp>> {
        const resp = new DataTypes.Resp<DataTypes.SearchFileResp>()
        resp.data = new DataTypes.SearchFileResp()
        const folderPath = this.folder
        if (!folderPath) {
            return resp.err('folder is null')
        }
        try {
            const fileInfos: DataTypes.File[] = []
            const traverseRecursive = async (currentPath: string): Promise<void> => {
                const currentFiles = await fs.promises.readdir(currentPath)
                for (const fName of currentFiles) {
                    const fPath = path.join(currentPath, fName)
                    const stats = await fs.promises.stat(fPath)
                    if (stats.isDirectory()) {
                        // 判断目录的名称，如果目录的名称是trash，则跳过
                        if (fName === '.trash') {
                            // logger.log(`traversal skip: ${filePath}`)
                            continue
                        }
                        await traverseRecursive(fPath)
                    } else {
                        const fileInfo: DataTypes.File = new DataTypes.File()
                        fileInfo.name = fName
                        fileInfo.path = fPath
                        resp.data?.files.push(fileInfo)
                    }
                }
            }
            await traverseRecursive(folderPath)
            if (this.bSort) {
                fileInfos.sort((a, b) => {
                    return a.name.localeCompare(b.name)
                })
            }
            resp.success('success')
            return resp
        } catch (error) {
            console.error('traversal folder err:', error)
            return resp.err(`traversal folder err: ${error}`)
        }
    }
}

async function make_trash_folder(folderPath: string): Promise<string> {
    try {
        await fs.promises.access(folderPath, fs.constants.F_OK)
    } catch (err) {
        if (err) {
            await fs.promises.mkdir(folderPath, { recursive: true })
        }
    }
    try {
        await fs.promises.access(folderPath, fs.constants.F_OK)
    } catch (err) {
        if (err) {
            logger.error('trash dir not exist:', folderPath)
            return `trash dir not exist: ${folderPath}`
        }
    }
    return ''
}

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
        const prjInfo: DataTypes.Prj = new DataTypes.Prj()
        prjInfo.name = folderName
        prjInfo.version = '0.0.1'
        prjInfo.dataFolder = req.data.dataBasePath
        {
            // 2, create db folder and init db
            logger.log('create project file:', folderPath)
            const dbFolderPath = path.join(folderPath, 'db')
            if (!fs.existsSync(dbFolderPath)) {
                fs.mkdirSync(dbFolderPath)
            }
            const respDb = await appDb.initDb(dbFolderPath)
            if (respDb.code !== 0) {
                return resp.err('init db error')
            }
            //4, 创建 thumbnail 文件夹
            prjInfo.thumbnail_dir = path.join(folderPath, 'thumbnail')
            if (!fs.existsSync(prjInfo.thumbnail_dir)) {
                fs.mkdirSync(prjInfo.thumbnail_dir)
            }
            appCfg.thumbnail_dir = prjInfo.thumbnail_dir
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
            return resp.success('success no prj')
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
            logger.info('app cfg err parse json:', error)
            return resp.err('app cfg err parse json')
        }
        // 2, if appInfo.prjFile isempty, return without prj info
        if (appCfg.appInfo.prjFile == '') {
            resp.data.prj = null
            return resp
        }
        if (!fs.existsSync(appCfg.appInfo.prjFile)) {
            appCfg.appInfo.prjFile = ''
            this.saveAppCfg()
            return resp.success('app start prj file loss')
        }

        // 3, init db
        const prjFilePath = path.dirname(appCfg.appInfo.prjFile)
        const respDb = await appDb.initDb(path.join(prjFilePath, 'db'))
        if (respDb.code !== 0) {
            return resp.err('init db error')
        }
        // 4, read prj json
        try {
            const prjData = fs.readFileSync(appCfg.appInfo.prjFile, { encoding: 'utf-8' })
            const prjInfo = JSON.parse(prjData)
            appCfg.prj = prjInfo
            resp.data.prj = prjInfo
            appCfg.thumbnail_dir = appCfg.prj.thumbnail_dir
        } catch (error: unknown) {
            logger.info('err parse json:', error)
            return resp.err('err parse json')
        }
        return resp
    }
    async search_file(
        req: DataTypes.Req<DataTypes.SearchFileReq>
    ): Promise<DataTypes.Resp<DataTypes.SearchFileResp>> {
        return appDb.search_file(req.data == null ? null : req.data)
    }

    async start_gen_thumbnail(): Promise<DataTypes.Resp> {
        const resp = new DataTypes.Resp()
        if (appCfg.thumbnail_dir == '') {
            logger.log('start gen thumbnail err thumbnail_dir is empty')
            return resp.err('thumbnail_dir is empty')
        }
        logger.log('start gen thumbnail')
        const searchRe = await appDb.search_file(null)
        if (searchRe.code !== 0) {
            return resp.err('search file error')
        }
        for (const fileInfo of searchRe.data?.files ?? []) {
            const respThumb = await recordsProc.gen_thumbnail(fileInfo)
            logger.info(`gen thumbnail ${respThumb.status} `, fileInfo.path)
            if (respThumb.code !== 0) {
                logger.error('gen thumbnail error:', fileInfo.path, respThumb.status)
                continue
            }
            if (respThumb.data != null && respThumb.data.length > 0) {
                fileInfo.thumbnail = new DataTypes.ThumbnailInfo()
                fileInfo.thumbnail.path = respThumb.data
                await appDb.file_update(fileInfo)
            }
        }
        return resp
    }

    async start_sync_work(req: DataTypes.Req<DataTypes.SyncPrjReq>): Promise<DataTypes.Resp> {
        const resp = new DataTypes.Resp()
        if (req.data == null) {
            return resp.err('req.data is null')
        }
        if (req.data.prj.dataFolder == '') {
            return resp.err('req.data.prj.dataFolder is empty')
        }
        const traversalFolder = new TraversalFolder()
        traversalFolder.type = null
        traversalFolder.folder = req.data?.prj.dataFolder
        const respTra = await traversalFolder.start()
        await this.start_gen_thumbnail()
        workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(respTra) })
        return resp

        // traversalFolder
        //   .start()
        //   .then(async (resp: DataTypes.Resp<DataTypes.TraversalFolder>) => {
        //     if (resp.data?.files != null) {
        //       logger.log('traversal folder:', resp.status, resp.data.files?.length)
        //       const resp_classify = await recordsProc.start_file_classify(req, resp.data.files)
        //       if (resp_classify.code !== 0) {
        //         workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
        //         return
        //       }
        //       workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
        //     } else {
        //       logger.log('traversal folder:', resp.status)
        //       workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
        //     }
        //   })
        //   .catch((error: unknown) => {
        //     logger.error('open folder err:', error)
        //     workQueue.addResp({ cmd: req.cmd, data: JSON.stringify({ code: 1, status: error }) })
        //   })
        // return resp.success('success')
    }

    async query_images(filepath: string): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
        const resp = new DataTypes.Resp<DataTypes.TraversalFolder>()
        const thumbnail_dir = appCfg.thumbnail_dir
        if (thumbnail_dir == '') {
            return resp.err('thumbnail dir is empty')
        }

        const file_thubmbnail_dir = path.join(thumbnail_dir, path.basename(filepath, '.mp4'))
        let bExist = true
        // 对应文件的缩略图存储在文件名对应的文件夹中， 文件夹不存在，返回错误
        try {
            await fs.promises.access(file_thubmbnail_dir)
        } catch (error) {
            if (!error) {
                logger.error('access error:', error)
            }
            bExist = false
        }
        if (!bExist) {
            return resp.err(`folder not exist ${file_thubmbnail_dir}`)
        }
        // 开始遍历缩略图的文件夹
        const traversalFolder = new TraversalFolder()
        traversalFolder.type = 'search'
        traversalFolder.folder = file_thubmbnail_dir
        const response = await traversalFolder.get_folder_files()
        if (response.code !== 0) {
            return resp.err(`traversal folder error ${response.status}`)
        }
        // 缩略图安装时间排序
        response.data?.files.sort((a, b) => {
            const timeA = DataTypes.FileTools.parse_filename_mi(a.name)?.startTime
            const timeB = DataTypes.FileTools.parse_filename_mi(b.name)?.startTime
            if (timeA === undefined) {
                return 0
            }
            if (timeB === undefined) {
                return 0
            }
            return timeA.localeCompare(timeB)
        })
        return response
    }

    async handle_select_video(
        req: DataTypes.Req<DataTypes.Req_SltFile>
    ): Promise<DataTypes.Resp<DataTypes.File>> {
        const resp = new DataTypes.Resp<DataTypes.File>()
        resp.data = new DataTypes.File()
        if (req.data == null) {
            return resp.err('req.data is null')
        }
        if (resp.data == undefined) {
            return resp.err('resp.data is null')
        }
        const video_path = req.data?.filepath
        if (video_path == null) {
            return resp.err('filepath is null')
        }
        const searchParam = new DataTypes.SearchFileReq()
        searchParam.path = video_path
        const searchRe = await appDb.search_file(searchParam)
        if (searchRe.code !== 0) {
            return resp.err('search file error')
        }
        if (searchRe.data?.files.length === 0) {
            return resp.err('file not exist')
        }
        resp.success('success').data = searchRe.data?.files[0]

        // // 先读取文件的项目信息
        // {
        //     const filename = getFilenameFromPath(video_path)
        //     const filePrjPath = make_file_prj_path(filename)
        //     if (fs.existsSync(filePrjPath)) {
        //         // 读取文件
        //         let data = ''
        //         try {
        //             data = fs.readFileSync(filePrjPath, {
        //                 encoding: 'utf-8'
        //             })
        //             const jsonData = JSON.parse(data)
        //             resp.data = jsonData.fileInfo
        //             // 读取成功了直接返回
        //             logger.log('handle_select_video read file prj success')
        //             return resp
        //         } catch (error: unknown) {
        //             console.error('not find video split info:', filePrjPath, error)
        //         }
        //     }
        // }

        // // get media info
        // {
        //     const mediaInfo = await mediaProc.getVideoInfo(video_path)
        //     respData.mediaInfo = mediaInfo
        // }
        // {
        //     const thubResp = await appProc.query_images(video_path)
        //     // logger.info('handle_select_video', thubResp);
        //     if (thubResp.code == 0) {
        //         respData.thumbnail = thubResp.data?.files
        //     }
        // }
        return resp
    }

    async delete_video(
        req: DataTypes.Req<DataTypes.DeleteFileReq>
    ): Promise<DataTypes.Resp<DataTypes.DeleteFileResp>> {
        const resp = new DataTypes.Resp<DataTypes.DeleteFileResp>()
        if (!req.data?.filepaths || req.data.filepaths.length === 0) {
            return resp.err('filepath is null')
        }
        const baseFolder = req.data.baseFolder
        const trashFolderPath = path.join(baseFolder, '.trash')
        //1, make or check trash folder
        const resp_str = await make_trash_folder(trashFolderPath)
        if (resp_str.length > 0) {
            return resp.err(resp_str)
        }
        // 2, start delete video
        for (const item of req.data.filepaths) {
            const searchParam = new DataTypes.SearchFileReq()
            searchParam.path = item
            const searchResp = await appDb.search_file(searchParam)
            if (searchResp.code !== 0) {
                logger.error(`search file ${item} err: ${searchResp.status}`)
                continue
            }

            for (const fileInfo of searchResp.data?.files || []) {
                const filepath = fileInfo.path
                const filename = fileInfo.name
                const distFilename = path.join(trashFolderPath, filename)
                let attempts = 0
                const maxAttempts = 3 // 最大尝试次数
                async function attemptRename(): Promise<void> {
                    try {
                        await fs.promises.rename(filepath, distFilename)
                        logger.log(`delete original video: ${filepath}, move to ${distFilename}`)
                    } catch (err) {
                        attempts++
                        if (attempts < maxAttempts) {
                            logger.error(
                                `move original video attempt ${attempts} failed, retrying in 1 second...`,
                                err
                            )
                            await new Promise((resolve) => setTimeout(resolve, 1000))
                            await attemptRename()
                        } else {
                            logger.error('move original video err after multiple attempts:', err)
                            throw err
                        }
                    }
                }
                try {
                    await attemptRename()
                } catch (err) {
                    return resp.err(`move original video err ${err}`)
                }
            }
        }
        resp.data = {}
        return resp
    }

    async handle_delete_file(
        req: DataTypes.Req<DataTypes.DeleteFileReq>
    ): Promise<DataTypes.Resp<DataTypes.DeleteFileResp>> {
        const respDel = await this.delete_video(req)
        workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(respDel) })
        return respDel
    }
}

const appProc = new AppProc()
export default appProc
export { TraversalFolder }
