import logger from './Logger'
import * as DataTypes from '../../bridge/dataTypedef'
import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'

async function initDb(dbFolderPath: string): Promise<DataTypes.Resp> {
  if (dbFolderPath === '') return new DataTypes.Resp().err('dbFolderPath is empty')
  const resp = new DataTypes.Resp()
  try {
    // 检查文件夹是否存在，不存在则创建
    await import('fs/promises').then((fs) => fs.mkdir(dbFolderPath, { recursive: true }))
    const dbFilePath = `${dbFolderPath}/app.db`

    // 打开或创建 SQLite 数据库
    const db: Database = await open({
      filename: dbFilePath,
      driver: sqlite3.Database
    })

    // 创建视频信息表格
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        startTimeSec INTEGER NOT NULL,
        endTimeSec INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        size INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `
    await db.exec(createTableQuery)
    appDb.db = db
    logger.info('Database initialized successfully')
    return resp.success('Database initialized successfully')
  } catch (error) {
    logger.error('Error initializing database:', error)
    return resp.err(
      `Error initializing database: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

class AppDb {
  public db?: Database
  public initDb = initDb
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close()
    }
  }

  async insertFile(file: DataTypes.FileModel): Promise<DataTypes.Resp> {
    const resp = new DataTypes.Resp()
    try {
      if (!this.db) throw new Error('Database not initialized')
      const result = await this.db.run(
        'INSERT INTO files (name, path, startTimeSec, endTimeSec, duration, size) VALUES (?, ?, ?, ?, ?, ?)',
        [file.name, file.path, file.startTimeSec, file.endTimeSec, file.duration, file.size]
      )
      logger.info('Video added successfully. ID:', result.lastID)
      // resp.success('Video added successfully').data = { id: result.lastID }
    } catch (error) {
      logger.error('Error adding video:', error)
      resp.err(`Error adding video: ${error instanceof Error ? error.message : String(error)}`)
    }
    return resp
  }

  // 删除视频信息
  async deleteVideo(video: Pick<DataTypes.FileModel, 'id'>): Promise<DataTypes.Resp> {
    const resp = new DataTypes.Resp()
    try {
      if (!this.db) throw new Error('Database not initialized')
      const result = await this.db.run('DELETE FROM files WHERE id = ?', [video.id])
      if (result.changes === 0) {
        resp.err('Video not found')
      } else {
        resp.success('Video deleted successfully')
      }
    } catch (error) {
      logger.error('Error deleting video:', error)
      resp.err(`Error deleting video: ${error instanceof Error ? error.message : String(error)}`)
    }
    return resp
  }

  // 修改视频信息
  async updateVideo(video: DataTypes.FileModel): Promise<DataTypes.Resp> {
    const resp = new DataTypes.Resp()
    try {
      if (!this.db) throw new Error('Database not initialized')
      if (!video.id) {
        resp.err('Video ID is required for update')
        return resp
      }
      const result = await this.db.run(
        'UPDATE files SET name = ?, path = ?, duration = ? WHERE id = ?',
        [video.name, video.path, video.duration, video.id]
      )
      if (result.changes === 0) {
        resp.err('Video not found')
      } else {
        resp.success('Video updated successfully')
      }
    } catch (error) {
      logger.error('Error updating video:', error)
      resp.err(`Error updating video: ${error instanceof Error ? error.message : String(error)}`)
    }
    return resp
  }

  // 查询所有视频信息
  async getVideos(): Promise<DataTypes.Resp<DataTypes.FileModel[]>> {
    const resp = new DataTypes.Resp<DataTypes.FileModel[]>()
    try {
      if (!this.db) throw new Error('Database not initialized')
      const files = await this.db.all<DataTypes.FileModel[]>('SELECT * FROM files')
      resp.success('Videos fetched successfully').data = files
    } catch (error) {
      logger.error('Error fetching files:', error)
      resp.err(`Error fetching files: ${error instanceof Error ? error.message : String(error)}`)
    }
    return resp
  }

  // 根据 ID 查询单个视频信息
  async getVideoById(
    video: Pick<DataTypes.FileModel, 'id'>
  ): Promise<DataTypes.Resp<DataTypes.FileModel>> {
    const resp = new DataTypes.Resp<DataTypes.FileModel>()
    try {
      if (!this.db) throw new Error('Database not initialized')
      const videoData = await this.db.get<DataTypes.FileModel>(
        'SELECT * FROM files WHERE id = ?',
        [video.id]
      )
      if (videoData) {
        resp.success('Video fetched successfully').data = videoData
      } else {
        resp.err('Video not found')
      }
    } catch (error) {
      logger.error('Error fetching video by ID:', error)
      resp.err(
        `Error fetching video by ID: ${error instanceof Error ? error.message : String(error)}`
      )
    }
    return resp
  }
}

const appDb = new AppDb()
export default appDb
