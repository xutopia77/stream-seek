import logger from './Logger'
import * as Dty from '../../bridge/dataTypedef'
import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'

class FileSearchParam {
    query: string = ``
    countQuery: string = `` // 用于统计总记录数
    params: unknown[] = []
    countParams: unknown[] = [] // 统计总记录数的参数
}

class AppDb {
    public db?: Database
    private tbl_files = 'files'
    private tbl_filesview = 'files_view'
    private tbl_tags = 'tags'
    private tbl_fileTag = 'fileTags'

    public async initDb(dbFolderPath: string): Promise<Dty.Resp> {
        if (dbFolderPath === '') return new Dty.Resp().err('dbFolderPath is empty')
        const resp = new Dty.Resp()
        try {
            // 检查文件夹是否存在，不存在则创建
            await import('fs/promises').then((fs) => fs.mkdir(dbFolderPath, { recursive: true }))
            const dbFilePath = `${dbFolderPath}/app.db`
            // 打开或创建 SQLite 数据库
            const db: Database = await open({
                filename: dbFilePath,
                driver: sqlite3.Database
            })
            {
                const createTableQuery = `
                    CREATE TABLE IF NOT EXISTS ${this.tbl_files} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    path TEXT NOT NULL,
                    startTimeSec INTEGER NOT NULL,
                    endTimeSec INTEGER NOT NULL,
                    duration INTEGER NOT NULL,
                    size INTEGER NOT NULL,
                    mediaInfo TEXT,
                    splitInfo TEXT,
                    frameInfo TEXT,
                    thumbnail TEXT,
                    eventInfo TEXT,
                    type INTEGER NOT NULL,
                    status INTEGER NOT NULL,
                    repo TEXT NOT NULL,
                    infoHash TEXT NOT NULL UNIQUE,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    deleted_at DATETIME
                    );
                `
                await db.exec(createTableQuery)
            }
            {
                const createTableQuery = `
                    CREATE TABLE IF NOT EXISTS ${this.tbl_tags} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    color TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    deleted_at DATETIME
                    );
                `
                await db.exec(createTableQuery)
            }
            {
                const createTableQuery = `
                    CREATE TABLE IF NOT EXISTS ${this.tbl_fileTag} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fileId INTEGER NOT NULL,
                    tagId INTEGER NOT NULL,
                    uniqueHash TEXT NOT NULL UNIQUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    deleted_at DATETIME,
                    FOREIGN KEY (fileId) REFERENCES ${this.tbl_files}(id),
                    FOREIGN KEY (tagId) REFERENCES ${this.tbl_tags}(id)
                    );
                `
                await db.exec(createTableQuery)
            }
            {
                const createTableQuery = `CREATE VIEW IF NOT EXISTS ${this.tbl_filesview} AS
                    SELECT 
                        files.*,
                        tags.name AS tagName,
                        tags.color AS tagColor
                    FROM 
                        files
                    LEFT JOIN 
                        fileTags ON files.id = fileTags.fileId
                    LEFT JOIN 
                        tags ON tags.id = fileTags.tagId`
                await db.exec(createTableQuery)
            }
            appDb.db = db
            return resp.success(logger.info('Database initialized success'))
        } catch (error) {
            logger.error('Error initializing database:', error)
            return resp.err(
                `Error initializing database: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }
    async close(): Promise<void> {
        if (this.db) {
            await this.db.close()
        }
    }

    async file_insert(file: Dty.FileModel): Promise<Dty.Resp<Dty.DbInsertResp>> {
        const resp = new Dty.Resp<Dty.DbInsertResp>()
        resp.data = new Dty.DbInsertResp()
        try {
            if (!this.db) throw new Error('Database not initialized')
            file.infoHash = Dty.FileModel.makeInfoHash(file.repo, file.path, file.status)
            let sqlCmd = `INSERT INTO ${this.tbl_files} `
            const sqlParams: unknown[] = []
            const fields: string[] = []
            const values: string[] = []
            {
                fields.push('name')
                values.push('?')
                sqlParams.push(file.name)
            }
            {
                fields.push('path')
                values.push('?')
                sqlParams.push(file.path)
            }
            {
                fields.push('startTimeSec')
                values.push('?')
                sqlParams.push(file.startTimeSec)
            }
            {
                fields.push('endTimeSec')
                values.push('?')
                sqlParams.push(file.endTimeSec)
            }
            {
                fields.push('duration')
                values.push('?')
                sqlParams.push(file.duration)
            }
            {
                fields.push('size')
                values.push('?')
                sqlParams.push(file.size)
            }
            {
                fields.push('mediaInfo')
                values.push('?')
                sqlParams.push(file.mediaInfo)
            }
            {
                fields.push('splitInfo')
                values.push('?')
                sqlParams.push(file.splitInfo)
            }
            {
                fields.push('frameInfo')
                values.push('?')
                sqlParams.push(file.frameInfo)
            }
            {
                fields.push('thumbnail')
                values.push('?')
                sqlParams.push(file.thumbnail)
            }
            {
                fields.push('eventInfo')
                values.push('?')
                sqlParams.push(file.eventInfo)
            }
            {
                fields.push('type')
                values.push('?')
                sqlParams.push(file.type)
            }
            {
                fields.push('status')
                values.push('?')
                sqlParams.push(file.status)
            }
            {
                fields.push('repo')
                values.push('?')
                sqlParams.push(file.repo)
            }
            {
                fields.push('infoHash')
                values.push('?')
                sqlParams.push(file.infoHash)
            }
            {
                fields.push('description')
                values.push('?')
                sqlParams.push(file.description)
            }
            sqlCmd += '(' + fields.join(', ') + ') VALUES (' + values.join(', ') + ')'
            const result = await this.db.run(sqlCmd, sqlParams)
            // logger.info('Video added successfully. ID:', result.lastID)
            resp.data.id = result.lastID == null ? -1 : result.lastID
            resp.success('success')
        } catch (error) {
            if (error instanceof Error && 'code' in error) {
                const sqliteErrorCode = error.code
                if (sqliteErrorCode == 'SQLITE_CONSTRAINT') {
                    return resp.success('success file already exists')
                }
            }
            logger.error('Error adding video:', error)
            resp.err(
                `Error adding video: ${error instanceof Error ? error.message : String(error)}`
            )
        }
        return resp
    }

    // 删除视频信息
    async file_delete(video: Pick<Dty.FileModel, 'id'>): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        try {
            if (!this.db) throw new Error('Database not initialized')
            const result = await this.db.run(`DELETE FROM ${this.tbl_files} WHERE id = ?`, [
                video.id
            ])
            if (result.changes === 0) {
                resp.err('Video not found')
            } else {
                resp.success('Video deleted successfully')
            }
        } catch (error) {
            logger.error('Error deleting video:', error)
            resp.err(
                `Error deleting video: ${error instanceof Error ? error.message : String(error)}`
            )
        }
        return resp
    }

    // 修改视频信息
    async fileUpdate(fInfo: Dty.File): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        try {
            if (!this.db) throw new Error('Database not initialized')
            if (!fInfo.id) {
                resp.err('Video ID is required for update')
                return resp
            }
            let sqlCmd = `UPDATE ${this.tbl_files} SET `
            const sqlParams: unknown[] = []
            const updateFields: string[] = []
            {
                updateFields.push('name =?')
                sqlParams.push(fInfo.name)
            }
            {
                updateFields.push('path =?')
                sqlParams.push(fInfo.path)
            }
            {
                updateFields.push('startTimeSec =?')
                sqlParams.push(fInfo.startTimeSec)
            }
            {
                updateFields.push('endTimeSec =?')
                sqlParams.push(fInfo.endTimeSec)
            }
            {
                updateFields.push('duration =?')
                sqlParams.push(fInfo.duration)
            }
            {
                updateFields.push('size =?')
                sqlParams.push(fInfo.size)
            }
            {
                updateFields.push('mediaInfo =?')
                sqlParams.push(JSON.stringify(fInfo.mediaInfo))
            }
            {
                updateFields.push('splitInfo =?')
                sqlParams.push(JSON.stringify(fInfo.splitInfo))
            }
            {
                updateFields.push('frameInfo =?')
                sqlParams.push(JSON.stringify(fInfo.frameInfo))
            }
            {
                updateFields.push('thumbnail =?')
                sqlParams.push(JSON.stringify(fInfo.thumbnail))
            }
            {
                updateFields.push('eventInfo =?')
                sqlParams.push(JSON.stringify(fInfo.eventInfo))
            }
            {
                updateFields.push('type =?')
                sqlParams.push(fInfo.type)
            }
            {
                updateFields.push('status =?')
                sqlParams.push(fInfo.status)
            }
            {
                updateFields.push('repo =?')
                sqlParams.push(fInfo.repo)
            }
            {
                updateFields.push('description =?')
                sqlParams.push(fInfo.description)
            }
            let infoHash = Dty.FileModel.makeInfoHash(fInfo.repo, fInfo.path, fInfo.status)
            const curTimeStr = new Date().toLocaleString()
            if (fInfo.status == Dty.Fstatus.Deleted) {
                updateFields.push('deleted_at =?')
                sqlParams.push(curTimeStr)
                infoHash = Dty.FileModel.makeInfoHash(fInfo.repo, fInfo.path, fInfo.status)
            } else if (fInfo.status == Dty.Fstatus.Destroy || fInfo.status == Dty.Fstatus.Nothing) {
                updateFields.push('deleted_at =?')
                sqlParams.push(curTimeStr)
                infoHash = Dty.FileModel.makeInfoHash(fInfo.repo, fInfo.path, fInfo.status)
            } else {
                updateFields.push('updated_at =?')
                // 获取当前时间，这种形式 2025-07-18 15:14:41
                sqlParams.push(curTimeStr)
                updateFields.push('deleted_at =?')
                sqlParams.push(null)
            }
            {
                updateFields.push('infoHash = ?')
                sqlParams.push(infoHash)
            }
            sqlCmd += updateFields.join(', ')
            sqlCmd += ' WHERE id =?'
            sqlParams.push(fInfo.id)

            const result = await this.db.run(sqlCmd, sqlParams)
            if (result.changes === 0) {
                resp.err('Video not found')
            } else {
                resp.success('success')
            }
        } catch (error) {
            resp.err(logger.error('err:', error))
        }
        return resp
    }

    private make_file_search_param(tblName: string, req: Dty.FilesReq | null): FileSearchParam {
        let query = `SELECT * FROM ${tblName}`
        let countQuery = `SELECT COUNT(*) as total FROM ${tblName}` // 用于统计总记录数
        const params: unknown[] = []
        const countParams: unknown[] = [] // 统计总记录数的参数
        if (req != null) {
            const conditionsParam: string[] = []
            const countConditionsParam: string[] = []

            if (req.path != null) {
                conditionsParam.push('path = ?')
                countConditionsParam.push('path = ?')
                params.push(req.path)
                countParams.push(req.path)
            }
            if (req.repo != null) {
                conditionsParam.push('repo = ?')
                countConditionsParam.push('repo = ?')
                params.push(req.repo)
                countParams.push(req.repo)
            }
            if (req.status.length > 0) {
                const placeholders = req.status.map(() => '?').join(', ')
                conditionsParam.push(`status IN (${placeholders})`)
                countConditionsParam.push(`status IN (${placeholders})`)
                params.push(...req.status)
                countParams.push(...req.status)
            }
            if (req.startTimeSecMin != null) {
                conditionsParam.push('startTimeSec >= ?')
                countConditionsParam.push('startTimeSec >= ?')
                params.push(req.startTimeSecMin)
                countParams.push(req.startTimeSecMin)
            }
            if (req.startTimeSecMax != null) {
                conditionsParam.push('startTimeSec <= ?')
                countConditionsParam.push('startTimeSec <= ?')
                params.push(req.startTimeSecMax)
                countParams.push(req.startTimeSecMax)
            }
            if (req.endTimeSecMin != null) {
                conditionsParam.push('endTimeSec >= ?')
                countConditionsParam.push('endTimeSec >= ?')
                params.push(req.endTimeSecMin)
                countParams.push(req.endTimeSecMin)
            }
            if (req.endTimeSecMax != null) {
                conditionsParam.push('endTimeSec <= ?')
                countConditionsParam.push('endTimeSec <= ?')
                params.push(req.endTimeSecMax)
                countParams.push(req.endTimeSecMax)
            }
            if (req.durationMin != null) {
                conditionsParam.push('duration >= ?')
                countConditionsParam.push('duration >= ?')
                params.push(req.durationMin)
                countParams.push(req.durationMin)
            }
            if (req.durationMax != null) {
                conditionsParam.push('duration <= ?')
                countConditionsParam.push('duration <= ?')
                params.push(req.durationMax)
                countParams.push(req.durationMax)
            }
            if (req.sizeMin != null) {
                conditionsParam.push('size >= ?')
                countConditionsParam.push('size >= ?')
                params.push(req.sizeMin)
                countParams.push(req.sizeMin)
            }
            if (req.sizeMax != null) {
                conditionsParam.push('size <= ?')
                countConditionsParam.push('size <= ?')
                params.push(req.sizeMax)
                countParams.push(req.sizeMax)
            }
            if (req.type.length > 0) {
                const placeholders = req.type.map(() => '?').join(', ')
                conditionsParam.push(`type IN (${placeholders})`)
                countConditionsParam.push(`type IN (${placeholders})`)
                params.push(...req.type)
                countParams.push(...req.type)
            }

            if (conditionsParam.length > 0) {
                query += ' WHERE ' + conditionsParam.join(' AND ')
                countQuery += ' WHERE ' + countConditionsParam.join(' AND ')
            }
            if (req.orderBy && req.order) {
                query += ` ORDER BY ${req.orderBy} ${req.order}`
            }
            if (req.page && req.pageSize) {
                const offset = (req.page - 1) * req.pageSize
                query += ' LIMIT ? OFFSET ?'
                params.push(req.pageSize, offset)
            }
        }
        return {
            query: query,
            countQuery: countQuery,
            params: params,
            countParams: countParams
        }
    }

    async filesCount(req: Dty.FilesReq | null): Promise<Dty.Resp<Dty.FilesResp>> {
        const resp = new Dty.Resp<Dty.FilesResp>()
        try {
            const searchParam = this.make_file_search_param(this.tbl_files, req)
            const countQuery = searchParam.countQuery
            const countParams: unknown[] = searchParam.countParams
            if (!this.db) throw new Error('Database not initialized')
            // 执行统计总记录数的查询
            const countResult = await this.db.get<{ total: number }>(countQuery, countParams)
            const total = countResult?.total || 0

            resp.data = new Dty.FilesResp()
            resp.data.total = total
            resp.success('success')
        } catch (error) {
            logger.error(`Error fetching ${this.tbl_files}:`, error)
            resp.err(
                `Error fetching ${this.tbl_files}: ${error instanceof Error ? error.message : String(error)}`
            )
        }
        return resp
    }

    // 非必要，不要使用此函数
    async filesSearch(req: Dty.FilesReq | null): Promise<Dty.Resp<Dty.FilesResp>> {
        const resp = new Dty.Resp<Dty.FilesResp>()
        try {
            const searchParam = this.make_file_search_param(this.tbl_files, req)
            const query = searchParam.query
            const countQuery = searchParam.countQuery
            const params: unknown[] = searchParam.params
            const countParams: unknown[] = searchParam.countParams

            if (!this.db) throw new Error('Database not initialized')

            // 执行统计总记录数的查询
            const countResult = await this.db.get<{ total: number }>(countQuery, countParams)
            const total = countResult?.total || 0

            const fileModels = await this.db.all<Dty.FileModel[]>(query, params)
            resp.data = new Dty.FilesResp()
            resp.data.total = 0
            for (const fileModel of fileModels) {
                if (fileModel.id == undefined) {
                    continue
                }
                const fileInfo: Dty.File = new Dty.File()
                fileInfo.id = fileModel.id == undefined ? 0 : fileModel.id
                fileInfo.name = fileModel.name
                fileInfo.path = fileModel.path
                fileInfo.startTimeSec = fileModel.startTimeSec
                fileInfo.endTimeSec = fileModel.endTimeSec
                fileInfo.duration = fileModel.duration
                fileInfo.size = fileModel.size
                fileInfo.mediaInfo = JSON.parse(fileModel.mediaInfo || '{}')
                fileInfo.splitInfo = JSON.parse(fileModel.splitInfo || '{}')
                fileInfo.frameInfo = JSON.parse(fileModel.frameInfo || '{}')
                fileInfo.thumbnail = JSON.parse(fileModel.thumbnail || '{}')
                fileInfo.eventInfo = JSON.parse(fileModel.eventInfo || '{}')
                fileInfo.type = fileModel.type
                fileInfo.status = fileModel.status
                fileInfo.repo = fileModel.repo
                fileInfo.description = fileModel.description
                resp.data.files.push(fileInfo)
            }
            resp.data.total = total
            resp.success('success')
        } catch (error) {
            logger.error(`Error fetching ${this.tbl_files}:`, error)
            resp.err(
                `Error fetching ${this.tbl_files}: ${error instanceof Error ? error.message : String(error)}`
            )
        }
        return resp
    }

    async fileViewSearch(req: Dty.FilesReq | null): Promise<Dty.Resp<Dty.FilesResp>> {
        const resp = new Dty.Resp<Dty.FilesResp>()
        try {
            if (!this.db) throw new Error('Database not initialized')

            const searchParam = this.make_file_search_param(this.tbl_filesview, req)
            const query = searchParam.query
            const countQuery = searchParam.countQuery
            const params: unknown[] = searchParam.params
            const countParams: unknown[] = searchParam.countParams
            // logger.info(`search query:${query}`, params)
            // 执行统计总记录数的查询
            const countResult = await this.db.get<{ total: number }>(countQuery, countParams)
            const total = countResult?.total || 0

            // 执行主查询
            const fileViewModels = await this.db.all<Dty.FileViewModel[]>(query, params)
            // 按文件 ID 分组标签信息
            const fileMap = new Map<number, Dty.File>()
            for (const fileViewModel of fileViewModels) {
                if (fileViewModel.id === undefined) {
                    continue
                }

                let fileInfo = fileMap.get(fileViewModel.id)
                if (!fileInfo) {
                    fileInfo = new Dty.File()
                    fileInfo.id = fileViewModel.id
                    fileInfo.name = fileViewModel.name
                    fileInfo.path = fileViewModel.path
                    fileInfo.startTimeSec = fileViewModel.startTimeSec
                    fileInfo.endTimeSec = fileViewModel.endTimeSec
                    fileInfo.duration = fileViewModel.duration
                    fileInfo.size = fileViewModel.size
                    fileInfo.mediaInfo =
                        fileViewModel.mediaInfo == '' ? null : JSON.parse(fileViewModel.mediaInfo)
                    fileInfo.splitInfo =
                        fileViewModel.splitInfo == '' ? null : JSON.parse(fileViewModel.splitInfo)
                    fileInfo.frameInfo =
                        fileViewModel.frameInfo == '' ? null : JSON.parse(fileViewModel.frameInfo)
                    fileInfo.thumbnail =
                        fileViewModel.thumbnail == '' ? null : JSON.parse(fileViewModel.thumbnail)
                    fileInfo.eventInfo =
                        fileViewModel.eventInfo == '' ? null : JSON.parse(fileViewModel.eventInfo)

                    fileInfo.type = fileViewModel.type
                    fileInfo.status = fileViewModel.status
                    fileInfo.repo = fileViewModel.repo
                    fileInfo.description = fileViewModel.description
                    fileInfo.tags = []
                    fileMap.set(fileViewModel.id, fileInfo)
                }

                if (
                    fileViewModel.tagName != null &&
                    fileViewModel.tagName.length > 0 &&
                    fileViewModel.tagName != ''
                ) {
                    const tag: Dty.Tag = {
                        id: -1,
                        name: fileViewModel.tagName,
                        color: fileViewModel.tagColor || ''
                    }
                    fileInfo.tags.push(tag)
                }
            }

            resp.data = new Dty.FilesResp()
            resp.data.total = total
            resp.data.files = Array.from(fileMap.values())
            resp.success('success')
        } catch (error) {
            logger.error(`Error fetching ${this.tbl_filesview}:`, error)
            resp.err(
                `Error fetching ${this.tbl_filesview}: ${error instanceof Error ? error.message : String(error)}`
            )
        }
        return resp
    }
    async tag_insert(tag: Dty.Tag): Promise<Dty.Resp<Dty.DbInsertResp>> {
        const resp = new Dty.Resp<Dty.DbInsertResp>()
        resp.data = new Dty.DbInsertResp()
        try {
            if (!this.db) throw new Error('Database not initialized')
            let sqlCmd = `INSERT INTO ${this.tbl_tags} `
            const sqlParams: unknown[] = []
            const fields: string[] = []
            const values: string[] = []
            {
                fields.push('name')
                values.push('?')
                sqlParams.push(tag.name)
            }
            {
                fields.push('color')
                values.push('?')
                sqlParams.push(tag.color)
            }
            sqlCmd += '(' + fields.join(', ') + ') VALUES (' + values.join(', ') + ')'
            const result = await this.db.run(sqlCmd, sqlParams)
            resp.data.id = result.lastID == null ? -1 : result.lastID
            resp.success('success')
        } catch (error) {
            if (error instanceof Error && 'code' in error) {
                const sqliteErrorCode = error.code
                if (sqliteErrorCode == 'SQLITE_CONSTRAINT') {
                    return resp.success('success tag already exists')
                }
            }
            logger.error('Error adding tag:', error)
            resp.err(`Error adding tag: ${error instanceof Error ? error.message : String(error)}`)
        }
        return resp
    }

    async tag_delete(tag: Pick<Dty.Tag, 'id'>): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        try {
            if (!this.db) throw new Error('Database not initialized')
            const result = await this.db.run(`DELETE FROM ${this.tbl_tags} WHERE id =?`, [tag.id])
            if (result.changes === 0) {
                resp.err('Tag not found')
            } else {
                resp.success('Tag deleted successfully')
            }
        } catch (error) {
            logger.error('Error deleting tag:', error)
            resp.err(
                `Error deleting tag: ${error instanceof Error ? error.message : String(error)}`
            )
        }
        return resp
    }
    async tag_update(tag: Dty.Tag): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        try {
            if (!this.db) throw new Error('Database not initialized')
            if (!tag.id) {
                resp.err('Tag ID is required for update')
                return resp
            }
            let sqlCmd = `UPDATE ${this.tbl_tags} SET `
            const sqlParams: unknown[] = []
            const updateFields: string[] = []
            {
                updateFields.push('name =?')
                sqlParams.push(tag.name)
            }
            {
                updateFields.push('color =?')
                sqlParams.push(tag.color)
            }
            sqlCmd += updateFields.join(', ')
            sqlCmd += 'WHERE id =?'
            sqlParams.push(tag.id)
            const result = await this.db.run(sqlCmd, sqlParams)
            if (result.changes === 0) {
                resp.err('Tag not found')
            } else {
                resp.success('Tag updated successfully')
            }
        } catch (error) {
            logger.error('Error updating tag:', error)
            resp.err(
                `Error updating tag: ${error instanceof Error ? error.message : String(error)}`
            )
        }
        return resp
    }

    async tag_search(req: Dty.TagsReq | null): Promise<Dty.Resp<Dty.TagsResp>> {
        const resp = new Dty.Resp<Dty.TagsResp>()
        try {
            let query = `SELECT * FROM ${this.tbl_tags}`
            const params: unknown[] = []
            if (req != null) {
                const conditionsParam: string[] = []
                if (req.name != null) {
                    conditionsParam.push('name =?')
                    params.push(req.name)
                }
                if (req.color != null) {
                    conditionsParam.push('color =?')
                    params.push(req.color)
                }
                if (conditionsParam.length > 0) {
                    query += 'WHERE' + conditionsParam.join(' AND ')
                }
                if (req.orderBy && req.order) {
                    query += ` ORDER BY ${req.orderBy} ${req.order}`
                }
                if (req.page && req.pageSize) {
                    const offset = (req.page - 1) * req.pageSize
                    query += ' LIMIT ? OFFSET ? '
                    params.push(req.pageSize, offset)
                }
            }
            if (!this.db) throw new Error('Database not initialized')
            const tagModels = await this.db.all<Dty.TagModel[]>(query, params)
            resp.data = new Dty.TagsResp()
            resp.data.total = 0
            for (const tagModel of tagModels) {
                if (tagModel.id == undefined) {
                    continue
                }
                const tagInfo: Dty.Tag = new Dty.Tag()
                tagInfo.id = tagModel.id == undefined ? 0 : tagModel.id
                tagInfo.name = tagModel.name
                tagInfo.color = tagModel.color
                resp.data.tags.push(tagInfo)
            }
            resp.success('success')
        } catch (error) {
            logger.error(`Error fetching ${this.tbl_tags}:`, error)
            resp.err(
                `Error fetching ${this.tbl_tags}: ${error instanceof Error ? error.message : String(error)}`
            )
        }
        return resp
    }
    async file_tag_insert(req: Dty.FileTag): Promise<Dty.Resp<Dty.DbInsertResp>> {
        const resp = new Dty.Resp<Dty.DbInsertResp>()
        resp.data = new Dty.DbInsertResp()
        try {
            if (!this.db) throw new Error('Database not initialized')
            let sqlCmd = `INSERT INTO ${this.tbl_fileTag} `
            const sqlParams: unknown[] = []
            const fields: string[] = []
            const values: string[] = []
            {
                fields.push('fileId')
                values.push('?')
                sqlParams.push(req.fileId)
            }
            {
                fields.push('tagId')
                values.push('?')
                sqlParams.push(req.tagId)
            }
            {
                fields.push('uniqueHash')
                values.push('?')
                sqlParams.push(`${req.fileId}+${req.tagId}`)
            }
            sqlCmd += '(' + fields.join(', ') + ') VALUES (' + values.join(', ') + ')'
            const result = await this.db.run(sqlCmd, sqlParams)
            resp.data.id = result.lastID == null ? -1 : result.lastID
            resp.success('success')
        } catch (error) {
            if (error instanceof Error && 'code' in error) {
                const sqliteErrorCode = error.code
                if (sqliteErrorCode == 'SQLITE_CONSTRAINT') {
                    return resp.success('success file tag already exists')
                }
            }
            logger.error('Error adding file tag:', error)
            resp.err(
                `Error adding file tag: ${error instanceof Error ? error.message : String(error)}`
            )
        }
        return resp
    }
    async file_tag_delete(fileId: number, tagId: number): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        try {
            if (!this.db) throw new Error('Database not initialized')
            const result = await this.db.run(
                `DELETE FROM ${this.tbl_fileTag} WHERE fileId =? AND tagId =?`,
                [fileId, tagId]
            )
            if (result.changes === 0) {
                resp.err('File tag not found')
            } else {
                resp.success('File tag deleted successfully')
            }
        } catch (error) {
            logger.error('Error deleting file tag:', error)
            resp.err(
                `Error deleting file tag: ${error instanceof Error ? error.message : String(error)}`
            )
        }
        return resp
    }
    async file_tag_delete_all(fileId: number): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        try {
            if (!this.db) throw new Error('Database not initialized')
            const result = await this.db.run(`DELETE FROM ${this.tbl_fileTag} WHERE fileId =? `, [
                fileId
            ])
            // if (result.changes === 0) {
            //     resp.err('File tag not found')
            // } else {
            //     resp.success('File tag deleted successfully')
            // }
            resp.success(`${result.changes} file tag deleted successfully`)
            resp.success('File tag deleted successfully')
        } catch (error) {
            logger.error('Error deleting file tag:', error)
            resp.err(
                `Error deleting file tag: ${error instanceof Error ? error.message : String(error)}`
            )
        }
        return resp
    }
}

const appDb = new AppDb()
export default appDb
