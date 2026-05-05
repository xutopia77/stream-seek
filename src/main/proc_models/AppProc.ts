import * as path from 'path'
import * as fs from 'fs'
import mediaProc from './MediaProcess.js'
import logger from './Logger'
import appDb from './AppDb'
import recordsProc from './RecordsProcess.js'
import mp4Parser from './Mp4Parser.js'
import * as Dty from '../../bridge/dataTypedef'
import appCfg from './AppCfg.js'
import { workQueue } from './TaskEvent'
import { Util } from './Utils.js'
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

export class TraversalFolder {
    type: string | null = null // search时才遍历子文件夹
    repo: Dty.DataRepo = new Dty.DataRepo()
    bSort: boolean = false
    status: Dty.TrasStatus = new Dty.TrasStatus()

    async procOneFile(fPath: string, fName: string, stats: fs.Stats): Promise<Dty.Resp> {
        const resp: Dty.Resp = new Dty.Resp()

        this.status.fileNum++
        workQueue.statusSet(`traversal file count: ${this.status.fileNum}`)
        const fileTimeInfo = Dty.FileTools.miFilenameParse(fName)
        if (fileTimeInfo == null) {
            this.status.fileErrNum++
            return resp.err(logger.warn(`traversal skip: ${fPath}`))
        }
        // 1， check file if in db
        const searchReq: Dty.FilesReq = new Dty.FilesReq()
        searchReq.path = fPath
        const respSearch = await appDb.filesSearch(searchReq)
        if (respSearch.isSuccess()) {
            if (respSearch.data?.files.length != null && respSearch.data.files.length > 0) {
                if (respSearch.data.files.length > 1) {
                    logger.info(
                        `file already exist,but record number=${respSearch.data.files.length},${fPath}`
                    )
                }
                const fInfo = respSearch.data?.files[0]
                // check file status [todo] check other status
                if (fInfo?.status != Dty.Fstatus.Normal) {
                    const statusStr = Dty.fileStatusGet(fInfo.status)
                    const delResp = await appDb.fileDeleteById(fInfo.id)
                    logger.info(`file status=${statusStr},${delResp.status}`)
                } else {
                    return resp.success(`file already exists: ${fPath}`)
                }
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
        logger.info(
            `file insert num=${this.status.fileNum}, id:${respInsert.data?.id} ${respInsert.status} ${fPath}`
        )
        if (respInsert.code != Dty.RespCode.Success) {
            this.status.fileErrNum++
            return resp.err(`file insert err ${respInsert.status}`)
        }
        return resp
    }

    /*
        1，遍历文件夹。文件插入数据库，如果文件已经存在，检查文件状态，如果文件状态正常，则跳过，不插入数据库，如果文
    件状态不正常，先删除文件记录，再插入数据库，虽然文件的缩略图文件可能还存在，但是后面再生成就是了。
    */
    async folderTraversal(): Promise<Dty.Resp> {
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

    /*
        1, 数据库表files，检查文件是否存在，不存在标记为destroy。 todo ， 如果缩略图也不存在，设置为nothing
        2，遍历缩略图数据库文件，插入到数据库表files（如果表中没有
    对应项），但文件状态设置为destroy。todo
    */
    async checkDb(): Promise<Dty.Resp> {
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
                // file not exist,set file status destroy
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
                    // file exist, set status normal
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
                    // if file is normal, remove frame db file to normal folder if frame db file in trash
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
                    // if file is normal, remove thumbnail db file to normal folder if thumbnail db file in trash
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

    addRecentFile(filePath: string): void {
        if (!appCfg.appInfo.recentFiles) {
            appCfg.appInfo.recentFiles = []
        }
        const fileName = path.basename(filePath)
        const existingIndex = appCfg.appInfo.recentFiles.findIndex((f) => f.path === filePath)

        if (existingIndex >= 0) {
            appCfg.appInfo.recentFiles.splice(existingIndex, 1)
        }

        const item: Dty.RecentItem = {
            name: fileName,
            path: filePath,
            lastOpened: Date.now()
        }
        appCfg.appInfo.recentFiles.unshift(item)

        if (appCfg.appInfo.recentFiles.length > 10) {
            appCfg.appInfo.recentFiles = appCfg.appInfo.recentFiles.slice(0, 10)
        }
        this.saveAppCfg()
    }

    addRecentProject(prjFile: string): void {
        if (!appCfg.appInfo.recentProjects) {
            appCfg.appInfo.recentProjects = []
        }
        const prjName = path.basename(prjFile, '.json')
        const existingIndex = appCfg.appInfo.recentProjects.findIndex((p) => p.path === prjFile)

        if (existingIndex >= 0) {
            appCfg.appInfo.recentProjects.splice(existingIndex, 1)
        }

        const item: Dty.RecentItem = {
            name: prjName,
            path: prjFile,
            lastOpened: Date.now()
        }
        appCfg.appInfo.recentProjects.unshift(item)

        if (appCfg.appInfo.recentProjects.length > 10) {
            appCfg.appInfo.recentProjects = appCfg.appInfo.recentProjects.slice(0, 10)
        }
        this.saveAppCfg()
    }

    async initApp(): Promise<void> {
        await appCfg.initCfg()
    }
    mainWinSet(mainWin: Electron.BrowserWindow | null): void {
        Util.mainWinSet(mainWin)
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
        resp.data = respData
        return resp
    }

    async handle_file_tags_set(req: Dty.Req<Dty.FileTagsReq>): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        resp.success('success')
        let tagResp = await appDb.tag_search(null)
        if (!tagResp.isSuccess()) {
            return logStatusRespReturn(resp.err(`tag search err: ${tagResp.status}`))
        }
        workQueue.statusSet(`start set file tags len= ${req.data?.fileTags.length}`)
        let tags = tagResp.data?.tags ?? []
        for (const item of req.data?.fileTags ?? []) {
            // find tag is in db
            let tagInfo = tags.find((tag) => tag.name === item.tagName)
            if (tagInfo == null && item.tagName != Dty.tagNoneDefName) {
                const tag: Dty.Tag = {
                    id: 0,
                    name: item.tagName,
                    color: Dty.tagDefColor,
                    description: ''
                }
                const respInsert = await appDb.tag_insert(tag)
                if (!respInsert.isSuccess()) {
                    logger.error(`insert tag err: ${respInsert.status}`)
                } else {
                    logger.info(`tag insert success: ${item.tagName}`)
                }
                tagResp = await appDb.tag_search(null)
                if (!tagResp.isSuccess()) {
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
            // insert file tag, delete firstly, then insert
            const fileTag: Dty.FileTag = {
                id: 0,
                fileId: item.fileId,
                tagId: tagInfo?.id ?? 0
            }
            const respDel = await appDb.file_tag_delete_all(fileTag.fileId)
            if (!respDel.isSuccess()) {
                workQueue.statusSet(logger.error(`delete file tag err: ${respDel.status}`))
                resp.err('delete file tags error')
            }
            if (item.tagName == Dty.tagNoneDefName) {
                workQueue.statusSet(
                    logger.info(
                        `file tag delete success: fId:${item.fileId},tagId:${fileTag.tagId},tagName:${item.tagName}`
                    )
                )
            } else {
                const respUpdate = await appDb.file_tag_insert(fileTag)
                if (!respUpdate.isSuccess()) {
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
    async handle_tag_update(req: Dty.Req<Dty.TagUpdateReq>): Promise<Dty.Resp> {
        const tag = new Dty.Tag()
        tag.id = req.data?.id || 0
        tag.name = req.data?.name || ''
        tag.color = req.data?.color || ''
        tag.description = req.data?.description || ''
        return await appDb.tag_update(tag)
    }
    async handle_tag_delete(req: Dty.Req<Dty.TagDeleteReq>): Promise<Dty.Resp> {
        const tag = new Dty.Tag()
        tag.id = req.data?.id || 0
        return await appDb.tag_delete(tag)
    }
    async handle_files_get(req: Dty.Req<Dty.FilesReq>): Promise<Dty.Resp<Dty.FilesResp>> {
        return await appDb.fileViewSearch(req.data == null ? null : req.data)
    }

    async prjInfoSave(prjInfo: Dty.Prj): Promise<Dty.Resp> {
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
        const prjName = prjInfo.name || 'project'
        const projectFilePath = path.join(prjInfo.path, `${prjName}.json`)
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
        req: Dty.Req<Dty.CreatePrjWithPathReq>,
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
        const saveResp = await this.prjInfoSave(prjInfo)
        if (saveResp.code != 0) {
            return resp.err('save prj info error ' + saveResp.status)
        }
        resp.data.prj = prjInfo
        resp.data.prjFile = path.join(prjPath, `${prjInfo.name}.json`)
        appCfg.appInfo.prjFile = resp.data.prjFile
        this.addRecentProject(resp.data.prjFile)
        resp.success('Project file created successfully')
        logger.info('create project success')
        return resp
    }

    async handle_app_start(): Promise<Dty.Resp<Dty.AppStartResp>> {
        const resp = new Dty.Resp<Dty.AppStartResp>()
        resp.data = new Dty.AppStartResp()
        const cfgPath = path.join(appCfg.appData, 'prj.json')
        if (!fs.existsSync(cfgPath)) {
            resp.data.appInfo = appCfg.appInfo
            return resp.success('no config file')
        }
        let data = ''
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
        return resp.success('app start success')
    }
    async handle_search_file(req: Dty.Req<Dty.FilesReq>): Promise<Dty.Resp<Dty.FilesResp>> {
        return appDb.fileViewSearch(req.data == null ? null : req.data)
    }

    async handle_thumb_img_get(
        req: Dty.Req<Dty.ThumbImgGetReq>
    ): Promise<Dty.Resp<Dty.ThumbImgGetResp>> {
        const resp = new Dty.Resp<Dty.ThumbImgGetResp>()
        const reqData = req.data

        if (reqData == null || reqData.videoName == '' || reqData.thumbName == '') {
            return resp.err('Invalid request: missing videoName or thumbName')
        }

        if (appCfg.prj.dataRepo.length == 0 || appCfg.prj.dataRepo[0].thumbnailPath == '') {
            return resp.err('Invalid request: missing thumbnailPath')
        }

        const thumbDbFilePath = Util.thumbDbPathGet(reqData.videoName, Dty.ThumbType.Thumb)
        const trashThumbDbPath = Util.thumbTrashDbPathGet(reqData.videoName, Dty.ThumbType.Thumb)

        let thumbDbPath = thumbDbFilePath
        if (!fs.existsSync(thumbDbFilePath)) {
            if (!trashThumbDbPath || !fs.existsSync(trashThumbDbPath)) {
                return resp.err(`Database not found: ${thumbDbFilePath}`)
            }
            thumbDbPath = trashThumbDbPath
        }

        try {
            const thumbDb: Database = await open({
                filename: thumbDbPath,
                driver: sqlite3.Database
            })

            const row = await thumbDb.get('SELECT raw FROM files WHERE filename =?', [
                reqData.thumbName
            ])
            await thumbDb.close()

            if (row == null) {
                return resp.err('Thumbnail not found')
            }

            const imageData = row.raw
            const base64Data = imageData.toString('base64')
            resp.data = new Dty.ThumbImgGetResp()
            resp.data.data = base64Data
            resp.data.mimeType = 'image/jpeg'
            return resp.success('success')
        } catch (error) {
            logger.error(`Error handling thumb_img_get: ${error}`)
            return resp.err('Internal server error')
        }
    }

    async start_gen_thumbnail(): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        const searchRe = await appDb.filesSearch(Dty.FilesReq.makeReqStatusNormal(null, null))
        if (!searchRe.isSuccess()) {
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
            // get thumbnail
            {
                const startTime = Date.now()
                const respThumb = await recordsProc.gen_thumbnail(fileInfo, Dty.ThumbType.Thumb)
                const endTime = Date.now()
                const duration = ((endTime - startTime) / 1000).toFixed(3)
                if (!respThumb.isSuccess()) {
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
            // get frame
            {
                const startTime = Date.now()
                const respThumb = await recordsProc.gen_thumbnail(fileInfo, Dty.ThumbType.Frame)
                const endTime = Date.now()
                const duration = ((endTime - startTime) / 1000).toFixed(3)
                if (!respThumb.isSuccess()) {
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

    async classifyFileStart(repos: Dty.DataRepo[]): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        for (const repo of repos) {
            if (repo.name == '' || repo.path == '') {
                logger.error(`repo name or path is empty: ${repo.name}, ${repo.path}`)
                continue
            }
            const traversalFolder = new TraversalFolder()
            traversalFolder.type = null
            traversalFolder.repo = repo

            // 1, start traversal folder, Automatically insert the files in the
            // folder into the database
            {
                const respTras = await traversalFolder.folderTraversal()
                if (!respTras.isSuccess()) {
                    return respTras
                }
                logger.info(`traversal ${repo.path} ${respTras.status}`)
            }

            // 2, start classify file
            {
                const searchReq = Dty.FilesReq.makeReqStatusNormal(null, repo.name)
                searchReq.order = 'asc'
                searchReq.orderBy = 'startTimeSec'
                const searchResp = await appDb.filesSearch(searchReq)
                if (!searchResp.isSuccess()) {
                    logger.error(`search file error: ${searchResp.status}`)
                    continue
                }
                const fileList = searchResp.data?.files ?? []
                // 2.1, make folder first
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
                // 2.2, Classify the files into groups of 10
                for (let i = 0; i < fileList.length; i += batchSize) {
                    if (bSyncPrjStop) {
                        logger.info(`prj sync stop cur in classify files`)
                        return resp
                    }
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
                        if (!updateResp.isSuccess()) {
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
            // 3, start classify thumbnail trash folder
            const bClassifyTrash = false
            if (bClassifyTrash) {
                logger.info(`start classify thumbnail trash folder: ${repo.thumbnailPath}`)
                // 1, search deleted file
                const searchReq = Dty.FilesReq.makeReqStatusDel(repo.name)
                const searchResp = await appDb.filesSearch(searchReq)
                if (!searchResp.isSuccess()) {
                    logger.error(`search del file error: ${searchResp.status}`)
                    continue
                }
                const fileList = searchResp.data?.files ?? []
                let fCnt = 0
                for (const fInfo of fileList) {
                    if (bSyncPrjStop) {
                        logger.info(`prj sync stop cur in classify trash files`)
                        return resp
                    }
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

            // 4，check db
            {
                const respDb = await traversalFolder.checkDb()
                if (!respDb.isSuccess()) {
                    return respDb
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
        1，首先遍历仓库文件夹，解析文件信息，保存到数据库中。同时修复数据库记录。
        2，文件分类，从数据库中搜索文件，按照文件的创建时间，把文件
    分散到各个子文件夹中。 数据库中会跟新文件路径信息。
        3，删除文件的缩略图的移动到缩略图的回收站中。

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

            //  save prj info
            if (bNeedSavePrjInfo) {
                workQueue.statusSet(logger.info(`save prj info start`))
                const prjInfo = req.data.prj
                if (prjInfo == null) {
                    return logStatusRespReturn(resp.err('prjInfo is null,err'))
                }
                const saveResp = await this.prjInfoSave(prjInfo)
                if (!saveResp.isSuccess()) {
                    return logStatusRespReturn(resp.err(`save prj info error ${saveResp.status}`))
                }
                resp.data.prj = prjInfo
                workQueue.statusSet(logger.info(`save prj info ${saveResp.status} ${prjInfo.path}`))
            }

            // traversal folder , check db
            if (bNeedClassifyFile) {
                workQueue.statusSet(logger.log('classify file start'))
                const classifyResp = await this.classifyFileStart(req.data.prj.dataRepo)
                if (!classifyResp.isSuccess()) {
                    return logStatusRespReturn(
                        resp.err(`classify file error ${classifyResp.status}`)
                    )
                }
                workQueue.statusSet(logger.log('classify file ', classifyResp.status))
            }

            // gen thumbnail
            if (bNeedGenThumb) {
                for (const repo of req.data.prj.dataRepo) {
                    if (repo.name == '' || repo.path == '') {
                        return logStatusRespReturn(resp.err('repo name or path is empty'))
                    }
                    await this.start_gen_thumbnail()
                }
            }
        }

        workQueue.statusSet('sync work success')
        const workResp: Dty.WorkResp<Dty.Resp<Dty.SyncPrjResp>> = { cmd: req.cmd, data: resp }
        Util.notifyRender(JSON.stringify(workResp))
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
        if (!response.isSuccess()) {
            return resp.err(`traversal folder error ${response.status}`)
        }
        // 缩略图安装时间排序
        response.data?.files.sort((a, b) => {
            const timeA = Dty.FileTools.miFilenameParse(a.name)?.startTime
            const timeB = Dty.FileTools.miFilenameParse(b.name)?.startTime
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
        if (!searchRe.isSuccess()) {
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

    async handle_open_video_dialog(): Promise<Dty.Resp<string>> {
        const resp = new Dty.Resp<string>()
        const result = await dialog.showOpenDialog({
            title: '选择视频文件',
            filters: [
                { name: '视频文件', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'] }
            ],
            properties: ['openFile']
        })
        if (result.canceled || result.filePaths.length === 0) {
            return resp.err('user canceled')
        }
        resp.data = result.filePaths[0]
        return resp.success('success')
    }

    async handle_clip_project_save(req: Dty.Req<Dty.ClipProject>): Promise<Dty.Resp<string>> {
        const resp = new Dty.Resp<string>()
        if (!req.data) {
            return resp.err('clip project data is null')
        }

        const clipProject = req.data
        const now = new Date().toISOString()
        clipProject.updatedAt = now

        if (!clipProject.createdAt) {
            clipProject.createdAt = now
        }

        let savePath = clipProject.path

        if (!savePath) {
            const videoDir = path.dirname(clipProject.filePath)
            const defaultName =
                clipProject.name ||
                path.basename(clipProject.filePath, path.extname(clipProject.filePath))
            const defaultPath = path.join(videoDir, `${defaultName}.clip.json`)

            const result = await dialog.showSaveDialog({
                title: '保存剪辑项目',
                defaultPath: defaultPath,
                filters: [
                    { name: 'Clip Project', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            })

            if (result.canceled || !result.filePath) {
                return resp.err('user canceled')
            }
            savePath = result.filePath
        }

        try {
            clipProject.path = savePath
            await fs.promises.writeFile(savePath, JSON.stringify(clipProject, null, 2), 'utf-8')
            this.addRecentProject(savePath)
            resp.data = savePath
            return resp.success('success')
        } catch (err) {
            logger.error('save clip project failed:', err)
            return resp.err(`save failed: ${err}`)
        }
    }

    async handle_clip_project_save_as(req: Dty.Req<Dty.ClipProject>): Promise<Dty.Resp<string>> {
        const resp = new Dty.Resp<string>()
        if (!req.data) {
            return resp.err('clip project data is null')
        }

        const clipProject = req.data
        const videoDir = path.dirname(clipProject.filePath)
        const videoBasename = path.basename(
            clipProject.filePath,
            path.extname(clipProject.filePath)
        )
        const defaultPath = path.join(videoDir, `${videoBasename}.clip.json`)

        const result = await dialog.showSaveDialog({
            title: '保存剪辑项目',
            defaultPath: defaultPath,
            filters: [
                { name: '剪辑项目文件', extensions: ['clip.json'] },
                { name: 'JSON 文件', extensions: ['json'] }
            ]
        })

        if (result.canceled || !result.filePath) {
            return resp.err('user canceled')
        }

        const now = new Date().toISOString()
        clipProject.updatedAt = now
        if (!clipProject.createdAt) {
            clipProject.createdAt = now
        }

        try {
            await fs.promises.writeFile(
                result.filePath,
                JSON.stringify(clipProject, null, 2),
                'utf-8'
            )
            resp.data = result.filePath
            return resp.success('success')
        } catch (err) {
            logger.error('save clip project as failed:', err)
            return resp.err(`save failed: ${err}`)
        }
    }

    async handle_clip_project_open(): Promise<Dty.Resp<Dty.ClipProject>> {
        const resp = new Dty.Resp<Dty.ClipProject>()

        const result = await dialog.showOpenDialog({
            title: '打开剪辑项目',
            filters: [{ name: '剪辑项目文件', extensions: ['clip.json', 'json'] }],
            properties: ['openFile']
        })

        if (result.canceled || result.filePaths.length === 0) {
            return resp.err('user canceled')
        }

        const filePath = result.filePaths[0]

        try {
            const content = await fs.promises.readFile(filePath, 'utf-8')
            const clipProject: Dty.ClipProject = JSON.parse(content)

            if (!fs.existsSync(clipProject.filePath)) {
                return resp.err(`video file not found: ${clipProject.filePath}`)
            }

            resp.data = clipProject
            return resp.success('success')
        } catch (err) {
            logger.error('open clip project failed:', err)
            return resp.err(`open failed: ${err}`)
        }
    }

    async handle_select_folder(mainWindow: Electron.BrowserWindow): Promise<Dty.Resp<string>> {
        const resp = new Dty.Resp<string>()
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Folder',
            properties: ['openDirectory']
        })
        if (result.canceled || result.filePaths.length === 0) {
            return resp.err('user canceled')
        }
        resp.data = result.filePaths[0]
        return resp.success('success')
    }

    async handle_create_prj_with_path(
        req: Dty.Req<Dty.CreatePrjWithPathReq>
    ): Promise<Dty.Resp<Dty.CreatePrjResp>> {
        const resp = new Dty.Resp<Dty.CreatePrjResp>()
        if (req.data == null) {
            return resp.err('req.data is null')
        }
        const { dataRepo, projectPath } = req.data

        if (!projectPath || !fs.existsSync(projectPath)) {
            return resp.err('project path is invalid')
        }

        const folderContent = fs.readdirSync(projectPath)
        if (folderContent.length > 0) {
            return resp.err('The selected folder is not empty')
        }

        return await this.create_prj(
            { cmd: Dty.CmdType.createPrjWithPath, data: { dataRepo, projectPath } },
            Util.pathToLinuxStyle(projectPath)
        )
    }

    async handle_open_external_video(req: Dty.Req<Dty.Req_SltFile>): Promise<Dty.Resp<Dty.File>> {
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
        if (!fs.existsSync(video_path)) {
            return resp.err('file not exist')
        }
        const ext = path.extname(video_path).toLowerCase()
        const videoExts = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm']
        if (!videoExts.includes(ext)) {
            return resp.err('not a video file')
        }
        try {
            const mediaInfo = await mediaProc.getVideoInfo(video_path)
            const stat = fs.statSync(video_path)
            resp.data.name = path.basename(video_path)
            resp.data.path = video_path
            resp.data.size = stat.size
            resp.data.mediaInfo = mediaInfo
            resp.data.startTimeSec = 0
            resp.data.endTimeSec = mediaInfo.duration
            resp.data.duration = mediaInfo.duration
            resp.data.splitInfo = new Dty.SqlitInfos()
            resp.data.splitInfo.splits = []
            const itemInfo: Dty.SplitInfo = {
                startTime: 0,
                endTime: mediaInfo.duration,
                duration: mediaInfo.duration,
                percent: 100,
                frameNum: Math.round(mediaInfo.duration * (mediaInfo.video?.frame_rate || 25)),
                color: '#669999',
                currentTime: 0,
                frameIdx: 0,
                isDelete: false
            }
            resp.data.splitInfo.splits.push(itemInfo)
            this.addRecentFile(video_path)
            return resp.success('success')
        } catch (error) {
            logger.error('get video info error:', error)
            return resp.err('get video info error')
        }
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
                Util.notifyRender(JSON.stringify({ cmd: req.cmd, data: resp }))
            })
            .catch((error: unknown) => {
                logger.error('get frame info err:', error)
                resp.err(error as string)
                Util.notifyRender(
                    JSON.stringify({
                        cmd: req.cmd,
                        data: resp
                    })
                )
            })
        resp.success()
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

    async handle_open_prj(
        mainWindow: Electron.BrowserWindow
    ): Promise<Dty.Resp<Dty.Prj | Dty.ClipProject>> {
        const resp = new Dty.Resp<Dty.Prj | Dty.ClipProject>()
        try {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile'],
                filters: [
                    { name: 'Project Files', extensions: ['json', 'prj'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            })

            if (canceled) {
                return resp.err('user canceled')
            }

            const filePath = filePaths[0]
            const fileContent = await fs.promises.readFile(filePath, 'utf-8')
            const projectData = JSON.parse(fileContent)

            if (projectData.type === Dty.ProjectType.ClipEdit) {
                const clipProject = projectData as Dty.ClipProject
                if (!fs.existsSync(clipProject.filePath)) {
                    return resp.err(`video file not found: ${clipProject.filePath}`)
                }
                this.addRecentProject(filePath)
                resp.data = clipProject
                return resp.success('success')
            } else {
                return await this.openProjectByPath(filePath)
            }
        } catch (error) {
            logger.error('Error opening project file:', error)
            return resp.err(
                `Error opening project file: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    async openProjectByPath(prjFile: string): Promise<Dty.Resp<Dty.Prj | Dty.ClipProject>> {
        const resp = new Dty.Resp<Dty.Prj | Dty.ClipProject>()
        try {
            if (!fs.existsSync(prjFile)) {
                return resp.err('Project file not found')
            }

            const fileContent = await fs.promises.readFile(prjFile, 'utf-8')
            const projectData = JSON.parse(fileContent)

            if (projectData.type === Dty.ProjectType.ClipEdit) {
                const clipProject = projectData as Dty.ClipProject
                if (!fs.existsSync(clipProject.filePath)) {
                    return resp.err(`video file not found: ${clipProject.filePath}`)
                }
                this.addRecentProject(prjFile)
                resp.data = clipProject
                return resp.success('success')
            }

            const prjInfo = projectData as Dty.Prj
            prjInfo.path = prjFile
            appCfg.prj = prjInfo
            appCfg.appInfo.prjFile = prjFile
            this.addRecentProject(prjFile)

            const prjFilePath = path.dirname(prjFile)
            const respDb = await appDb.initDb(path.join(prjFilePath, 'db'))
            if (!respDb.isSuccess()) {
                return resp.err('init db error')
            }

            for (let i = 1; i < 11; i++) {
                const tag: Dty.Tag = {
                    id: 0,
                    name: `sys_score${i}`,
                    color: '#4A6FA5',
                    description: ''
                }
                await appDb.tag_insert(tag)
            }

            resp.success('File opened successfully').data = prjInfo
            return resp
        } catch (error) {
            logger.error('Error opening project file:', error)
            return resp.err(
                `Error opening project file: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    async handle_close_prj(): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        appCfg.appInfo.prjFile = ''
        this.saveAppCfg()
        await appDb.close()
        logger.info('Project closed successfully')
        return resp.success('Project closed successfully')
    }

    async handle_prj_save(
        mainWindow: Electron.BrowserWindow,
        req: Dty.Req<Dty.Prj>
    ): Promise<Dty.Resp<string>> {
        const resp = new Dty.Resp<string>()
        if (!req.data) {
            return resp.err('project data is null')
        }

        const prj = req.data
        let savePath = prj.path

        if (!savePath) {
            const result = await dialog.showSaveDialog(mainWindow, {
                title: '保存项目',
                defaultPath: prj.name || 'untitled',
                filters: [
                    { name: 'Project Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            })

            if (result.canceled || !result.filePath) {
                return resp.err('user canceled')
            }
            savePath = result.filePath
        }

        try {
            prj.path = savePath
            await fs.promises.writeFile(savePath, JSON.stringify(prj, null, 2), 'utf-8')
            appCfg.prj = prj
            appCfg.appInfo.prjFile = savePath
            this.addRecentProject(savePath)
            this.saveAppCfg()
            resp.data = savePath
            return resp.success('success')
        } catch (err) {
            logger.error('save project failed:', err)
            return resp.err(`save failed: ${err}`)
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
        if (req.cmd == Dty.CmdType.thumbImgGet) {
            const cmdReq: Dty.Req<Dty.ThumbImgGetReq> = {
                cmd: req.cmd,
                cseq: req.cseq,
                data: JSON.parse(req.data ? req.data : '{}') as Dty.ThumbImgGetReq
            }
            logger.info(
                `cmd:${cmd}:${cseq}, video=${cmdReq.data?.videoName}, thumb=${cmdReq.data?.thumbName}`
            )
            return this.cmdRespMake(await this.handle_thumb_img_get(cmdReq))
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
            case Dty.CmdType.prjOpen: {
                logger.info(`cmd:${cmd}:${cseq}, ${req}`)
                return this.cmdRespMake(await this.handle_open_prj(mainWin!))
            }
            case Dty.CmdType.prjOpenByPath: {
                const cmdReq = convertCmdRequest<Dty.Req_OpenPrj>(req)
                logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.prjFile}`)
                return this.cmdRespMake(await this.openProjectByPath(cmdReq.data?.prjFile || ''))
            }
            case Dty.CmdType.prjClose: {
                logger.info(`cmd:${cmd}:${cseq}`)
                return this.cmdRespMake(await this.handle_close_prj())
            }
            case Dty.CmdType.prjSave: {
                const cmdReq = convertCmdRequest<Dty.Prj>(req)
                logger.info(`cmd:${cmd}:${cseq}`)
                return this.cmdRespMake(await this.handle_prj_save(mainWin!, cmdReq))
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
            case Dty.CmdType.videoCut: {
                const cmdReq = convertCmdRequest<Dty.Req_CutVideo>(req)
                logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.filepath}`)
                return this.cmdRespMake(await recordsProc.start_cut_video(cmdReq))
            }
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
            case Dty.CmdType.openExternalVideo: {
                const cmdReq = convertCmdRequest<Dty.Req_SltFile>(req)
                logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.filepath}`)
                return this.cmdRespMake(await this.handle_open_external_video(cmdReq))
            }
            case Dty.CmdType.openVideoDialog: {
                logger.info(`cmd:${cmd}:${cseq}`)
                return this.cmdRespMake(await this.handle_open_video_dialog())
            }
            case Dty.CmdType.clipProjectSave: {
                const cmdReq = convertCmdRequest<Dty.ClipProject>(req)
                logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.filePath}`)
                return this.cmdRespMake(await this.handle_clip_project_save(cmdReq))
            }
            case Dty.CmdType.clipProjectSaveAs: {
                const cmdReq = convertCmdRequest<Dty.ClipProject>(req)
                logger.info(`cmd:${cmd}:${cseq}`)
                return this.cmdRespMake(await this.handle_clip_project_save_as(cmdReq))
            }
            case Dty.CmdType.clipProjectOpen: {
                logger.info(`cmd:${cmd}:${cseq}`)
                return this.cmdRespMake(await this.handle_clip_project_open())
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
            case Dty.CmdType.tagUpdate: {
                const cmdReq = convertCmdRequest<Dty.TagUpdateReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, id:${cmdReq.data?.id}`)
                return this.cmdRespMake(await this.handle_tag_update(cmdReq))
            }
            case Dty.CmdType.tagDelete: {
                const cmdReq = convertCmdRequest<Dty.TagDeleteReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, id:${cmdReq.data?.id}`)
                return this.cmdRespMake(await this.handle_tag_delete(cmdReq))
            }
            case Dty.CmdType.filesGet: {
                const cmdReq = convertCmdRequest<Dty.FilesReq>(req)
                logger.info(`cmd:${cmd}:${cseq}`)
                return this.cmdRespMake(await this.handle_files_get(cmdReq))
            }
            case Dty.CmdType.selectFolder: {
                logger.info(`cmd:${cmd}:${cseq}`)
                return this.cmdRespMake(await this.handle_select_folder(mainWin!))
            }
            case Dty.CmdType.createPrjWithPath: {
                const cmdReq = convertCmdRequest<Dty.CreatePrjWithPathReq>(req)
                logger.info(`cmd:${cmd}:${cseq}`)
                return this.cmdRespMake(await this.handle_create_prj_with_path(cmdReq))
            }
            case Dty.CmdType.parseMp4Box: {
                const cmdReq = convertCmdRequest<Dty.ParseMp4BoxReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, path:${cmdReq.data?.filePath}`)
                return this.cmdRespMake(await this.handle_parse_mp4_box(cmdReq))
            }
            case Dty.CmdType.analyzeFrames: {
                const cmdReq = convertCmdRequest<Dty.AnalyzeFramesReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, path:${cmdReq.data?.filePath}`)
                return this.cmdRespMake(await this.handle_analyze_frames(cmdReq))
            }
            default: {
                console.log(`Unknown event: ${cmd}:${cseq}`)
                const resp = new Dty.Resp()
                return resp.err(`Unknown event: ${cmd}`)
            }
        }
    }

    async handle_parse_mp4_box(
        req: Dty.Req<Dty.ParseMp4BoxReq>
    ): Promise<Dty.Resp<Dty.ParseMp4BoxResp>> {
        const resp = new Dty.Resp<Dty.ParseMp4BoxResp>()
        if (!req.data?.filePath) {
            return resp.err('filePath is required')
        }
        return await mp4Parser.parseMp4Box(req.data.filePath)
    }

    async handle_analyze_frames(
        req: Dty.Req<Dty.AnalyzeFramesReq>
    ): Promise<Dty.Resp<Dty.AnalyzeFramesResp>> {
        const resp = new Dty.Resp<Dty.AnalyzeFramesResp>()
        if (!req.data?.filePath) {
            return resp.err('filePath is required')
        }
        return await mp4Parser.analyzeFrames(
            req.data.filePath,
            req.data.page || 1,
            req.data.pageSize || 200,
            req.data.startTime
        )
    }
}

const appProc = new AppProc()
export default appProc
