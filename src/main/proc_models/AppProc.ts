import * as path from 'path'
import * as fs from 'fs'
import mediaProc from './MediaProcess.js'
// import appCfg from './AppCfg.js'
import logger from './Logger'
import appDb from './AppDb'
import recordsProc from './RecordsProcess.js'
// // import type { WorkResp } from './Utils.js'
import * as Dty from '../../bridge/dataTypedef'
import appCfg from './AppCfg.js'
import { workQueue } from './TaskEvent'
import { Util } from './Utils.js'
import express from 'express'
import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import { dialog } from 'electron'

function logStatusRespReturn<T>(resp: Dty.Resp<T>): Dty.Resp<T> {
    if (resp.code === 0) {
        workQueue.statusSet(logger.info(resp.status))
    } else {
        workQueue.statusSet(logger.error(resp.status))
    }
    return resp
}

/**
 * 安全地重命名文件，检查源文件存在性和目标文件冲突
 * @param srcPath 源文件路径
 * @param destPath 目标文件路径
 * @param type 重命名类型
 *          force ： 强制移动，如果目标文件存在，先把目标文件删除，再移动
 *          strict ： 严格模式，如果目标文件存在，不做处理
 */
async function fileSafeRename(
    srcPath: string,
    destPath: string,
    type: 'force' | 'strict' = 'strict'
): Promise<'destExist' | 'srcNot' | 'success' | 'err'> {
    try {
        // 检查源文件是否存在
        if (!fs.existsSync(srcPath)) {
            logger.warn(`Source file does not exist: ${srcPath}`)
            return 'srcNot'
        }

        // 如果目标文件已存在，先删除它
        if (fs.existsSync(destPath)) {
            // logger.info(`Destination file already exists, removing: ${destPath}`)
            if (type == 'force') {
                await fs.promises.unlink(destPath)
            } else {
                return 'destExist'
            }
        }

        // 确保目标目录存在
        const destDir = path.dirname(destPath)
        if (!fs.existsSync(destDir)) {
            await fs.promises.mkdir(destDir, { recursive: true })
        }

        // 执行重命名操作
        await fs.promises.rename(srcPath, destPath)
        return 'success'
    } catch (error) {
        logger.error(`Failed to rename file from ${srcPath} to ${destPath}:`, error)
        return 'err'
    }
}

class TraversalFolder {
    type: string | null = null // search时才遍历子文件夹
    repo: Dty.DataRepo = new Dty.DataRepo()
    bSort: boolean = false
    status: Dty.TrasStatus = new Dty.TrasStatus()

    async procOneFile(fPath: string, fName: string, stats: fs.Stats): Promise<Dty.Resp> {
        const resp: Dty.Resp = new Dty.Resp()

        this.status.fileNum++
        const now = Date.now()
        if ((now % 10) * 1000 === 0) {
            logger.info(`traversal file count: ${this.status.fileNum}`)
        }
        workQueue.statusSet(`traversal file count: ${this.status.fileNum}`)
        const fileTimeInfo = Dty.FileTools.parse_filename_mi(fName)
        if (fileTimeInfo == null) {
            this.status.fileErrNum++
            return resp.err(logger.warn(`traversal skip: ${fPath}`))
        }
        // 1， check file if in db
        const searchReq = Dty.FilesReq.makeReqStatusNormal(fPath, this.repo.name)
        const respSearch = await appDb.filesSearch(searchReq)
        if (respSearch.code == 0) {
            if (respSearch.data?.files.length != null && respSearch.data.files.length > 0) {
                // logger.info(`file already exists: ${fPath}`)
                const fInfo = respSearch.data?.files[0]
                // check file status [todo] check other status
                if (fInfo?.status != Dty.Fstatus.Normal) {
                    const statusStr = Dty.fileStatusGet(fInfo.status)
                    fInfo.status = Dty.Fstatus.Normal
                    const upResp = await appDb.fileUpdate(fInfo)
                    if (upResp.code != Dty.RespCode.Success) {
                        logger.error(`update file status err ${fInfo.path}, status:${statusStr}`)
                        this.status.fileErrNum++
                    }
                }
                return resp.success(`file already exists: ${fPath}`)
            }
        }

        // 2, insert file in db
        const respMediaInfo = await mediaProc.getVideoInfo(fPath)
        const fileModel: Dty.FileModel = {
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
            type: Dty.FileType.Mp4,
            status: Dty.Fstatus.Normal,
            repo: this.repo.name
        }
        const respInsert = await appDb.file_insert(fileModel)
        logger.info(`file insert id:${respInsert.data?.id} ${respInsert.status} ${fPath}`)
        if (respInsert.code != Dty.RespCode.Success) {
            this.status.fileErrNum++
            return resp.err(`file insert err ${respInsert.status}`)
        }
        return resp
    }

    private async traversal_folder(): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        const folderPath = this.repo.path
        if (!folderPath || !fs.existsSync(folderPath)) {
            return resp.err('folder not exist')
        }
        try {
            const stack: string[] = [folderPath]
            while (stack.length > 0) {
                const currentPath = stack.pop()!
                try {
                    const currentFiles = await fs.promises.readdir(currentPath)
                    for (const file of currentFiles) {
                        if (bSyncPrjStop) {
                            logger.info(`prj sync stop cur in traversal folder`)
                            return resp
                        }
                        const filePath = path.join(currentPath, file)
                        try {
                            const stats = await fs.promises.stat(filePath)
                            if (stats.isDirectory()) {
                                // todo 如果目录的名称是trash，也进行扫描，要更新数据库的状态
                                if (file === '.trash') {
                                    // logger.log(`traversal skip: ${filePath}`)
                                    continue
                                }
                                stack.push(filePath)
                            } else {
                                try {
                                    await this.procOneFile(filePath, file, stats)
                                } catch (procError) {
                                    console.error(`Error processing file ${filePath}:`, procError)
                                }
                            }
                        } catch (statError) {
                            console.error(`Error getting stats for ${filePath}:`, statError)
                        }
                    }
                } catch (readdirError) {
                    console.error(`Error reading directory ${currentPath}:`, readdirError)
                }
            }
            resp.success('success')
            return resp
        } catch (error) {
            console.error('traversal folder err:', error)
            return resp.err(`traversal folder err: ${error}`)
        }
    }

    private async checkDb(): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        if (!appDb.db) {
            return resp.err(logger.error(`db is null`))
        }

        const respCount: Dty.Resp<Dty.FilesResp> = await appDb.filesCount(null)
        if (respCount.code != 0 || respCount.data?.total == null || respCount.data?.total == 0) {
            return resp.err(
                logger.error(
                    `files count err total=${respCount.data?.total}, status=${respCount.status}`
                )
            )
        }

        const totalFiles = respCount.data?.total
        const batchSize = 100
        let processedCount = 0

        logger.info(`Starting to check database with ${totalFiles} files`)
        while (processedCount < totalFiles) {
            if (bSyncPrjStop) {
                logger.info(`prj sync stop cur in check db`)
                break
            }
            const fSearchReq = new Dty.FilesReq()
            fSearchReq.page = Math.floor(processedCount / batchSize) + 1
            fSearchReq.pageSize = batchSize

            const searchResult = await appDb.filesSearch(fSearchReq)
            if (!searchResult.isSuccess()) {
                return resp.err(logger.error(`Failed to fetch files page ${fSearchReq.page}`))
            }

            if (!searchResult.data || !searchResult.data.files) {
                logger.warn(`No data returned for page ${fSearchReq.page}`)
                break
            }
            for (const fInfo of searchResult.data.files) {
                let chkStatus = ''
                if (!fs.existsSync(fInfo.path)) {
                    if (fInfo.status != Dty.Fstatus.Destroy) {
                        fInfo.status = Dty.Fstatus.Destroy
                        const upResp = await appDb.fileUpdate(fInfo)
                        chkStatus += `status destroy update ${upResp.status}; `
                        if (!upResp.isSuccess()) {
                            logger.info(`file check ${chkStatus}`)
                            continue
                        }
                    }
                } else {
                    if (fInfo.status != Dty.Fstatus.Normal) {
                        fInfo.status = Dty.Fstatus.Normal
                        const upResp = await appDb.fileUpdate(fInfo)
                        chkStatus += `status normal update ${upResp.status}; `
                        if (!upResp.isSuccess()) {
                            logger.info(`file check ${chkStatus}`)
                            continue
                        }
                    }
                }
                {
                    {
                        const thumbDbFilePath = Util.thumbDbPathGet(fInfo.name, Dty.ThumbType.Frame)
                        const trashThumbDbPath = Util.thumbTrashDbPathGet(
                            fInfo.name,
                            Dty.ThumbType.Frame
                        )
                        try {
                            if (fInfo.status == Dty.Fstatus.Normal) {
                                if (!fs.existsSync(thumbDbFilePath)) {
                                    if (fs.existsSync(trashThumbDbPath)) {
                                        fs.promises.rename(trashThumbDbPath, thumbDbFilePath)
                                    }
                                }
                            } else if ((fInfo.status as Dty.Fstatus) == Dty.Fstatus.Deleted) {
                                if (!fs.existsSync(trashThumbDbPath)) {
                                    if (fs.existsSync(thumbDbFilePath)) {
                                        fs.promises.rename(thumbDbFilePath, trashThumbDbPath)
                                    }
                                }
                            }
                        } catch (err) {
                            chkStatus += `move thumb file err; `
                            logger.error(`move thumb file err`, err)
                        }
                    }
                    {
                        const thumbDbFilePath = Util.thumbDbPathGet(fInfo.name, Dty.ThumbType.Thumb)
                        const trashThumbDbPath = Util.thumbTrashDbPathGet(
                            fInfo.name,
                            Dty.ThumbType.Thumb
                        )
                        try {
                            if (fInfo.status == Dty.Fstatus.Normal) {
                                if (!fs.existsSync(thumbDbFilePath)) {
                                    if (fs.existsSync(trashThumbDbPath)) {
                                        fs.promises.rename(trashThumbDbPath, thumbDbFilePath)
                                    }
                                }
                            } else if ((fInfo.status as Dty.Fstatus) == Dty.Fstatus.Deleted) {
                                if (!fs.existsSync(trashThumbDbPath)) {
                                    if (fs.existsSync(thumbDbFilePath)) {
                                        fs.promises.rename(thumbDbFilePath, trashThumbDbPath)
                                    }
                                }
                            }
                        } catch (err) {
                            chkStatus += `move thumb file err; `
                            logger.error(`move thumb file err`, err)
                        }
                    }
                }
                if (processedCount % 10 == 0) {
                    logger.info(
                        `file check ${processedCount + 1}/${totalFiles}: ${chkStatus == '' ? 'success' : chkStatus}`
                    )
                }
                processedCount++
            }
        }

        logger.info(`Database check completed. Total files processed: ${processedCount}`)
        return resp.success('Database check completed')
    }

    /*
        1，遍历文件夹。如果文件已经存在，检查文件状态，设置文
    件状态为正常。如果文件不存在，插入数据库表files。
        2，数据库表files，检查文件是否存在，不存在标记为destroy。
        3，遍历缩略图数据库文件，插入到数据库表files（如果表中没有
    对应项），但文件状态设置为destroy。todo
    */
    async start(): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        if (this.repo.path == '') {
            return new Dty.Resp().err('folder is null')
        }
        const respTras = await this.traversal_folder()
        if (!respTras.isSuccess()) {
            return respTras
        }
        const respDb = await this.checkDb()
        if (!respDb.isSuccess()) {
            return respDb
        }
        return resp
    }

    async get_folder_files(): Promise<Dty.Resp<Dty.FilesResp>> {
        const resp = new Dty.Resp<Dty.FilesResp>()
        resp.data = new Dty.FilesResp()
        const folderPath = this.repo.path
        if (!folderPath) {
            return resp.err('folder is null')
        }
        try {
            const fileInfos: Dty.File[] = []
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
                        const fileInfo: Dty.File = new Dty.File()
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

async function startHttpSrv(port: number): Promise<void> {
    const app = express()
    app.use(express.static('public'))

    app.use((req, res, next) => {
        // 允许所有来源（开发环境）
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept, Authorization'
        )
        // 关键：设置与前端匹配的 Referrer 策略
        res.header('Referrer-Policy', 'strict-origin-when-cross-origin')

        // 关闭严格的跨域隔离策略（Electron 不需要）
        res.header('Cross-Origin-Embedder-Policy', 'unsafe-none')
        res.header('Cross-Origin-Opener-Policy', 'unsafe-none')
        res.header('Cross-Origin-Resource-Policy', 'cross-origin')

        if (req.method === 'OPTIONS') {
            res.sendStatus(200)
            return
        }
        next()
    })

    // app.listen(port, 'localhost', () => {
    app.listen(port, 'localhost', () => {
        logger.error(`Server is running on port ${port}`)
    })

    // 请求示例 "http://localhost:58080/thumb_get?video=12345&thumb=1740797520"
    app.get('/thumb_get', async (req, res) => {
        const videoId = req.query.video
        const timestamp = req.query.thumb
        try {
            if (videoId == null || timestamp == null) {
                logger.error(
                    `Invalid request: missing video or thumb parameter videoId=${videoId},timestamp=${timestamp}`
                )
                res.status(400).send('Invalid request: missing video or thumb parameter')
                return
            }

            if (appCfg.prj.dataRepo.length == 0 || appCfg.prj.dataRepo[0].thumbnailPath == '') {
                logger.error(
                    `Invalid request: missing thumbnailPath ${appCfg.prj.dataRepo[0].thumbnailPath}`
                )
                res.status(400).send('Invalid request: missing thumbnailPath')
                return
            }
            const thumbDbFilePath = Util.thumbDbPathGet(videoId, Dty.ThumbType.Thumb)
            const trashThumbDbPath = Util.thumbTrashDbPathGet(videoId, Dty.ThumbType.Thumb)

            let thumbDbPath = thumbDbFilePath
            // 检查数据库文件是否存在
            if (!fs.existsSync(thumbDbFilePath)) {
                if (!trashThumbDbPath) {
                    logger.error(`Database not found: ${thumbDbFilePath}`)
                    res.status(404).send(`Database not found: ${thumbDbFilePath}`)
                    return
                }
                thumbDbPath = trashThumbDbPath
            }

            const thumbDb: Database = await open({
                filename: thumbDbPath,
                driver: sqlite3.Database
            })

            // 从数据库中查询出对应的缩略图图片
            const row = await thumbDb.get('SELECT raw FROM files WHERE filename =?', [timestamp])

            await thumbDb.close()

            if (row == null) {
                res.status(404).send('Thumbnail not found')
                return
            }

            const imageData = row.raw
            res.setHeader('Content-Type', 'image/jpeg')
            res.send(imageData)
        } catch (error) {
            console.error(
                `Error handling thumb_get request:filename=${videoId},thum=${timestamp}`,
                error
            )
            res.status(500).send('Internal server error')
        }
    })
}

let bTiny2DbStop = false
let bSyncPrjStop = false

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
        await startHttpSrv(Dty.httpSrvPort)
    }

    async quiteApp(): Promise<void> {
        this.saveAppCfg()
    }

    async handle_heartbeat(): Promise<Dty.Resp<Dty.HeartBeat>> {
        const resp = new Dty.Resp<Dty.HeartBeat>()
        const respData: Dty.HeartBeat = new Dty.HeartBeat()
        respData.time = Util.getCurTime()
        respData.appStatus = workQueue.status
        respData.processing = workQueue.isBusy()
        // while (workQueue.processing) {
        //     await new Promise((resolve) => setTimeout(resolve, 10))
        // }
        // workQueue.processing = true
        // if (workQueue.resps.length != 0) {
        //     workQueue.addTask(null)
        //     for (const item of workQueue.resps) {
        //         logger.info(`work resp:cmd: ${item.cmd}`)
        //     }
        // }
        respData.workRespose = workQueue.resps
        // workQueue.resps = []
        // workQueue.processing = false
        resp.data = respData
        return resp
    }

    async handle_file_tags_set(req: Dty.Req<Dty.FileTagsReq>): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        resp.success('success')
        let tagResp = await appDb.tag_search(null)
        if (tagResp.code !== 0) {
            return logStatusRespReturn(resp.err(`tag search err: ${tagResp.status}`))
        }
        workQueue.statusSet(`start set file tags len= ${req.data?.fileTags.length}`)
        let tags = tagResp.data?.tags ?? []
        for (const item of req.data?.fileTags ?? []) {
            let tagInfo = tags.find((tag) => tag.name === item.tagName)
            if (tagInfo == null) {
                const tag: Dty.Tag = {
                    id: 0,
                    name: item.tagName,
                    color: '#4A6FA5'
                }
                const respInsert = await appDb.tag_insert(tag)
                if (respInsert.code !== 0) {
                    logger.error(`insert tag err: ${respInsert.status}`)
                } else {
                    logger.info(`insert tag success: ${item.tagName}`)
                }
                tagResp = await appDb.tag_search(null)
                if (tagResp.code !== 0) {
                    return resp.err(`tag search err: ${tagResp.status}`)
                }
                tags = tagResp.data?.tags ?? []
                tagInfo = tags.find((tag) => tag.name === item.tagName)
                if (tagInfo == null) {
                    logger.error(
                        `tag search err, iteam tag name: ${item.tagName}, tagInfo: ${tagInfo}`
                    )
                    return logStatusRespReturn(resp.err(`tag search err: ${tagResp.status}`))
                }
            }
            const fileTag: Dty.FileTag = {
                id: 0,
                fileId: item.fileId,
                tagId: tagInfo?.id ?? 0
            }
            const respDel = await appDb.file_tag_delete_all(fileTag.fileId)
            if (respDel.code !== 0) {
                workQueue.statusSet(logger.error(`delete file tag err: ${respDel.status}`))
                resp.err('delete file tags error')
            }
            const respUpdate = await appDb.file_tag_insert(fileTag)
            if (respUpdate.code !== 0) {
                workQueue.statusSet(logger.error(`insert file tag err: ${respUpdate.status}`))
                resp.err('insert file tags error')
            } else {
                workQueue.statusSet(
                    logger.info(
                        `insert file tag success: fId:${item.fileId},tagId:${fileTag.tagId},tagName:${item.tagName}`
                    )
                )
            }
        }
        workQueue.statusSet(
            logger.info(
                `set file tags success:  ${req.data?.fileTags != null && req.data?.fileTags?.length > 0 ? 'tag name : ' + req.data?.fileTags[0].tagName : 'no tag'}`
            )
        )
        return resp
    }
    async handle_tags_get(req: Dty.Req<Dty.TagsReq>): Promise<Dty.Resp<Dty.TagsResp>> {
        return await appDb.tag_search(req.data == null ? null : req.data)
    }
    async handle_files_get(req: Dty.Req<Dty.FilesReq>): Promise<Dty.Resp<Dty.FilesResp>> {
        return await appDb.fileViewSearch(req.data == null ? null : req.data)
    }

    async save_prj_info(prjInfo: Dty.Prj): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        if (prjInfo == null) {
            return resp.err('prj is null')
        }
        if (prjInfo.path == '') {
            return resp.err('prj path is empty')
        }

        for (const repo of prjInfo.dataRepo) {
            repo.thumbnailPath = path.posix.normalize(repo.thumbnailPath)
            if (!fs.existsSync(repo.thumbnailPath)) {
                fs.mkdirSync(repo.thumbnailPath, { recursive: true })
                logger.info(`create thumbnail path: ${repo.thumbnailPath}`)
            }
        }
        const projectFilePath = path.join(prjInfo.path, 'project.json')
        const jsonContent = JSON.stringify(prjInfo, null, 2)
        await fs.promises.writeFile(projectFilePath, jsonContent, 'utf-8')
        logger.info(`Project info: ${JSON.stringify(prjInfo, null)}`)
        resp.success('Project file created successfully')
        appCfg.appInfo.prjFile = projectFilePath
        appCfg.prj = prjInfo
        this.saveAppCfg()
        return resp
    }

    async create_prj(
        req: Dty.Req<Dty.CreatePrjReq>,
        prjPath: string
    ): Promise<Dty.Resp<Dty.CreatePrjResp>> {
        const resp = new Dty.Resp<Dty.CreatePrjResp>()
        resp.data = new Dty.CreatePrjResp()
        if (req.data == null) {
            return resp.err('req.data is null')
        }
        if (req.data?.dataRepo == null || req.data.dataRepo.length === 0) {
            return resp.err('dataBase is empty')
        }
        // 检查req.data?.dataRepo 数组中的name是否都相同
        const dataBaseNames = req.data.dataRepo.map((repo) => repo.name)
        const isSameName = dataBaseNames.every((name) => name === dataBaseNames[0])
        if (!isSameName) {
            return resp.err('data repo name is not same')
        }

        // 1, make prj info
        const prjInfo: Dty.Prj = new Dty.Prj()
        prjInfo.name = path.basename(prjPath)
        prjInfo.version = Util.defaultVersionGet()
        prjInfo.path = prjPath
        prjInfo.dataRepo = req.data.dataRepo
        {
            // 2, create db folder and init db
            logger.log('create project prj path:', prjPath)
            const dbFolderPath = path.join(prjPath, 'db')
            if (!fs.existsSync(dbFolderPath)) {
                fs.mkdirSync(dbFolderPath)
            }
            const respDb = await appDb.initDb(dbFolderPath)
            if (!respDb.isSuccess()) {
                return resp.err('init db error')
            }

            for (const repo of prjInfo.dataRepo) {
                repo.thumbnailPath = path.join(prjPath, 'thumbnail', repo.name)
                if (!fs.existsSync(repo.thumbnailPath)) {
                    fs.mkdirSync(repo.thumbnailPath, { recursive: true })
                    fs.mkdirSync(Util.thumbTrashPathGet(repo.thumbnailPath))
                }
                repo.framePath = path.join(prjPath, 'frame', repo.name)
                if (!fs.existsSync(repo.framePath)) {
                    fs.mkdirSync(repo.framePath, { recursive: true })
                    fs.mkdirSync(Util.thumbTrashPathGet(repo.framePath))
                }
            }
        }
        // 5, write prj info to file
        const saveResp = await this.save_prj_info(prjInfo)
        if (saveResp.code != 0) {
            return resp.err('save prj info error ' + saveResp.status)
        }
        resp.data.prj = prjInfo
        resp.success('Project file created successfully')
        logger.info('create project success')
        return resp
    }

    async handle_app_start(): Promise<Dty.Resp<Dty.AppStartResp>> {
        const resp = new Dty.Resp<Dty.AppStartResp>()
        resp.data = new Dty.AppStartResp()
        const cfgPath = path.join(appCfg.appData, 'prj.json')
        if (!fs.existsSync(cfgPath)) {
            return resp.err('success no prj')
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
            return resp.err('app start prj file loss')
        }
        if (!fs.existsSync(appCfg.appInfo.prjFile)) {
            appCfg.appInfo.prjFile = ''
            this.saveAppCfg()
            return resp.err('app start prj file loss')
        }

        // 3, init db
        const prjFilePath = path.dirname(appCfg.appInfo.prjFile)
        const respDb = await appDb.initDb(path.join(prjFilePath, 'db'))
        if (!respDb.isSuccess()) {
            return resp.err('init db error')
        }
        for (let i = 1; i < 11; i++) {
            const tag: Dty.Tag = {
                id: 0,
                name: `sys_score${i}`,
                color: '#4A6FA5'
            }
            const insertResp = await appDb.tag_insert(tag)
            if (insertResp.code != 0) {
                return resp.err('insert tag error')
            }
        }

        // 4, read prj json
        try {
            const prjData = fs.readFileSync(appCfg.appInfo.prjFile, { encoding: 'utf-8' })
            const prjInfo = JSON.parse(prjData)
            appCfg.prj = prjInfo
            resp.data.prj = prjInfo
        } catch (error: unknown) {
            logger.info('err parse json:', error)
            return resp.err('err parse json')
        }
        return resp
    }
    async handle_search_file(req: Dty.Req<Dty.FilesReq>): Promise<Dty.Resp<Dty.FilesResp>> {
        return appDb.fileViewSearch(req.data == null ? null : req.data)
    }

    async start_gen_thumbnail(): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        const searchRe = await appDb.fileViewSearch(Dty.FilesReq.makeReqStatusNormal(null, null))
        if (searchRe.code !== 0) {
            return resp.err('search file error')
        }
        logger.log('start gen thumbnail total=', searchRe.data?.total)
        let count = 0
        for (const fileInfo of searchRe.data?.files ?? []) {
            if (bSyncPrjStop) {
                logger.log(`prj sync stop cur in gen thumbnail`)
                break
            }
            count++
            {
                const startTime = Date.now()
                const respThumb = await recordsProc.gen_thumbnail(fileInfo, Dty.ThumbType.Thumb)
                const endTime = Date.now()
                const duration = ((endTime - startTime) / 1000).toFixed(3)
                if (respThumb.code !== 0) {
                    if (respThumb.code == Dty.RespCode.FileExist) {
                        continue
                    }
                    workQueue.statusSet(
                        logger.error('gen thumbnail error:', fileInfo.path, respThumb.status)
                    )
                    continue
                } else {
                    workQueue.statusSet(
                        logger.info(
                            `${count}/${searchRe.data?.total} gen thumbnail ${respThumb.status} num=${respThumb.data?.length},rate=${fileInfo.mediaInfo?.bit_rate},duration=${fileInfo.duration} s,coast ${duration} s, ${fileInfo.path}`
                        )
                    )
                }
                if (respThumb.data != null && respThumb.data.length > 0) {
                    fileInfo.thumbnail = new Dty.ThumbnailInfo()
                    fileInfo.thumbnail.path = respThumb.data
                    await appDb.fileUpdate(fileInfo)
                }
            }
            {
                const startTime = Date.now()
                const respThumb = await recordsProc.gen_thumbnail(fileInfo, Dty.ThumbType.Frame)
                const endTime = Date.now()
                const duration = ((endTime - startTime) / 1000).toFixed(3)
                if (respThumb.code !== 0) {
                    if (respThumb.code == Dty.RespCode.FileExist) {
                        continue
                    }
                    workQueue.statusSet(
                        logger.error('gen thumbnail error:', fileInfo.path, respThumb.status)
                    )
                    continue
                } else {
                    workQueue.statusSet(
                        logger.info(
                            `${count}/${searchRe.data?.total} gen thumbnail ${respThumb.status} num=${respThumb.data?.length},rate=${fileInfo.mediaInfo?.bit_rate},duration=${fileInfo.duration} s,coast ${duration} s, ${fileInfo.path}`
                        )
                    )
                }
                if (respThumb.data != null && respThumb.data.length > 0) {
                    fileInfo.thumbnail = new Dty.ThumbnailInfo()
                    fileInfo.thumbnail.path = respThumb.data
                    await appDb.fileUpdate(fileInfo)
                }
            }
        }
        return resp
    }

    async start_classify_file(repos: Dty.DataRepo[]): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        for (const repo of repos) {
            if (repo.name == '' || repo.path == '') {
                logger.error(`repo name or path is empty: ${repo.name}, ${repo.path}`)
                continue
            }
            // 1, start traversal folder, Automatically insert the files in the folder into the database
            {
                const traversalFolder = new TraversalFolder()
                traversalFolder.type = null
                traversalFolder.repo = repo
                const resp = await traversalFolder.start()
                logger.info(`traversal ${repo.path} ${resp.status}`)
            }

            // 2, start search file from db
            {
                workQueue.statusSet(logger.info('start classify folder:', repo.path))
                const searchReq = Dty.FilesReq.makeReqStatusNormal(null, repo.name)
                searchReq.order = 'asc'
                searchReq.orderBy = 'startTimeSec'
                searchReq.status = []
                const searchResp = await appDb.fileViewSearch(searchReq)
                if (searchResp.code !== Dty.RespCode.Success) {
                    logger.error(`search file error: ${searchResp.status}`)
                    continue
                }
                // 3, Check whether the files in the database exist in the folder. If not, mark them as destroyed
                const fileList = searchResp.data?.files ?? []
                for (const fInfo of fileList) {
                    if (bSyncPrjStop) {
                        logger.info(`prj sync stop cur in classift file`)
                        break
                    }
                    if (!fs.existsSync(fInfo.path)) {
                        if (fInfo.status == Dty.Fstatus.Normal) {
                            workQueue.statusSet(
                                logger.error(`file not exist destroy: ${fInfo.path}`)
                            )
                            fInfo.status = Dty.Fstatus.Destroy
                            await appDb.fileUpdate(fInfo)
                            continue
                        }
                        if (fInfo.status == Dty.Fstatus.Deleted) {
                            const fTrashPath = recordsProc.file_trash_path_get(fInfo)
                            if (fTrashPath == '' || !fs.existsSync(fTrashPath)) {
                                workQueue.statusSet(
                                    logger.info(`file not exist destroy: ${fInfo.path}`)
                                )
                                fInfo.status = Dty.Fstatus.Destroy
                                await appDb.fileUpdate(fInfo)
                                continue
                            } else {
                                workQueue.statusSet(logger.info(`update file path: ${fTrashPath}`))
                                fInfo.path = fTrashPath
                                await appDb.fileUpdate(fInfo)
                                continue
                            }
                        }
                        if (fInfo.status == Dty.Fstatus.Destroy) {
                            continue
                        }
                    } else {
                        if (fInfo.status == Dty.Fstatus.Deleted) {
                            const fTrashPath = recordsProc.file_trash_path_get(fInfo)
                            const tmp1 = path.posix.normalize(fInfo.path)
                            const tmp2 = path.posix.normalize(fTrashPath)
                            if (tmp1 == tmp2) {
                                continue
                            }
                            workQueue.statusSet(
                                logger.error(`file status ${fInfo.status} err : ${fInfo.path}`)
                            )
                            fInfo.status = Dty.Fstatus.Destroy
                            await appDb.fileUpdate(fInfo)
                            continue
                        }
                    }
                }
            }
            // 4, search file from db again
            {
                const searchReq = Dty.FilesReq.makeReqStatusNormal(null, repo.name)
                searchReq.order = 'asc'
                searchReq.orderBy = 'startTimeSec'
                const searchResp = await appDb.fileViewSearch(searchReq)
                if (searchResp.code !== 0) {
                    logger.error(`search file error: ${searchResp.status}`)
                    continue
                }
                const fileList = searchResp.data?.files ?? []
                // 5, start classify file
                // 5.1, make folder first
                let batchSize = appCfg.prj.numEachFolder
                if (batchSize > 10000 || batchSize < 1) {
                    logger.error(
                        `batchSize err ${appCfg.prj.numEachFolder}, set to default value: ${batchSize}, repo: ${repo.name}`
                    )
                    batchSize = 10
                }
                const groupNum = Math.ceil(fileList.length / batchSize) + 1
                for (let i = 0; i < groupNum; i++) {
                    const grpPath = path.join(repo.path, `${i + 1}`)
                    if (!fs.existsSync(grpPath)) {
                        fs.mkdirSync(grpPath)
                    }
                }
                let fileCnt = 0
                // 5.2, Classify the files into groups of 10
                for (let i = 0; i < fileList.length; i += batchSize) {
                    const batch = fileList.slice(i, i + batchSize)
                    for (const fileInfo of batch) {
                        fileCnt++
                        const grpIdx = Math.floor(i / batchSize)
                        const grpPath = path.join(repo.path, `${grpIdx + 1}`)
                        const fileName = path.basename(fileInfo.path)
                        const dstPath = path.join(grpPath, fileName)
                        if (fileInfo.path == dstPath) {
                            continue
                        }
                        fs.renameSync(fileInfo.path, dstPath)
                        fileInfo.path = dstPath
                        const updateResp = await appDb.fileUpdate(fileInfo)
                        if (updateResp.code !== 0) {
                            logger.error(`update file error: ${updateResp.status}`)
                            continue
                        }
                        workQueue.statusSet(
                            logger.info(
                                `${fileCnt}/${fileList.length} group file success: ${fileInfo.path}`
                            )
                        )
                    }
                }
            }
            // 6, start classify thumbnail trash folder
            {
                logger.info(`start classify thumbnail trash folder: ${repo.thumbnailPath}`)
                // 1, search deleted file
                const searchReq = Dty.FilesReq.makeReqStatusDel(repo.name)
                const searchResp = await appDb.fileViewSearch(searchReq)
                if (searchResp.code !== 0) {
                    logger.error(`search del file error: ${searchResp.status}`)
                    continue
                }
                const fileList = searchResp.data?.files ?? []
                let fCnt = 0
                for (const fInfo of fileList) {
                    fCnt++
                    // logger.info(`file : ${fInfo.path}`)
                    const searchReq = Dty.FilesReq.makeReqStatusNormal(fInfo.path, fInfo.repo)
                    const searchResp = await appDb.fileViewSearch(searchReq)
                    if (searchResp.code == 0) {
                        if (
                            searchResp.data?.files.length != null &&
                            searchResp.data?.files.length > 0
                        ) {
                            // logger.info(`file not del, but exist: ${fInfo.path}`)
                            continue
                        }
                    }
                    // 2, get file thumbnail full path
                    const file_thubmbnail_dir = recordsProc.thumbnail_path_get_mp4(
                        fInfo.repo,
                        fInfo.path
                    )
                    // 3, check thumb folder exist
                    if (fs.existsSync(file_thubmbnail_dir)) {
                        const repo = Dty.DataRepo.getRepoByPath(fInfo.repo, appCfg.prj.dataRepo)
                        if (repo == null) {
                            continue
                        }
                        if (repo.thumbnailPath == '') {
                            continue
                        }
                        // 4, make thumb trash directory
                        const thumbTrash = path.join(repo.thumbnailPath, '.trash')
                        if (!fs.existsSync(thumbTrash)) {
                            fs.mkdirSync(thumbTrash)
                        }
                        // 5, move thumbnail to trash directory
                        const targetDir = path.join(thumbTrash, path.basename(file_thubmbnail_dir))
                        fs.renameSync(file_thubmbnail_dir, targetDir)
                        logger.info(
                            `${fCnt}/${fileList.length} move thumb ${file_thubmbnail_dir} to ${targetDir}`
                        )
                    }
                }
            }
        }
        return resp
    }

    /*
    同步项目

    保存项目信息：
        创建缩略图文件夹。
        创建项目json文件。
        把项目json文件路径信息保存到appdata文件夹中。

    文件分类：
        1，首先遍历仓库文件夹，解析文件信息，保存到数据库中。
        2，修复文件信息，不存在的文件（仓库中和回收站中都不存在
    的），在数据库中标记为销毁。数据库中标记为删除的文件。
        3，文件分类，从数据库中搜索文件，按照文件的创建时间，把文件
    分散到各个子文件夹中。 数据库中会跟新文件路径信息。
        4，删除文件的缩略图的移动到缩略图的回收站中。

    生成缩略图
    */
    async handle_prjSync(req: Dty.Req<Dty.SyncPrjReq>): Promise<Dty.Resp<Dty.SyncPrjResp>> {
        const resp = new Dty.Resp<Dty.SyncPrjResp>()
        if (req.data == null) {
            return resp.err('req.data is null')
        }
        resp.data = new Dty.SyncPrjResp()
        bSyncPrjStop = false
        {
            let bNeedSavePrjInfo = false
            let bNeedGenThumb = false
            let bNeedClassifyFile = false
            for (const type of req.data.type) {
                if (type == Dty.SyncType.all) {
                    bNeedSavePrjInfo = true
                    bNeedGenThumb = true
                    bNeedClassifyFile = true
                    break
                }
                if (type == Dty.SyncType.prjInfo) {
                    bNeedSavePrjInfo = true
                }
                if (type == Dty.SyncType.thumbnail) {
                    bNeedGenThumb = true
                }
                if (type == Dty.SyncType.classify) {
                    bNeedClassifyFile = true
                }
            }

            if (bNeedSavePrjInfo) {
                workQueue.statusSet(logger.info(`save prj info start`))
                const prjInfo = req.data.prj
                if (prjInfo == null) {
                    return logStatusRespReturn(resp.err('prjInfo is null,err'))
                }
                const saveResp = await this.save_prj_info(prjInfo)
                if (saveResp.code !== 0) {
                    return logStatusRespReturn(resp.err(`save prj info error ${saveResp.status}`))
                }
                resp.data.prj = prjInfo
                workQueue.statusSet(logger.info(`save prj info ${saveResp.status} ${prjInfo.path}`))
            }

            if (bNeedClassifyFile) {
                workQueue.statusSet(logger.log('classify file start'))
                const classifyResp = await this.start_classify_file(req.data.prj.dataRepo)
                if (classifyResp.code !== 0) {
                    return logStatusRespReturn(
                        resp.err(`classify file error ${classifyResp.status}`)
                    )
                }
                workQueue.statusSet(logger.log('classify file ', classifyResp.status))
            }

            if (bNeedGenThumb) {
                for (const repo of req.data.prj.dataRepo) {
                    if (repo.name == '' || repo.path == '') {
                        return logStatusRespReturn(resp.err('repo name or path is empty'))
                    }
                    const traversalFolder = new TraversalFolder()
                    traversalFolder.type = null
                    traversalFolder.repo = repo
                    await traversalFolder.start()
                    await this.start_gen_thumbnail()
                }
            }
        }

        workQueue.statusSet('sync work success')
        workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
        return resp
    }

    async query_images(fPath: string): Promise<Dty.Resp<Dty.TraversalFolder>> {
        const resp = new Dty.Resp<Dty.TraversalFolder>()

        let file_thubmbnail_dir = ''
        {
            const respThumb = await recordsProc.thumbnail_get_mp4_path(fPath)
            if (respThumb.code !== 0 || respThumb.data == null || respThumb.data == '') {
                return resp.err('get mp4 thumbnail path error')
            }
            file_thubmbnail_dir = respThumb.data
        }

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
        traversalFolder.repo.path = file_thubmbnail_dir
        const response = await traversalFolder.get_folder_files()
        if (response.code !== 0) {
            return resp.err(`traversal folder error ${response.status}`)
        }
        // 缩略图安装时间排序
        response.data?.files.sort((a, b) => {
            const timeA = Dty.FileTools.parse_filename_mi(a.name)?.startTime
            const timeB = Dty.FileTools.parse_filename_mi(b.name)?.startTime
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

    async handle_select_video(req: Dty.Req<Dty.Req_SltFile>): Promise<Dty.Resp<Dty.File>> {
        const resp = new Dty.Resp<Dty.File>()
        resp.data = new Dty.File()
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
        const searchReq = new Dty.FilesReq()
        searchReq.path = video_path
        const searchRe = await appDb.fileViewSearch(searchReq)
        if (searchRe.code !== 0) {
            return resp.err('search file error')
        }
        if (searchRe.data?.files.length === 0) {
            return resp.err('file not exist')
        }
        const fInfo = searchRe.data?.files[0]
        if (fInfo == null) {
            return resp.err('file info is null')
        }
        if (appCfg.prj.repoType == Dty.RepoType.Normal) {
            if (fInfo.status != Dty.Fstatus.Normal) {
                return resp.err('file status is not normal')
            }
        }
        if (appCfg.prj.repoType == Dty.RepoType.Trash) {
            if (fInfo.status != Dty.Fstatus.Deleted) {
                return resp.err('file status is not delete')
            }
        }

        resp.success('success').data = fInfo
        if (resp.data.thumbnail?.path == null) {
            let bThumbExist = true
            const tra = new TraversalFolder()
            tra.repo.path = recordsProc.thumbnail_path_get_mp4(fInfo?.repo, fInfo?.path)
            if (!fs.existsSync(tra.repo.path)) {
                if (appCfg.prj.repoType == Dty.RepoType.Normal) {
                    logger.warn(`thumbnail not exist in repo path ${tra.repo.path}`)
                    bThumbExist = false
                } else {
                    tra.repo.path = recordsProc.thumTrashPathGetByMp4(fInfo?.repo, fInfo?.path)
                    if (!fs.existsSync(tra.repo.path)) {
                        logger.warn(`thumbnail not exist in repo trash path ${tra.repo.path}`)
                        bThumbExist = false
                    }
                }
            }
            if (bThumbExist) {
                const fRe = await tra.get_folder_files()
                if (fRe.code != 0) {
                    logger.warn(`thumbnail not exist ${fInfo.path}`)
                } else {
                    resp.data.thumbnail = new Dty.ThumbnailInfo()
                    for (const item of fRe.data?.files ?? []) {
                        resp.data.thumbnail.path.push(item.path)
                    }
                }
            }
        }
        return resp
    }

    /**
     *      删除方式均是'destroy'，会同时删除 thumb和frame
     */
    async thumbsDel(req: Dty.Req<Dty.DeleteFileReq>): Promise<Dty.Resp<Dty.DeleteFileResp>> {
        const resp = new Dty.Resp<Dty.DeleteFileResp>()
        if (!req.data?.files || req.data.files.length === 0) {
            return logStatusRespReturn(resp.err('file is null'))
        }

        workQueue.statusSet(logger.info(`delete thumb start`))

        if (req.data.type == 'destroy') {
            for (const item of req.data.files) {
                const searchReq = Dty.FilesReq.makeReqStatusNormal(item.path, item.repo)
                searchReq.status = []
                const searchResp = await appDb.fileViewSearch(searchReq)
                if (searchResp.code !== 0 || searchResp.data?.files.length === 0) {
                    workQueue.statusSet(
                        logger.error(
                            `thumb del err: ${item.repo} ${item.path}, ${searchResp.status}`
                        )
                    )
                    continue
                }

                for (const fInfo of searchResp.data?.files || []) {
                    const filepath = fInfo.path
                    const fName = fInfo.name
                    let attempts = 0
                    const maxAttempts = 3 // 最大尝试次数
                    async function attemptRename(): Promise<void> {
                        try {
                            fInfo.status = Dty.Fstatus.Nothing
                            const respUp = await appDb.fileUpdate(fInfo)
                            if (respUp.code != 0) {
                                workQueue.statusSet(
                                    logger.error(`file update error: ${respUp.status} ${filepath}`)
                                )
                                throw respUp.status
                            } else {
                                {
                                    const thumbTrashDbPath = Util.thumbTrashDbPathGet(
                                        fName,
                                        Dty.ThumbType.Thumb
                                    )
                                    const thumbDbPath = Util.thumbDbPathGet(
                                        fName,
                                        Dty.ThumbType.Thumb
                                    )
                                    if (fs.existsSync(thumbTrashDbPath)) {
                                        fs.unlinkSync(thumbTrashDbPath)
                                        logger.info(`thumb file rm ${thumbTrashDbPath}`)
                                    }
                                    if (fs.existsSync(thumbDbPath)) {
                                        fs.unlinkSync(thumbDbPath)
                                        logger.info(`thumb file rm ${thumbDbPath}`)
                                    }
                                }
                                {
                                    const thumbTrashDbPath = Util.thumbTrashDbPathGet(
                                        fName,
                                        Dty.ThumbType.Frame
                                    )
                                    const thumbDbPath = Util.thumbDbPathGet(
                                        fName,
                                        Dty.ThumbType.Frame
                                    )
                                    if (fs.existsSync(thumbTrashDbPath)) {
                                        fs.unlinkSync(thumbTrashDbPath)
                                        logger.info(`frame file rm ${thumbTrashDbPath}`)
                                    }
                                    if (fs.existsSync(thumbDbPath)) {
                                        fs.unlinkSync(thumbDbPath)
                                        logger.info(`frame file rm ${thumbDbPath}`)
                                    }
                                }
                            }
                        } catch (err) {
                            attempts++
                            if (attempts < maxAttempts) {
                                workQueue.statusSet(
                                    logger.error(
                                        `thumb rm attempt ${attempts} failed, retrying in 1 second...`,
                                        err
                                    )
                                )
                                await new Promise((resolve) => setTimeout(resolve, 1000))
                                await attemptRename()
                            } else {
                                workQueue.statusSet(
                                    logger.error('thumb rm err after multiple attempts:', err)
                                )
                                throw err
                            }
                        }
                    }
                    try {
                        await attemptRename()
                    } catch (err) {
                        return resp.err(`rm original video err ${err}`)
                    }
                }
            }
        } else {
            resp.err(logger.error(`thumb rm not support type ${req.data.type}`))
        }

        workQueue.statusSet(logger.info(`thumb rm over`))
        resp.data = {}
        return resp
    }

    /**
     *      如果删除方式是 'del'， 就把文件移动到回收站，同时把缩略图也移动到回收站（不依赖于bDelThumb），
     *  确保文件不会被误删
     *      如果删除方式是 'destroy'， 就把文件彻底删除，但是缩略图会根据bDelThumb决定，如
     * 果bDelThumb为true，就连同缩略图也彻底删除，如果bDelThumb为false，缩略图会保留。
     */
    async filesDel(req: Dty.Req<Dty.DeleteFileReq>): Promise<Dty.Resp<Dty.DeleteFileResp>> {
        const resp = new Dty.Resp<Dty.DeleteFileResp>()
        if (!req.data?.files || req.data.files.length === 0) {
            return logStatusRespReturn(resp.err('file is null'))
        }

        workQueue.statusSet(logger.info(`delete file start`))

        if (req.data.type == 'destroy') {
            for (const item of req.data.files) {
                const fRepo = Dty.DataRepo.getRepoByPath(item.repo, appCfg.prj.dataRepo)
                if (fRepo == null || fRepo.path == '') {
                    return resp.err(`repo not exist ${item.repo},${item.path}`)
                }
                const trashFolderPath = path.join(fRepo.path, '.trash')

                const searchReq = Dty.FilesReq.makeReqStatusNormal(item.path, item.repo)
                searchReq.status = []
                const searchResp = await appDb.fileViewSearch(searchReq)
                if (searchResp.code !== 0 || searchResp.data?.files.length === 0) {
                    workQueue.statusSet(
                        logger.error(`file rm err: ${item.repo} ${item.path} ${searchResp.status}`)
                    )
                    continue
                }

                for (const fInfo of searchResp.data?.files || []) {
                    const filepath = fInfo.path
                    const fName = fInfo.name
                    // 回收站文件名称
                    const distFilename = path.join(trashFolderPath, fName)
                    let attempts = 0
                    const maxAttempts = 3 // 最大尝试次数
                    async function attemptRename(): Promise<void> {
                        try {
                            if (fs.existsSync(distFilename)) {
                                fs.unlinkSync(distFilename)
                                logger.info(`file rm ${distFilename}`)
                            }
                            if (fs.existsSync(filepath)) {
                                fInfo.path = distFilename
                                fs.unlinkSync(filepath)
                                logger.info(`file rm and update ${filepath}`)
                            }
                            fInfo.status = Dty.Fstatus.Destroy
                            if (req.data?.bDelThumb) {
                                fInfo.status = Dty.Fstatus.Nothing
                            }
                            const respUp = await appDb.fileUpdate(fInfo)
                            if (respUp.code != 0) {
                                workQueue.statusSet(
                                    logger.error(`file rm update err: ${respUp.status} ${filepath}`)
                                )
                            } else {
                                workQueue.statusSet(`file rm success: ${distFilename}`)
                                if (req.data?.bDelThumb) {
                                    {
                                        const thumbTrashDbPath = Util.thumbTrashDbPathGet(
                                            fName,
                                            Dty.ThumbType.Thumb
                                        )
                                        const thumbDbPath = Util.thumbDbPathGet(
                                            fName,
                                            Dty.ThumbType.Thumb
                                        )
                                        if (fs.existsSync(thumbTrashDbPath)) {
                                            fs.unlinkSync(thumbTrashDbPath)
                                            logger.info(`thumb rm ${thumbTrashDbPath}`)
                                        }
                                        if (fs.existsSync(thumbDbPath)) {
                                            fs.unlinkSync(thumbDbPath)
                                            logger.info(`thumb rm ${thumbDbPath}`)
                                        }
                                    }
                                    {
                                        const thumbTrashDbPath = Util.thumbTrashDbPathGet(
                                            fName,
                                            Dty.ThumbType.Frame
                                        )
                                        const thumbDbPath = Util.thumbDbPathGet(
                                            fName,
                                            Dty.ThumbType.Frame
                                        )
                                        if (fs.existsSync(thumbTrashDbPath)) {
                                            fs.unlinkSync(thumbTrashDbPath)
                                            logger.info(`frame rm ${thumbTrashDbPath}`)
                                        }
                                        if (fs.existsSync(thumbDbPath)) {
                                            fs.unlinkSync(thumbDbPath)
                                            logger.info(`frame rm ${thumbDbPath}`)
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            attempts++
                            if (attempts < maxAttempts) {
                                workQueue.statusSet(
                                    logger.error(
                                        `file rm err attempt ${attempts} failed, retrying in 1 second...`,
                                        err
                                    )
                                )
                                await new Promise((resolve) => setTimeout(resolve, 1000))
                                await attemptRename()
                            } else {
                                workQueue.statusSet(
                                    logger.error('file rm err after multiple attempts:', err)
                                )
                                throw err
                            }
                        }
                    }
                    try {
                        await attemptRename()
                    } catch (err) {
                        return resp.err(`file rm err ${err}`)
                    }
                }
            }
        } else {
            for (const item of req.data.files) {
                const fRepo = Dty.DataRepo.getRepoByPath(item.repo, appCfg.prj.dataRepo)
                if (fRepo == null || fRepo.path == '') {
                    return resp.err(`repo not exist ${item.repo},${item.path}`)
                }
                const trashFolderPath = path.join(fRepo.path, '.trash')
                if (!fs.existsSync(trashFolderPath)) {
                    fs.mkdirSync(trashFolderPath)
                }
                const searchReq = Dty.FilesReq.makeReqStatusNormal(item.path, item.repo)
                const searchResp = await appDb.fileViewSearch(searchReq)
                if (searchResp.code !== 0 || searchResp.data?.files.length === 0) {
                    workQueue.statusSet(
                        logger.error(
                            `search file ${item.repo} ${item.path} err: ${searchResp.status}`
                        )
                    )
                    continue
                }

                for (const fInfo of searchResp.data?.files || []) {
                    const filepath = fInfo.path
                    const filename = fInfo.name
                    const distFilename = path.join(trashFolderPath, filename)
                    let attempts = 0
                    const maxAttempts = 3 // 最大尝试次数
                    async function attemptRename(): Promise<void> {
                        try {
                            // 移动文件
                            if (fs.existsSync(filepath)) {
                                await fs.promises.rename(filepath, distFilename)
                            }
                            // 更新数据库
                            fInfo.status = Dty.Fstatus.Deleted
                            fInfo.path = distFilename
                            const respUp = await appDb.fileUpdate(fInfo)
                            if (respUp.code != 0) {
                                workQueue.statusSet(
                                    logger.error(`file update error: ${respUp.status} ${filepath}`)
                                )
                            } else {
                                workQueue.statusSet(
                                    logger.info(`file move: ${filepath} to ${distFilename}`)
                                )
                                // 移动缩略图文件
                                {
                                    const thumbTrashDbPath = Util.thumbTrashDbPathGet(
                                        filename,
                                        Dty.ThumbType.Thumb
                                    )
                                    const thumbDbPath = Util.thumbDbPathGet(
                                        filename,
                                        Dty.ThumbType.Thumb
                                    )
                                    const rmResp = await fileSafeRename(
                                        thumbDbPath,
                                        thumbTrashDbPath,
                                        'force'
                                    )
                                    logger.info(
                                        `thumb file move: ${thumbDbPath} to ${thumbTrashDbPath} ${rmResp}`
                                    )
                                }
                                // 移动抽帧文件
                                {
                                    const thumbTrashDbPath = Util.thumbTrashDbPathGet(
                                        filename,
                                        Dty.ThumbType.Frame
                                    )
                                    const thumbDbPath = Util.thumbDbPathGet(
                                        filename,
                                        Dty.ThumbType.Frame
                                    )
                                    const rmResp = await fileSafeRename(
                                        thumbDbPath,
                                        thumbTrashDbPath,
                                        'force'
                                    )
                                    logger.info(
                                        `frame file move: ${thumbDbPath} to ${thumbTrashDbPath} ${rmResp}`
                                    )
                                }
                            }
                        } catch (err) {
                            attempts++
                            if (attempts < maxAttempts) {
                                workQueue.statusSet(
                                    logger.error(
                                        `file move attempt ${attempts} failed, retrying in 1 second...`,
                                        err
                                    )
                                )
                                await new Promise((resolve) => setTimeout(resolve, 1000))
                                await attemptRename()
                            } else {
                                workQueue.statusSet(
                                    logger.error('file move err after multiple attempts:', err)
                                )
                                throw err
                            }
                        }
                    }
                    try {
                        await attemptRename()
                    } catch (err) {
                        return resp.err(`file move err ${err}`)
                    }
                }
            }
        }

        workQueue.statusSet(logger.info(`delete file over`))
        resp.data = {}
        return resp
    }

    async handle_delete_file(
        req: Dty.Req<Dty.DeleteFileReq>
    ): Promise<Dty.Resp<Dty.DeleteFileResp>> {
        const respDel = await this.filesDel(req)
        return respDel
    }

    cmdRespMake<T>(cmdResp: Dty.Resp<T>, bDoClear: boolean = true): Dty.Resp<string> {
        const resp = new Dty.Resp<string>()
        for (const key in cmdResp) {
            if (key == 'data') {
                continue
            }
            resp[key] = cmdResp[key]
        }
        resp.data = JSON.stringify(cmdResp.data)
        if (appCfg.bPrtWorkQueue) {
            logger.info(`cmd response: ${cmdResp.bOver}, cur cmd ${workQueue.curReq?.cmd}`)
        }
        if (bDoClear) {
            if (!(cmdResp.bOver == false)) {
                workQueue.addTask(null)
            }
        }
        return resp
    }

    async handle_get_key_frame_info(
        req: Dty.Req<Dty.Req_FrameInfo>
    ): Promise<Dty.Resp<Dty.FrameInfo>> {
        const resp = new Dty.Resp<Dty.FrameInfo>()
        resp.bOver = false
        const filePath = req.data?.filepath
        if (filePath == null) {
            resp.code = 1
            resp.status = 'filePath is null'
            return resp
        }
        mediaProc
            .get_frame_info(filePath)
            .then((resp: Dty.Resp<Dty.FrameInfo>) => {
                workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
            })
            .catch((error: unknown) => {
                logger.error('get frame info err:', error)
                workQueue.addResp({
                    cmd: req.cmd,
                    data: JSON.stringify({ code: 1, status: error })
                })
            })
        resp.code = 0
        resp.status = 'success'
        resp.bOver = false
        return resp
    }

    handle_tiny2DbStop(): void {
        bTiny2DbStop = true
    }

    async handle_tiny2Db(req: Dty.Req<Dty.Tiny2DbReq>): Promise<Dty.Resp> {
        bTiny2DbStop = false
        let totalNum = 0
        let curIdx = 0
        async function procOneDir(thumbDir, thumbDbFilePath: string): Promise<void> {
            let bExist = true
            try {
                await fs.promises.access(thumbDbFilePath, fs.constants.F_OK)
            } catch (error) {
                if (!error) logger.error(error)
                bExist = false
            }
            if (bExist) {
                logger.info(`proc:${++curIdx}/${totalNum} thumb db exist ${thumbDbFilePath}`)
                return
            }

            const thumbDb: Database = await open({
                filename: thumbDbFilePath,
                driver: sqlite3.Database
            })
            await thumbDb.exec(Util.thumbDbCreateSqlGet())
            await thumbDb.exec(Util.thumbDbCreateSqlInfoGet())
            // 开始事务以提高批量插入性能
            await thumbDb.run('BEGIN TRANSACTION')

            try {
                // 遍历 tmpThumbDir 目录下的所有文件，并把缩略图文件批量插入到thumbDb数据库
                const files = await fs.promises.readdir(thumbDir)

                // 使用预编译语句提高插入效率
                const stmt = await thumbDb.prepare(
                    'INSERT INTO files (filename, raw, type, desc) VALUES (?, ?, ?, ?)'
                )

                // 控制并发数以避免内存占用过高，同时提高机械硬盘的顺序读取效率
                const batchSize = 10
                for (let i = 0; i < files.length; i += batchSize) {
                    const batch = files.slice(i, i + batchSize)

                    // 并行读取一批文件的内容
                    const filePromises = batch.map(async (file) => {
                        const filePath = path.join(thumbDir, file)
                        const fileStat = await fs.promises.stat(filePath)
                        if (fileStat.isFile()) {
                            const imageData = await fs.promises.readFile(filePath)
                            return [file, imageData]
                        }
                        return null
                    })

                    const results = await Promise.all(filePromises)

                    // 批量插入数据库
                    for (const result of results) {
                        if (result !== null) {
                            const [filename, imageData] = result
                            await stmt.run(filename, imageData, 1, '')
                        }
                    }
                }

                await stmt.finalize()
                await thumbDb.run('COMMIT')
                logger.info(`proc:${++curIdx}/${totalNum} thumb db success ${thumbDbFilePath}`)
            } catch (error) {
                await thumbDb.run('ROLLBACK')
                throw error
            } finally {
                await thumbDb.close()
            }
        }

        const resp: Dty.Resp = new Dty.Resp()
        const tinyFileDbPath = req.data?.tinyFileDbPath || ''
        const tinyFilePath = req.data?.tinyFilePath || ''

        // 检查路径参数是否为空
        if (!tinyFileDbPath || !tinyFilePath) {
            return resp.err('err param is null')
        }

        // 检查源文件夹是否存在
        if (!fs.existsSync(tinyFilePath)) {
            return resp.err(`err thumb path not exist: ${tinyFilePath}`)
        }

        // 检查源路径是否为文件夹
        const stats = fs.statSync(tinyFilePath)
        if (!stats.isDirectory()) {
            return resp.err(`err thumb not path: ${tinyFilePath}`)
        }

        logger.info(`start ${tinyFilePath} to ${tinyFileDbPath}`)

        try {
            // 遍历 tinyFilePath 的第一级目录
            const items = fs.readdirSync(tinyFilePath)
            totalNum = items.length
            for (const item of items) {
                if (bTiny2DbStop) {
                    logger.info('process tiny 2 db stop')
                    break
                }
                const itemPath = path.join(tinyFilePath, item)
                const itemStat = fs.statSync(itemPath)

                if (itemStat.isFile()) {
                    // logger.info(`找到文件: ${itemPath}`)
                    // 这里可以处理文件
                } else if (itemStat.isDirectory()) {
                    let thumbDbFilePath = Util.thumbDbPathGet(
                        `${item}.mp4`,
                        Dty.ThumbType.FnameThumb
                    )
                    thumbDbFilePath = path.join(tinyFileDbPath, thumbDbFilePath)
                    // logger.info(`find dir: ${itemPath} thumbPath: ${thumbDbFilePath}`)
                    // 这里可以处理子文件夹
                    await procOneDir(itemPath, thumbDbFilePath)
                }
            }

            logger.info(`process over ${tinyFilePath} total ${items.length}`)
        } catch (error) {
            logger.error(`process err: ${error}`)
            return resp.err(`err: ${error}`)
        }

        return resp.success('tiny process over')
    }

    async handle_create_prj(
        req: Dty.Req<Dty.CreatePrjReq>,
        mainWindow: Electron.BrowserWindow
    ): Promise<Dty.Resp<Dty.CreatePrjResp>> {
        const resp = new Dty.Resp<Dty.CreatePrjResp>()
        try {
            // 显示文件夹选择对话框
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                properties: ['openDirectory']
            })

            if (canceled) {
                // 用户取消选择，返回取消状态
                return resp.err('User canceled the folder selection')
            }
            const folderPath = filePaths[0]
            // 获取当前文件夹下内容是否为空
            const folderContent = fs.readdirSync(folderPath)
            if (folderContent.length > 0) {
                logger.info('The selected folder is not empty')
                return resp.err('The selected folder is not empty')
            }
            return await this.create_prj(req, Util.pathToLinuxStyle(folderPath))
        } catch (error) {
            logger.error('Error creating project file:', error)
            return resp.err(
                `Error creating project file: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    async handle_open_prj(mainWindow: Electron.BrowserWindow): Promise<Dty.Resp<Dty.Prj>> {
        const resp = new Dty.Resp<Dty.Prj>()
        try {
            // 显示文件选择对话框
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile'],
                filters: [
                    { name: 'Project Files', extensions: ['json'] }, // 可根据实际需求修改文件类型
                    { name: 'All Files', extensions: ['*'] }
                ]
            })

            if (canceled) {
                // 用户取消选择，返回取消状态
                return resp.err('User canceled the file selection')
            }

            const filePath = filePaths[0]
            logger.info('Selected file path:', filePath)
            const fileContent = await fs.promises.readFile(filePath, 'utf-8')
            const prjInfo = JSON.parse(fileContent) as Dty.Prj
            appCfg.prj = prjInfo
            appCfg.appInfo.prjFile = filePath
            this.saveAppCfg()
            resp.success('File opened successfully').data = prjInfo
            return resp
        } catch (error) {
            // 处理异常，返回错误信息
            logger.error('Error opening project file:', error)
            return resp.err(
                `Error opening project file: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    async handle_cmd(req: Dty.Req, mainWin: Electron.BrowserWindow | null): Promise<Dty.Resp> {
        const cmd = req.cmd
        const cseq = req.cseq
        if (req.cmd != Dty.CmdType.heartBeat) {
            // console.log(`Arguments: ${args}`);
        }
        if (req.cmd == Dty.CmdType.heartBeat) {
            return this.cmdRespMake(await this.handle_heartbeat(), false)
        }
        if (req.cmd == Dty.CmdType.tinyFileDbStop) {
            this.handle_tiny2DbStop()
            return this.cmdRespMake(new Dty.Resp())
        }
        if (req.cmd == Dty.CmdType.SyncStop) {
            bSyncPrjStop = true
            logger.info(`cmd:${req.cmd}:${cseq}`)
            return this.cmdRespMake(new Dty.Resp())
        }
        if (workQueue.isBusy()) {
            logger.warn(`work queue is busy, cmd: ${req.cmd}, curReq: ${workQueue.curReq?.cmd}`)
            return workQueue.makeBusyResponse()
        }
        workQueue.addTask(req)
        function convertCmdRequest<T>(req: Dty.Req): Dty.Req<T> {
            const cmdReq: Dty.Req<T> = {
                cmd: req.cmd,
                cseq: req.cseq,
                data: JSON.parse(req.data ? req.data : '{}') as T
            }
            return cmdReq
        }

        switch (cmd) {
            case Dty.CmdType.app_start:
                logger.info(`cmd:${cmd}:${cseq}`)
                return this.cmdRespMake(await this.handle_app_start())
            case Dty.CmdType.get_key_frame_info: {
                const cmdReq = convertCmdRequest<Dty.Req_FrameInfo>(req)
                logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.filepath}`)
                return this.cmdRespMake(await this.handle_get_key_frame_info(cmdReq))
            }
            case 'create_prj': {
                const cmdReq = convertCmdRequest<Dty.CreatePrjReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, ${req}`)
                return this.cmdRespMake(await this.handle_create_prj(cmdReq, mainWin!))
            }
            case Dty.CmdType.prjOpen: {
                logger.info(`cmd:${cmd}:${cseq}, ${req}`)
                return this.cmdRespMake(await this.handle_open_prj(mainWin!))
            }
            case Dty.CmdType.search_file: {
                logger.info(`cmd:${cmd}:${cseq}`)
                const cmdReq = convertCmdRequest<Dty.FilesReq>(req)
                return this.cmdRespMake(await this.handle_search_file(cmdReq))
            }
            case Dty.CmdType.tinyFileDbStart: {
                logger.info(`cmd:${cmd}:${cseq}`)
                const cmdReq = convertCmdRequest<Dty.Tiny2DbReq>(req)
                return this.cmdRespMake(await this.handle_tiny2Db(cmdReq))
            }
            case Dty.CmdType.thumbGet: {
                logger.info(`cmd:${cmd}:${cseq}`)
                const cmdReq = convertCmdRequest<Dty.FilesReq>(req)
                return this.cmdRespMake(await this.handle_search_file(cmdReq))
            }
            // case 'slt_video_event': {
            //     logger.info(`cmd:${cmd}:${cseq}, ${req}`)
            //     return cmdRespMake(await handle_video_event_detect())
            // }
            // case 'cut_video': {
            //     const cmdReq = convertCmdRequest<Dty.Req_CutVideo>(req)
            //     logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.filepath}`)
            //     return cmdRespMake(await recordsProc.start_cut_video(cmdReq))
            // }
            case Dty.CmdType.videoDel: {
                const cmdReq = convertCmdRequest<Dty.DeleteFileReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, length=${cmdReq.data?.files.length}`)
                return this.cmdRespMake(await this.handle_delete_file(cmdReq))
            }
            case Dty.CmdType.thumbDel: {
                const cmdReq = convertCmdRequest<Dty.DeleteFileReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, length=${cmdReq.data?.files.length}`)
                return this.cmdRespMake(await this.thumbsDel(cmdReq))
            }
            case Dty.CmdType.sltVideo: {
                const cmdReq = convertCmdRequest<Dty.Req_SltFile>(req)
                logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.filepath}`)
                return this.cmdRespMake(await this.handle_select_video(cmdReq))
            }
            case Dty.CmdType.prjSync: {
                const cmdReq = convertCmdRequest<Dty.SyncPrjReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.type}`)
                return this.cmdRespMake(await this.handle_prjSync(cmdReq))
            }
            // case 'sync_trash': {
            //     const cmdReq = convertCmdRequest<Dty.Req_SyncTrash>(req)
            //     logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.folder}`)
            //     return cmdRespMake(await recordsProc.start_sync_trash(cmdReq))
            // }
            case Dty.CmdType.fileTagsSet: {
                const cmdReq = convertCmdRequest<Dty.FileTagsReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, fileTags len:${cmdReq.data?.fileTags.length}`)
                return this.cmdRespMake(await this.handle_file_tags_set(cmdReq))
            }
            case Dty.CmdType.tags_get: {
                const cmdReq = convertCmdRequest<Dty.TagsReq>(req)
                logger.info(`cmd:${cmd}:${cseq}`)
                return this.cmdRespMake(await this.handle_tags_get(cmdReq))
            }
            case Dty.CmdType.filesGet: {
                const cmdReq = convertCmdRequest<Dty.FilesReq>(req)
                logger.info(`cmd:${cmd}:${cseq}`)
                return this.cmdRespMake(await this.handle_files_get(cmdReq))
            }
            default: {
                console.log(`Unknown event: ${cmd}:${cseq}`)
                const resp = new Dty.Resp()
                return resp.err(`Unknown event: ${cmd}`)
            }
        }
    }
}

const appProc = new AppProc()
export default appProc
export { TraversalFolder }

// function make_file_prj_path(filename: string): string {
//     let filePath = `${filename}_prj.json`
//     filePath = path.join(appCfg.file_prj_dir, filePath)
//     return filePath
// }

// async function handle_open_folder(
//     mainWindow: Electron.BrowserWindow,
//     req: Dty.Req
// ): Promise<Dty.Resp<Dty.TraversalFolder>> {
//     let openType: string | null = null
//     if (req.data != null) {
//         openType = 'search'
//     }

//     const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
//         properties: ['openDirectory']
//         // modal: true
//     })
//     if (!canceled) {
//         const folderPath = filePaths[0]
//         if (openType != 'search') {
//             // 查询文件夹的不用保存到工程文件
//             appCfg.prj.dataFolder = folderPath
//         }
//         logger.info('handle open folder', folderPath)
//         const traversalFolder = new TraversalFolder()
//         traversalFolder.type = openType
//         traversalFolder.bSort = true
//         traversalFolder.folder = folderPath
//         traversalFolder
//             .start()
//             .then((resp: Dty.Resp<Dty.TraversalFolder>) => {
//                 const workResp: Dty.WorkResp = {
//                     cmd: req.cmd,
//                     data: JSON.stringify(resp)
//                 }
//                 workQueue.addResp(workResp)
//             })
//             .catch((error: unknown) => {
//                 workQueue.addResp({
//                     cmd: req.cmd,
//                     data: JSON.stringify({ code: 1, status: error })
//                 })
//                 logger.error('open folder err:', error)
//             })
//         const resp = new Dty.Resp<Dty.TraversalFolder>()
//         resp.success('success').data = { folder: folderPath }
//         resp.bOver = false
//         logger.info('handle open folder', resp.status)
//         return resp
//     }
//     return new Dty.Resp<Dty.TraversalFolder>().err('canceled')
// }

// async function handle_query_video(
//     req: Dty.Req<Dty.Req_TraversalFolder>
// ): Promise<Dty.Resp<Dty.TraversalFolder>> {
//     if (req.data == null) {
//         return new Dty.Resp<Dty.TraversalFolder>().err('req.data is null')
//     }
//     const traversalFolder = new TraversalFolder()
//     traversalFolder.type = null
//     traversalFolder.folder = req.data?.folder
//     traversalFolder
//         .start()
//         .then((resp: Dty.Resp<Dty.TraversalFolder>) => {
//             if (resp.data?.files != null) {
//                 logger.info('traversal folder:', resp.status, resp.data.files?.length)
//                 recordsProc
//                     .start_file_classify(req, resp.data.files)
//                     .then((resp: Dty.Resp) => {
//                         logger.info('handle_query_video after classify:', resp)
//                         workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
//                     })
//                     .catch((error: unknown) => {
//                         logger.error('open folder err:', error)
//                         workQueue.addResp({
//                             cmd: req.cmd,
//                             data: JSON.stringify({ code: 1, status: error })
//                         })
//                     })
//             } else {
//                 logger.info('traversal folder:', resp.status)
//                 workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
//             }
//         })
//         .catch((error: unknown) => {
//             logger.error('open folder err:', error)
//             workQueue.addResp({ cmd: req.cmd, data: JSON.stringify({ code: 1, status: error }) })
//         })
//     const resp = new Dty.Resp<Dty.TraversalFolder>()
//     resp.success('success').bOver = false
//     return resp
// }

// async function handle_clean_work(
//     req: Dty.Req<Dty.Req_ClearWork>
// ): Promise<Dty.Resp> {
//     const resp = new Dty.Resp()
//     if (req.data?.files == null) {
//         console.log('clean all work')
//         const thumbnailDir = appCfg.thumbnail_dir
//         if (fs.existsSync(thumbnailDir)) {
//             for (const file of fs.readdirSync(thumbnailDir)) {
//                 const filePath = path.join(thumbnailDir, file)
//                 await fs.promises.rm(filePath, { recursive: true })
//             }
//         }
//         const filePrjDir = appCfg.file_prj_dir
//         if (fs.existsSync(filePrjDir)) {
//             for (const file of fs.readdirSync(filePrjDir)) {
//                 const filePath = path.join(filePrjDir, file)
//                 await fs.promises.rm(filePath, { recursive: true })
//             }
//         }
//         return resp.success('success')
//     }

//     for (const item of req.data.files) {
//         const filename = item.title
//         const filePrjPath = make_file_prj_path(filename)
//         if (fs.existsSync(filePrjPath)) {
//             await fs.promises.rm(filePrjPath)
//         }
//         const thumbnailDir = path.join(appCfg.thumbnail_dir, filename)
//         if (fs.existsSync(thumbnailDir)) {
//             await fs.promises.rm(thumbnailDir, { recursive: true })
//         }
//     }
//     return resp.success('success')
// }

// async function handle_video_event_detect(): Promise<Dty.Resp<Dty.FileEventInfo[][]>> {
//     const resp = new Dty.Resp<Dty.FileEventInfo[][]>()

//     const filePath =
//         'D:/02_workspace/05_timeCapsule/02_stream_manager/stream_manager/src/main/proc_models/contour_records.json'
//     let data = ''
//     try {
//         data = fs.readFileSync(filePath, {
//             encoding: 'utf-8'
//         })
//     } catch (error: unknown) {
//         console.error('读取文件时出错:', error)
//         resp.code = 1
//         resp.status = String(error)
//         return resp
//     }
//     try {
//         const jsonData = JSON.parse(data)
//         resp.data = jsonData
//         return resp
//     } catch (error: unknown) {
//         resp.code = 1
//         resp.status = String(error)
//         return resp
//     }
// }

// function getFilenameFromPath(filePath: string): string {
//     // 检查参数是否为字符串类型
//     if (typeof filePath !== 'string') {
//         throw new Error('filepath must be a string')
//     }
//     // 去除路径前后的空白字符
//     filePath = filePath.trim()
//     // 如果路径为空字符串，直接返回空字符串
//     if (filePath === '') {
//         return ''
//     }
//     // 使用正则表达式按照反斜杠或正斜杠分割路径
//     const parts = filePath.split(/[\\/]/)
//     // 返回数组的最后一个元素，即文件名
//     return parts[parts.length - 1]
// }

// async function handle_select_video(
//     req: Dty.Req<Dty.Req_SltFile>
// ): Promise<Dty.Resp<Dty.File>> {
//     const resp = new Dty.Resp<Dty.File>()
//     resp.data = new Dty.File()
//     if (req.data == null) {
//         return resp.err('req.data is null')
//     }
//     if (resp.data == undefined) {
//         return resp.err('resp.data is null')
//     }
//     const video_path = req.data?.filepath
//     if (video_path == null) {
//         return resp.err('filepath is null')
//     }
//     // 先读取文件的项目信息
//     {
//         const filename = getFilenameFromPath(video_path)
//         const filePrjPath = make_file_prj_path(filename)
//         if (fs.existsSync(filePrjPath)) {
//             // 读取文件
//             let data = ''
//             try {
//                 data = fs.readFileSync(filePrjPath, {
//                     encoding: 'utf-8'
//                 })
//                 const jsonData = JSON.parse(data)
//                 resp.data = jsonData.fileInfo
//                 // 读取成功了直接返回
//                 logger.info('handle_select_video read file prj success')
//                 return resp
//             } catch (error: unknown) {
//                 console.error('not find video split info:', filePrjPath, error)
//             }
//         }
//     }

//     // get media info
//     {
//         const mediaInfo = await mediaProc.getVideoInfo(video_path)
//         respData.mediaInfo = mediaInfo
//     }
//     {
//         const thubResp = await appProc.query_images(video_path)
//         // logger.info('handle_select_video', thubResp);
//         if (thubResp.code == 0) {
//             respData.thumbnail = thubResp.data?.files
//         }
//     }
//     return resp
// }

// async function handle_save_prj(
//     req: Dty.Req<Dty.Req_CutVideo>
// ): Promise<Dty.Resp> {
//     const resp = new Dty.Resp()
//     if (req.data == null) {
//         return resp.err('req.data is null')
//     }
//     const filePath = make_file_prj_path(req.data.filename)
//     const data = JSON.stringify(req.data)
//     try {
//         fs.writeFileSync(filePath, data)
//         return resp.success('success')
//     } catch (error: unknown) {
//         return resp.err(String(error))
//     }
// }

/*
async function traversal_folder(
    req: Dty.Req<Dty.Req_TraversalFolder>
): Promise<Dty.Resp<Dty.TraversalFolder>> {
    const folderpath = req.data?.folder
    if (folderpath == null) {
        const resp = new Dty.Resp<Dty.TraversalFolder>()
        return resp.err('folderpath is null')
    }
    const traversalFolder = new TraversalFolder()
    traversalFolder.folder = folderpath
    traversalFolder.bSort = true
    return await traversalFolder.start()
}

*/
