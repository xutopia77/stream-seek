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

function logRespReturn<T>(resp: DataTypes.Resp<T>): DataTypes.Resp<T> {
    if (resp.code === 0) {
        logger.info(resp.status)
    } else {
        logger.error(resp.status)
    }
    return resp
}

class TraversalFolder {
    type: string | null = null // search时才遍历子文件夹
    repo: DataTypes.DataRepo = new DataTypes.DataRepo()
    bSort: boolean = false
    fileCount: number = 0

    async proc_one_file(fPath: string, fName: string, stats: fs.Stats): Promise<DataTypes.Resp> {
        this.fileCount++
        const now = Date.now()
        if ((now % 10) * 1000 === 0) {
            logger.info(`traversal file count: ${this.fileCount}`)
        }
        const resp: DataTypes.Resp = new DataTypes.Resp()
        const fileTimeInfo = DataTypes.FileTools.parse_filename_mi(fName)
        if (fileTimeInfo == null) {
            logger.warn(`traversal skip: ${fPath}`)
            return resp.err(`traversal skip: ${fPath}`)
        }
        const searchReq = DataTypes.FilesReq.makeReqStatusNotDel(fPath, this.repo.name)
        const respSearch = await appDb.file_search(searchReq)
        if (respSearch.code == 0) {
            if (respSearch.data?.files.length != null && respSearch.data.files.length > 0) {
                // logger.info(`file already exists: ${fPath}`)
                return resp.success(`file already exists: ${fPath}`)
            }
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
            type: DataTypes.FileType.Mp4,
            status: DataTypes.FileStatus.Normal,
            repo: this.repo.name
        }
        const respInsert = await appDb.file_insert(fileModel)
        logger.info(`insert id:${respInsert.data?.id} ${respInsert.status} ${fPath}`)
        return resp
    }

    // 递归遍历文件夹
    private async traversal_folder(): Promise<DataTypes.Resp> {
        const resp = new DataTypes.Resp()
        const folderPath = this.repo.path
        if (!folderPath) {
            return resp.err('folder is null')
        }
        try {
            const stack: string[] = [folderPath]
            while (stack.length > 0) {
                const currentPath = stack.pop()!
                try {
                    const currentFiles = await fs.promises.readdir(currentPath)
                    for (const file of currentFiles) {
                        const filePath = path.join(currentPath, file)
                        try {
                            const stats = await fs.promises.stat(filePath)
                            if (stats.isDirectory()) {
                                // 判断目录的名称，如果目录的名称是trash，则跳过
                                if (file === '.trash') {
                                    // logger.log(`traversal skip: ${filePath}`)
                                    continue
                                }
                                stack.push(filePath)
                            } else {
                                try {
                                    await this.proc_one_file(filePath, file, stats)
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

    // 启动文件夹遍历，并且把文件夹中的数据插入到数据库中
    async start(): Promise<DataTypes.Resp> {
        if (this.repo.path == '') {
            return new DataTypes.Resp().err('folder is null')
        }
        return this.traversal_folder()
    }

    async get_folder_files(): Promise<DataTypes.Resp<DataTypes.FilesResp>> {
        const resp = new DataTypes.Resp<DataTypes.FilesResp>()
        resp.data = new DataTypes.FilesResp()
        const folderPath = this.repo.path
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

    async handle_file_tags_set(req: DataTypes.Req<DataTypes.FileTagsReq>): Promise<DataTypes.Resp> {
        const resp = new DataTypes.Resp()
        resp.success('success')
        let tagResp = await appDb.tag_search(null)
        if (tagResp.code !== 0) {
            return resp.err(`tag search err: ${tagResp.status}`)
        }
        let tags = tagResp.data?.tags ?? []
        for (const item of req.data?.fileTags ?? []) {
            let tagInfo = tags.find((tag) => tag.name === item.tagName)
            if (tagInfo == null) {
                const tag: DataTypes.Tag = {
                    id: 0,
                    name: item.tagName,
                    color: '#FF5733'
                }
                const respInsert = await appDb.tag_insert(tag)
                if (respInsert.code !== 0) {
                    logger.error(`insert tag err: ${respInsert.status}`)
                    resp.err('insert tag error')
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
                    return resp.err(`tag search err: ${tagResp.status}`)
                }
            }
            const fileTag: DataTypes.FileTag = {
                id: 0,
                fileId: item.fileId,
                tagId: tagInfo?.id ?? 0
            }
            const respUpdate = await appDb.file_tag_insert(fileTag)
            if (respUpdate.code !== 0) {
                logger.error(`insert file tag err: ${respUpdate.status}`)
                resp.err('insert file tags error')
            } else {
                logger.info(
                    `insert file tag success: fId:${item.fileId},tagId:${fileTag.tagId},tagName:${item.tagName}`
                )
            }
        }
        return resp
    }
    async handle_tags_get(
        req: DataTypes.Req<DataTypes.TagsReq>
    ): Promise<DataTypes.Resp<DataTypes.TagsResp>> {
        return await appDb.tag_search(req.data == null ? null : req.data)
    }
    async handle_files_get(
        req: DataTypes.Req<DataTypes.FilesReq>
    ): Promise<DataTypes.Resp<DataTypes.FilesResp>> {
        return await appDb.file_view_search(req.data == null ? null : req.data)
    }

    async save_prj_info(prjInfo: DataTypes.Prj): Promise<DataTypes.Resp> {
        const resp = new DataTypes.Resp()
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
            }
        }
        const projectFilePath = path.join(prjInfo.path, 'project.json')
        const jsonContent = JSON.stringify(prjInfo, null, 2)
        await fs.promises.writeFile(projectFilePath, jsonContent, 'utf-8')
        resp.success('Project file created successfully')
        appCfg.appInfo.prjFile = projectFilePath
        appCfg.prj = prjInfo
        this.saveAppCfg()
        return resp
    }

    async create_prj(
        req: DataTypes.Req<DataTypes.CreatePrjReq>,
        folderPath: string
    ): Promise<DataTypes.Resp<DataTypes.CreatePrjResp>> {
        const resp = new DataTypes.Resp<DataTypes.CreatePrjResp>()
        resp.data = new DataTypes.CreatePrjResp()
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
        const folderName = path.basename(folderPath)
        const prjInfo: DataTypes.Prj = new DataTypes.Prj()
        prjInfo.name = folderName
        prjInfo.version = '1.0.0'
        prjInfo.path = folderPath
        prjInfo.dataRepo = req.data.dataRepo
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

            for (const repo of prjInfo.dataRepo) {
                repo.thumbnailPath = path.join(folderPath, 'thumbnail', repo.name)
            }
        }
        // 5, write prj info to file
        const saveResp = await this.save_prj_info(prjInfo)
        if (saveResp.code != 0) {
            return resp.err('save prj info error ' + saveResp.status)
        }
        resp.data.prj = prjInfo
        resp.success('Project file created successfully')
        return resp
    }

    async handle_app_start(): Promise<DataTypes.Resp<DataTypes.AppStartResp>> {
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
        for (let i = 0; i < 11; i++) {
            const tag: DataTypes.Tag = {
                id: 0,
                name: `level${i}`,
                color: '#FF5733'
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
    async handle_search_file(
        req: DataTypes.Req<DataTypes.FilesReq>
    ): Promise<DataTypes.Resp<DataTypes.FilesResp>> {
        return appDb.file_view_search(req.data == null ? null : req.data)
    }

    async start_gen_thumbnail(): Promise<DataTypes.Resp> {
        const resp = new DataTypes.Resp()
        const searchRe = await appDb.file_view_search(
            DataTypes.FilesReq.makeReqStatusNotDel(null, null)
        )
        if (searchRe.code !== 0) {
            return resp.err('search file error')
        }
        logger.log('start gen thumbnail total=', searchRe.data?.total)
        let count = 0
        for (const fileInfo of searchRe.data?.files ?? []) {
            const startTime = Date.now()
            const respThumb = await recordsProc.gen_thumbnail(fileInfo)
            const endTime = Date.now()
            const duration = ((endTime - startTime) / 1000).toFixed(3)
            count++
            if (respThumb.code !== 0) {
                if (respThumb.code == DataTypes.RespCode.FileExist) {
                    continue
                }
                logger.error('gen thumbnail error:', fileInfo.path, respThumb.status)
                continue
            } else {
                logger.info(
                    `gen thumbnail ${respThumb.status} ${fileInfo.path},num=${respThumb.data?.length},rate=${fileInfo.mediaInfo?.bit_rate},duration=${fileInfo.duration} s,coast ${duration} ms, ${count}/${searchRe.data?.total}`
                )
            }
            if (respThumb.data != null && respThumb.data.length > 0) {
                fileInfo.thumbnail = new DataTypes.ThumbnailInfo()
                fileInfo.thumbnail.path = respThumb.data
                await appDb.file_update(fileInfo)
            }
        }
        return resp
    }

    async start_classify_file(repos: DataTypes.DataRepo[]): Promise<DataTypes.Resp> {
        const resp = new DataTypes.Resp()
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
                await traversalFolder.start()
            }

            // 2, start search file from db
            {
                logger.info('start async folder:', repo.path)
                const searchReq = DataTypes.FilesReq.makeReqStatusNotDel(null, repo.name)
                searchReq.order = 'asc'
                searchReq.orderBy = 'startTimeSec'
                searchReq.status = []
                const searchResp = await appDb.file_view_search(searchReq)
                if (searchResp.code !== 0) {
                    logger.error(`search file error: ${searchResp.status}`)
                    continue
                }
                // 3, Check whether the files in the database exist in the folder. If not, mark them as destroyed
                const fileList = searchResp.data?.files ?? []
                for (const fInfo of fileList) {
                    if (!fs.existsSync(fInfo.path)) {
                        if (fInfo.status == DataTypes.FileStatus.Normal) {
                            logger.error(`file not exist destroy: ${fInfo.path}`)
                            fInfo.status = DataTypes.FileStatus.Destroy
                            await appDb.file_update(fInfo)
                            continue
                        }
                        if (fInfo.status == DataTypes.FileStatus.Deleted) {
                            const fTrashPath = recordsProc.file_trash_path_get(fInfo)
                            if (fTrashPath == '' || !fs.existsSync(fTrashPath)) {
                                logger.info(`file not exist destroy: ${fInfo.path}`)
                                fInfo.status = DataTypes.FileStatus.Destroy
                                await appDb.file_update(fInfo)
                                continue
                            } else {
                                logger.info(`update file path: ${fTrashPath}`)
                                fInfo.path = fTrashPath
                                await appDb.file_update(fInfo)
                                continue
                            }
                        }
                        if (fInfo.status == DataTypes.FileStatus.Destroy) {
                            continue
                        }
                    } else {
                        if (fInfo.status == DataTypes.FileStatus.Deleted) {
                            const fTrashPath = recordsProc.file_trash_path_get(fInfo)
                            const tmp1 = path.posix.normalize(fInfo.path)
                            const tmp2 = path.posix.normalize(fTrashPath)
                            if (tmp1 == tmp2) {
                                continue
                            }
                            logger.error(`file status ${fInfo.status} err : ${fInfo.path}`)
                            fInfo.status = DataTypes.FileStatus.Destroy
                            await appDb.file_update(fInfo)
                            continue
                        }
                    }
                }
            }
            // 4, search file from db again
            {
                const searchReq = DataTypes.FilesReq.makeReqStatusNotDel(null, repo.name)
                searchReq.order = 'asc'
                searchReq.orderBy = 'startTimeSec'
                const searchResp = await appDb.file_view_search(searchReq)
                if (searchResp.code !== 0) {
                    logger.error(`search file error: ${searchResp.status}`)
                    continue
                }
                const fileList = searchResp.data?.files ?? []
                // 5, start classify file
                // 5.1, make folder first
                const batchSize = 10
                const groupNum = Math.ceil(fileList.length / batchSize) + 1
                for (let i = 0; i < groupNum; i++) {
                    const grpPath = path.join(repo.path, `${i + 1}`)
                    if (!fs.existsSync(grpPath)) {
                        fs.mkdirSync(grpPath)
                    }
                }
                // 5.2, Classify the files into groups of 10
                for (let i = 0; i < fileList.length; i += batchSize) {
                    const batch = fileList.slice(i, i + batchSize)
                    for (const fileInfo of batch) {
                        const grpIdx = Math.floor(i / batchSize)
                        const grpPath = path.join(repo.path, `${grpIdx + 1}`)
                        const fileName = path.basename(fileInfo.path)
                        const dstPath = path.join(grpPath, fileName)
                        if (fileInfo.path == dstPath) {
                            continue
                        }
                        fs.renameSync(fileInfo.path, dstPath)
                        fileInfo.path = dstPath
                        const updateResp = await appDb.file_update(fileInfo)
                        if (updateResp.code !== 0) {
                            logger.error(`update file error: ${updateResp.status}`)
                            continue
                        }
                        logger.info(`group file success: ${fileInfo.path}`)
                    }
                }
            }
            // 6, start classify thumbnail trash folder
            {
                logger.info(`start classify thumbnail trash folder: ${repo.thumbnailPath}`)
                // 1, search deleted file
                const searchReq = DataTypes.FilesReq.makeReqStatusDel(repo.name)
                const searchResp = await appDb.file_view_search(searchReq)
                if (searchResp.code !== 0) {
                    logger.error(`search del file error: ${searchResp.status}`)
                    continue
                }
                const fileList = searchResp.data?.files ?? []
                for (const fInfo of fileList) {
                    // logger.info(`file : ${fInfo.path}`)
                    const searchReq = DataTypes.FilesReq.makeReqStatusNotDel(fInfo.path, fInfo.repo)
                    const searchResp = await appDb.file_view_search(searchReq)
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
                        const repo = DataTypes.DataRepo.getRepoByPath(
                            fInfo.repo,
                            appCfg.prj.dataRepo
                        )
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
                        logger.info(`move thumb ${file_thubmbnail_dir} to ${targetDir}`)
                    }
                }
            }
        }
        return resp
    }

    async start_sync_work(
        req: DataTypes.Req<DataTypes.SyncPrjReq>
    ): Promise<DataTypes.Resp<DataTypes.SyncPrjResp>> {
        const resp = new DataTypes.Resp<DataTypes.SyncPrjResp>()
        if (req.data == null) {
            return resp.err('req.data is null')
        }
        resp.data = new DataTypes.SyncPrjResp()

        let bNeedSavePrjInfo = false
        let bNeedGenThumb = false
        let bNeedClassifyFile = false
        for (const type of req.data.type) {
            if (type == DataTypes.SyncType.all) {
                bNeedSavePrjInfo = true
                bNeedGenThumb = true
                bNeedClassifyFile = true
                break
            }
            if (type == DataTypes.SyncType.prjInfo) {
                bNeedSavePrjInfo = true
            }
            if (type == DataTypes.SyncType.thumbnail) {
                bNeedGenThumb = true
            }
            if (type == DataTypes.SyncType.classify) {
                bNeedClassifyFile = true
            }
        }

        if (bNeedSavePrjInfo) {
            logger.info(`save prj info start`)
            const prjInfo = req.data.prj
            if (prjInfo == null) {
                return logRespReturn(resp.err('prjInfo is null'))
            }
            const saveResp = await this.save_prj_info(prjInfo)
            if (saveResp.code !== 0) {
                return logRespReturn(resp.err(`save prj info error ${saveResp.status}`))
            }
            resp.data.prj = prjInfo
            logger.info(`save prj info ${saveResp.status} ${prjInfo.path}`)
        }

        if (bNeedClassifyFile) {
            logger.log('classify file start')
            const classifyResp = await this.start_classify_file(req.data.prj.dataRepo)
            if (classifyResp.code !== 0) {
                return logRespReturn(resp.err(`classify file error ${classifyResp.status}`))
            }
            logger.log('classify file ', classifyResp.status)
        }

        if (bNeedGenThumb) {
            for (const repo of req.data.prj.dataRepo) {
                if (repo.name == '' || repo.path == '') {
                    return resp.err('repo name or path is empty')
                }
                const traversalFolder = new TraversalFolder()
                traversalFolder.type = null
                traversalFolder.repo = repo
                await traversalFolder.start()
                await this.start_gen_thumbnail()
            }
        }
        workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
        return resp
    }

    async query_images(fPath: string): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
        const resp = new DataTypes.Resp<DataTypes.TraversalFolder>()

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
        const searchReq = new DataTypes.FilesReq()
        searchReq.path = video_path
        const searchRe = await appDb.file_view_search(searchReq)
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
        if (appCfg.prj.repoType == DataTypes.RepoType.Normal) {
            if (fInfo.status != DataTypes.FileStatus.Normal) {
                return resp.err('file status is not normal')
            }
        }
        if (appCfg.prj.repoType == DataTypes.RepoType.Trash) {
            if (fInfo.status != DataTypes.FileStatus.Deleted) {
                return resp.err('file status is not delete')
            }
        }

        resp.success('success').data = fInfo
        if (resp.data.thumbnail?.path == null) {
            let bThumbExist = true
            const tra = new TraversalFolder()
            tra.repo.path = recordsProc.thumbnail_path_get_mp4(fInfo?.repo, fInfo?.path)
            if (!fs.existsSync(tra.repo.path)) {
                if (appCfg.prj.repoType == DataTypes.RepoType.Normal) {
                    logger.warn(`thumbnail not exist in repo path ${tra.repo.path}`)
                    bThumbExist = false
                } else {
                    tra.repo.path = recordsProc.thumbnail_trash_path_get_mp4(
                        fInfo?.repo,
                        fInfo?.path
                    )
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
                    resp.data.thumbnail = new DataTypes.ThumbnailInfo()
                    for (const item of fRe.data?.files ?? []) {
                        resp.data.thumbnail.path.push(item.path)
                    }
                }
            }
        }
        return resp
    }

    async delete_video(
        req: DataTypes.Req<DataTypes.DeleteFileReq>
    ): Promise<DataTypes.Resp<DataTypes.DeleteFileResp>> {
        const resp = new DataTypes.Resp<DataTypes.DeleteFileResp>()
        if (!req.data?.files || req.data.files.length === 0) {
            return resp.err('file is null')
        }
        for (const item of req.data.files) {
            const fRepo = DataTypes.DataRepo.getRepoByPath(item.repo, appCfg.prj.dataRepo)
            if (fRepo == null || fRepo.path == '') {
                return resp.err(`repo not exist ${item.repo},${item.path}`)
            }
            const trashFolderPath = path.join(fRepo.path, '.trash')
            {
                const resp_str = await make_trash_folder(trashFolderPath)
                if (resp_str.length > 0) {
                    logger.error('make trash folder error:', resp_str, item.path)
                    return resp.err(resp_str)
                }
            }
            const searchReq = DataTypes.FilesReq.makeReqStatusNotDel(item.path, item.repo)
            const searchResp = await appDb.file_view_search(searchReq)
            if (searchResp.code !== 0) {
                logger.error(`search file ${item.repo} ${item.path} err: ${searchResp.status}`)
                continue
            }
            if (searchResp.data?.files.length === 0) {
                logger.error(`delete file ${item.repo} ${item.path} not found`)
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
                        await fs.promises.rename(filepath, distFilename)
                        fInfo.status = DataTypes.FileStatus.Deleted
                        const respUp = await appDb.file_update(fInfo)
                        if (respUp.code != 0) {
                            logger.error(`update file status error: ${respUp.status} ${filepath}`)
                        } else {
                            logger.log(
                                `delete original video: ${filepath}, move to ${distFilename}`
                            )
                        }
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
