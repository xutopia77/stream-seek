export enum CmdType {
    heartBeat = 'heart_beat',
    app_start = 'app_start',
    get_key_frame_info = 'get_key_frame_info',
    tags_get = 'tags_get',
    filesGet = 'files_get',
    fileTagsSet = 'file_tags_set',
    tagsSearch = 'search_tag',
    search_file = 'search_file',
    sltVideo = 'slt_video',
    openExternalVideo = 'open_external_video',
    openVideoDialog = 'open_video_dialog',
    videoCut = 'cut_video',
    thumbGet = 'thumbGet',
    thumbDel = 'thumbDel',
    prjOpen = 'open_prj',
    prjOpenByPath = 'open_prj_by_path',
    prjClose = 'close_prj',

    prjSync = 'sync_prj',
    SyncStop = 'syncStop',

    videoDel = 'delete_video',

    tinyFileDbStart = 'tinyFileDbStart',
    tinyFileDbStop = 'tinyFileDbStop',
    selectFolder = 'select_folder',
    createPrjWithPath = 'create_prj_with_path'
}

export const httpSrvPort: number = 58080

export class RecentItem {
    name: string = ''
    path: string = ''
    lastOpened: number = 0
}

export class AppInfo {
    prjFile: string = ''
    recentFiles: RecentItem[] = []
    recentProjects: RecentItem[] = []
}

export class AppStartResp {
    appInfo: AppInfo = new AppInfo()
    prj: Prj | null = null
}

export class Req_OpenPrj {
    prjFile: string = ''
}

export type MessageShowType = 'success' | 'error' | 'warning' | 'info'
export class MessageReq {
    content: string = ''
    duration?: number = 0
    type: MessageShowType = 'success' //success, error, info, warning
}

export class ThumbnailInfo {
    path: string[] = []
}

export class FileInfo {
    title: string = ''
    filePath: string = '' //文件的路径，由后端赋值
    // src: string = '' // 文件的url由前端组装
    size: number = 0
    // birthtime: string
    // mtime: string
}

// 定义一个枚举，是数字类型，表示文件的状态
export enum Fstatus {
    Normal = 0, // 正常
    Deleted = 1, // 删除,在回收站中
    Error = 2, // 错误
    /**
     * 数据库中存在，但是文件夹中不存在
     * 记录不正确，例如是删除的文件记录，但是在文件夹中仍然存在
     */
    Destroy = 3, // 销毁
    Nothing = 4 // 文件也不存在，文件对应的缩略图也不存在
}

// Fstatus 枚举值的描述映射
const FileStatusMap: { [key: number]: string } = {
    [Fstatus.Normal]: 'Normal',
    [Fstatus.Deleted]: 'Trash',
    [Fstatus.Error]: 'Error',
    [Fstatus.Destroy]: 'Destroy'
}

// 获取文件状态的描述文本
export function fileStatusGet(status: Fstatus): string {
    return FileStatusMap[status] || 'Unknown'
}

export enum FileType {
    Mp4 = 0,
    Image = 1,
    Txt = 2
}

export class File {
    id: number = 0 // 视频 ID，新增时可省略
    name: string = '' // 视频名称 00_20250301124348_20250301124906.mp4
    path: string = '' // 视频文件路径
    startTimeSec: number = 0 // 视频开始时间，单位秒
    endTimeSec: number = 0 // 视频结束时间，单位秒
    duration: number = 0 // 视频时长
    size: number = 0 // 视频大小，单位字节
    mediaInfo: MediaInfo | null = null // 以json字符串的形式存储在数据库
    splitInfo: SqlitInfos | null = null // 以json字符串的形式存储在数据库
    frameInfo: FrameInfo | null = null // 以json字符串的形式存储在数据库
    thumbnail: ThumbnailInfo = new ThumbnailInfo() // 以json字符串的形式存储在数据库
    eventInfo: FileEventInfo | null = null // 以json字符串的形式存储在数据库
    type: FileType = FileType.Mp4 // 数据类型
    status: Fstatus = Fstatus.Normal // 数据状态
    repo: string = '' // 数据仓库名称
    description?: string = '' // file description
    tags: Tag[] = []
    static makePlayUrl(finfo: File): string {
        return `file://${finfo.path}`
    }
    static makeDisplayName(f: File): string {
        let displayName = ''
        {
            // 10_20250301105200_20250301105306.mp4
            const fileNameInfo = FileTools.miFilenameParse(f.name)
            if (fileNameInfo === null) {
                return this.name
            }

            const year = fileNameInfo?.startTime.slice(0, 4)
            const month = fileNameInfo?.startTime.slice(4, 6)
            const day = fileNameInfo?.startTime.slice(6, 8)
            const hour = fileNameInfo?.startTime.slice(8, 10)
            const minute = fileNameInfo?.startTime.slice(10, 12)
            const second = fileNameInfo?.startTime.slice(12, 14)

            // const endhour = fileNameInfo?.endTime.slice(8, 10)
            // const endminute = fileNameInfo?.endTime.slice(10, 12)
            // const endsecond = fileNameInfo?.endTime.slice(12, 14)

            let durationStr = ''
            if (f.duration < 60) {
                durationStr = `${f.duration}s`
            } else if (f.duration < 60 * 60) {
                const minutes = Math.floor(f.duration / 60)
                const seconds = Math.floor(f.duration % 60)
                durationStr = `${minutes}m ${seconds}s`
            } else if (f.duration < 60 * 60 * 24) {
                const hours = Math.floor(f.duration / (60 * 60))
                const minutes = Math.floor((f.duration % (60 * 60)) / 60)
                const seconds = Math.floor(f.duration % 60)
                durationStr = `${hours}h ${minutes}m ${seconds}s`
            } else {
                const days = Math.floor(f.duration / (60 * 60 * 24))
                const hours = Math.floor((f.duration % (60 * 60 * 24)) / (60 * 60))
                const minutes = Math.floor((f.duration % (60 * 60)) / 60)
                const seconds = Math.floor(f.duration % 60)
                durationStr = `${days}d ${hours}h ${minutes}m ${seconds}s`
            }
            displayName = `${year}${month}${day}-${hour}:${minute}:${second}_${durationStr}`
        }
        for (const tInfo of f.tags) {
            displayName += ` ${Utils.makeTagShowName(tInfo.name)}`
        }
        return displayName
    }
}

export class FileModel {
    id?: number // 视频 ID，新增时可省略
    name: string = '' // 视频名称
    path: string = '' // 视频文件路径
    startTimeSec: number = 0 // 视频开始时间，单位秒
    endTimeSec: number = 0 // 视频结束时间，单位秒
    duration: number = 0 // 视频时长
    size: number = 0 // 视频大小，单位字节
    mediaInfo: string = '' // 以json字符串的形式存储在数据库
    splitInfo: string = '' // 以json字符串的形式存储在数据库
    frameInfo: string = '' // 以json字符串的形式存储在数据库
    thumbnail: string = '' // 以json字符串的形式存储在数据库
    eventInfo: string = '' // 以json字符串的形式存储在数据库
    type: FileType = FileType.Mp4 // 数据类型
    status: Fstatus = Fstatus.Normal // 数据状态
    repo: string = '' // 数据仓库名称
    infoHash?: string = '' // data info hash value, calculate way: repo+path
    description?: string = '' // file description
    created_at?: string = '' // create time, add when insert
    updated_at?: string = '' // update time, add when update
    deleted_at?: string = '' // delete time, add when delete
    static makeInfoHash(repo: string, fPath: string, fStatus: Fstatus): string {
        switch (fStatus) {
            case Fstatus.Normal:
                return `${repo}+${fPath}`
            case Fstatus.Deleted:
            case Fstatus.Destroy:
            case Fstatus.Error:
            case Fstatus.Nothing: {
                const currentTime = Date.now()
                return `${repo}+${fPath}+${fStatus}+${currentTime}`
            }
            default:
                return `${repo}+${fPath}`
        }
    }
}

export class FileViewModel {
    id?: number // 视频 ID，新增时可省略
    name: string = '' // 视频名称
    path: string = '' // 视频文件路径
    startTimeSec: number = 0 // 视频开始时间，单位秒
    endTimeSec: number = 0 // 视频结束时间，单位秒
    duration: number = 0 // 视频时长
    size: number = 0 // 视频大小，单位字节
    mediaInfo: string = '' // 以json字符串的形式存储在数据库
    splitInfo: string = '' // 以json字符串的形式存储在数据库
    frameInfo: string = '' // 以json字符串的形式存储在数据库
    thumbnail: string = '' // 以json字符串的形式存储在数据库
    eventInfo: string = '' // 以json字符串的形式存储在数据库
    type: FileType = FileType.Mp4 // 数据类型
    status: Fstatus = Fstatus.Normal // 数据状态
    repo: string = '' // 数据仓库名称
    infoHash?: string = '' // data info hash value, calculate way: repo+path
    description?: string = '' // file description
    created_at?: string = '' // create time, add when insert
    updated_at?: string = '' // update time, add when update
    deleted_at?: string = '' // delete time, add when delete
    tagName: string = ''
    tagColor: string = ''
}

export const tagDefColor = '#4A6FA5'
export const tagNoneDefName = 'sys_score0'

export class Tag {
    id: number = 0
    name: string = ''
    color: string = ''
}

export class TagModel {
    id?: number
    name: string = ''
    color: string = ''
    created_at?: string = '' // create time, add when insert
    updated_at?: string = '' // update time, add when update
    deleted_at?: string = '' // delete time, add when delete
}

export class FileTag {
    id: number = 0
    fileId: number = 0
    tagId: number = 0
}

export class FileTagModel {
    id?: number
    fileId: number = 0
    tagId: number = 0
    uniqueHash: string = '' // fileId + tagId
    created_at?: string = '' // create time, add when insert
    updated_at?: string = '' // update time, add when update
    deleted_at?: string = '' // delete time, add when delete
}

export class CreatePrjWithPathReq {
    dataRepo: DataRepo[] = []
    projectPath: string = ''
}

export class CreatePrjResp {
    prj: Prj = new Prj()
    prjFile: string = ''
}

export interface SplitInfo {
    startTime: number
    endTime: number // 原数据中为字符串，这里统一为数字类型，若需要字符串类型可修改
    duration: number // 原数据中为字符串，这里统一为数字类型，若需要字符串类型可修改
    percent: number
    color: string
    currentTime: number
    isDelete: boolean
    frameIdx: number
    frameNum: number
}

export class SqlitInfos {
    splits: SplitInfo[] = []
}

export interface BarClip {
    percent: number
    width: number
    color: string
    tip: string
}

export interface FileEventInfo {
    time: number
    area: number
    x: number
    y: number
    width: number
    height: number
    center_x: number
    center_y: number
    distance: number
    object_id: number
}

export interface MediaInfo {
    nb_streams: number
    duration: number
    size: number
    start_time: number
    bit_rate: number
    video: {
        codec_name: string
        codec_type: string
        width: number
        height: number
        pix_fmt: string
        bit_rate: number
        frame_rate: number
        nb_frames: number
    }
    audio: {
        codec_name: string
        codec_type: string
        sample_rate: number
        channels: number
        bit_rate: number
        channel_layout: string
    }
}

export interface SltMediaInfo {
    mediaInfo?: MediaInfo
    eventInfo?: {
        start_time: string
        end_time: string
        execution_time: number
        file_name: string
        events: FileEventInfo[][]
    }
    splitInfo?: SplitInfo[]
    frameInfo?: FrameInfo
    thumbnail?: File[]
    // keyFrameSplitInfo?: any[]
}

export interface SltMedia {
    title: string
    src: string
    size: number
    birthtime: string
    mtime: string
    filePath: string
}

export interface MediaItem {
    title: string
    src: string
    size: number
    birthtime: string
    mtime: string
    filePath: string
}

export enum RepoType {
    Normal = 'normal',
    Trash = 'trash'
}

export class DataRepo {
    path: string = ''
    name: string = '' // 需要唯一
    thumbnailPath: string = ''
    framePath: string = ''
    static getRepoByPath(name: string, repos: DataRepo[]): DataRepo | null {
        for (const repo of repos) {
            if (repo.name == name) {
                return repo
            }
        }
        return null
    }
}

export class TrasStatus {
    folderNum: number = 0
    fileNum: number = 0
    fileErrNum: number = 0
}

export enum ThumbStrategy {
    ByTime = 'time',
    BySize = 'size'
}

export enum ThumbType {
    Thumb = 'thumb',
    Frame = 'frame',
    FnameThumb = 'fNameThumb'
}

export type LangType = 'zh-CN' | 'en-US'

// 项目配置，存储在项目json文件中
export class Prj {
    name: string = ''
    version: string = '3.0.0'
    path: string = '' //  project path
    thumbStrategy: ThumbStrategy = ThumbStrategy.BySize // 缩略图策略
    thumbEachSec: number = 0.1 // 每多少秒生成一张缩略图
    thumbEachSize: number = 1024 * 1024 * 10 // 每多少字节生成一张缩略图
    numEachFolder: number = 10 // 每个文件夹多少视频文件
    dataRepo: DataRepo[] = []
    repoType: RepoType = RepoType.Normal
    language: LangType = 'zh-CN'
}

export class Tiny2DbReq {
    tinyFilePath: string = ''
    tinyFileDbPath: string = ''
}

export interface WorkResp<T = string> {
    cmd: CmdType
    data: T
}

export class HeartBeat {
    time: string = ''
    appStatus: string = ''
    processing: boolean = false
    workRespose: WorkResp[] = []
}

export interface Req_TraversalFolder {
    type?: string
    startTime?: string //2025-03-25 12:00:00
    endTime?: string //2025-03-25 12:59:59
}

export interface TraversalFolder {
    folder?: string
    files?: File[]
}

export interface Req_CutVideo {
    fileInfo: File
    filepath: string
    filename: string
}

export interface Resp_CutVideo {
    traversalResp?: Resp<TraversalFolder>
}

export class DeleteFileReq {
    type: 'del' | 'destroy' = 'del' // del 移动到回收站， destroy 删除文件
    bDelThumb: boolean = false
    // 有效字段 path， repo， 其他字段不用理会
    files: File[] = []
}

export class DeleteFileResp {}

export interface Frame {
    pict_type: string
    pts_time: number
}

export interface FrameInfo {
    frames: Frame[]
}

export interface Req_FrameInfo {
    filepath: string
}

export interface Req_SltFile {
    filepath: string
}

export interface Req_SearchFile {
    folder: string
}

export interface Req_ClearWork {
    files?: File[]
}

export enum SyncType {
    all = 'all',
    prjInfo = 'prjInfo',
    classify = 'classify',
    thumbnail = 'thumbnail'
}
export class SyncPrjReq {
    type: SyncType[] = [SyncType.all]
    prj: Prj = new Prj()
}
export class SyncPrjResp {
    prj: Prj | null = null
}
export interface Req_SyncTrash {
    folder: string
}

export class FileTagsReqItem {
    fileId: number = 0
    tagName: string = ''
}

export class FileTagsReq {
    fileTags: FileTagsReqItem[] = []
}

export class FilesReq {
    page?: number | null = null // 页码，从 1 开始
    pageSize: number | null = null
    path: string | null = null
    repo: string | null = null
    status: Fstatus[] = []
    startTimeSecMin: number | null = null
    startTimeSecMax: number | null = null
    endTimeSecMin: number | null = null
    endTimeSecMax: number | null = null
    durationMin: number | null = null
    durationMax: number | null = null
    sizeMin: number | null = null
    sizeMax: number | null = null
    tags: string[] = []
    type: FileType[] = []
    // 升序，降序
    order: 'asc' | 'desc' = 'asc' // 枚举值直接传入数据库
    orderBy: 'id' | 'name' | 'startTimeSec' | 'created_at' | 'updated_at' = 'startTimeSec' // 枚举值直接传入数据库

    static makeReqStatusNormal(path: string | null, repo: string | null): FilesReq {
        const req = new FilesReq()
        req.path = path
        req.repo = repo
        req.status = [Fstatus.Normal]
        return req
    }
    static makeReqStatusDel(repo: string | null): FilesReq {
        const req = new FilesReq()
        req.repo = repo
        req.status = [Fstatus.Deleted]
        return req
    }
}

export class FilesResp {
    total: number = 0
    files: File[] = []
}

export class TagsReq {
    page?: number | null = null // 页码，从 1 开始
    pageSize: number | null = null
    name: string | null = null
    color: string | null = null
    order: 'asc' | 'desc' = 'asc' // 枚举值直接传入数据库
    orderBy: 'id' | 'name' | 'created_at' | 'updated_at' = 'created_at' // 枚举值直接传入数据库
    static makeReq(page: number, pageSize: number): TagsReq {
        const req = new TagsReq()
        req.page = page
        req.pageSize = pageSize
        return req
    }
}
export class TagsResp {
    total: number = 0
    tags: Tag[] = []
}
// ======================== main

export class DbInsertResp {
    id: number = 0
}

// ======================== render

export interface FileTagsSetParam {
    bNeedUpdate?: boolean
    bNeedSltCurVideo?: boolean
}

export enum WorkPanel {
    List = 'list',
    Operate = 'operate',
    VideoInfo = 'videoInfo'
}

export class ClearSltInfoReq {
    clearModel?: string
    bNotClear_curSltVideo?: boolean
}

export interface CutVideoReq {
    bDelFullVideo?: boolean
}

// ========================
export enum RespCode {
    Success = 0,
    Error = 1,
    FileExist = 1001
}

export class Resp<T = string> {
    code: RespCode
    status: string
    bOver?: boolean // 是否执行，结束
    data?: T

    constructor() {
        this.code = RespCode.Success
        this.status = 'success'
        this.bOver = undefined
        this.data = undefined
    }
    err(desc: string): Resp<T> {
        this.code = RespCode.Error
        this.status = desc
        return this
    }
    success(desc: string = 'success'): Resp<T> {
        this.code = RespCode.Success
        this.status = desc
        return this
    }
    isSuccess(): boolean {
        return this.code === RespCode.Success
    }
}

export interface Req<T = string> {
    cmd: CmdType
    data?: T
    cseq?: number
}

// ======================== tools

// 定义解析文件名后的返回类型 10_20250301104336_20250301104500.mp4
interface ParsedFilename {
    sequence: string // 10
    startTime: string // 20250301104336
    endTime: string // 20250301104500
    startTimeSec: number // 开始时间 单位秒
    endTimeSec: number // 结束时间 单位秒
    durationSec: number // 视频时长 单位秒
}

export class FileTools {
    // 将秒数转换为特定格式的时间字符串 20250323140336
    static parsetimeToTimeStr(time: number): string {
        // 将秒数转换为 Date 对象
        const date = new Date(time * 1000)

        // 提取年、月、日、时、分、秒并格式化为两位数字
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hour = String(date.getHours()).padStart(2, '0')
        const minute = String(date.getMinutes()).padStart(2, '0')
        const second = String(date.getSeconds()).padStart(2, '0')

        // 组合成 20250323140336 格式的字符串
        const picTimeStr = `${year}${month}${day}${hour}${minute}${second}`
        return picTimeStr
    }
    // 解析文件名，提取序号、开始时间和结束时间 10_20250301104336_20250301104500.mp4
    static miFilenameParse(title: string | null): ParsedFilename | null {
        if (title == null) {
            return null
        }
        const [sequence, startTime, endTimeWithExtension] = title.split('_')
        if (endTimeWithExtension === undefined) {
            return null
        }
        const endTime = endTimeWithExtension.replace('.mp4', '')
        const fileNameInfo: ParsedFilename = {
            sequence,
            startTime,
            endTime,
            startTimeSec: FileTools.parse_timestr_2_seconds(startTime),
            endTimeSec: FileTools.parse_timestr_2_seconds(endTime),
            durationSec:
                FileTools.parse_timestr_2_seconds(endTime) -
                FileTools.parse_timestr_2_seconds(startTime)
        }
        return fileNameInfo
    }
    // 将时间字符串转换为秒数 20250301104336 => 1682831816
    static parse_timestr_2_seconds(timeStr: string): number {
        const year = parseInt(timeStr.slice(0, 4), 10)
        const month = parseInt(timeStr.slice(4, 6), 10) - 1 // 月份从0开始
        const day = parseInt(timeStr.slice(6, 8), 10)
        const hour = parseInt(timeStr.slice(8, 10), 10)
        const minute = parseInt(timeStr.slice(10, 12), 10)
        const second = parseInt(timeStr.slice(12, 14), 10)
        return new Date(year, month, day, hour, minute, second).getTime() / 1000
    }
    // 将秒数转换为时间字符串 1682831816 => 20250301104336
    static parse_seconds_2_timestr(seconds: number): string {
        const date = new Date(seconds * 1000) // 将秒转换为毫秒
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const secs = String(date.getSeconds()).padStart(2, '0')
        return `${year}${month}${day}${hours}${minutes}${secs}`
    }
}

export class Utils {
    // 这里把秒变成为时分秒的形式
    static time_2_msec_str(time: number): string {
        const hours = Math.floor(time / 3600)
        const minutes = Math.floor((time % 3600) / 60)
        const seconds = Math.floor(time % 60)
        const milliseconds = Math.floor((time - Math.floor(time)) * 1000)
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
    }

    static makeTagShowName(tagName: string): string {
        switch (tagName) {
            case 'sys_score0':
                return ''
            case 'sys_score1':
                return '1☆'
            case 'sys_score2':
                return '2☆'
            case 'sys_score3':
                return '3☆'
            case 'sys_score4':
                return '4☆'
            case 'sys_score5':
                return '5☆'
            case 'sys_score6':
                return '6☆'
            case 'sys_score7':
                return '7☆'
            case 'sys_score8':
                return '8☆'
            case 'sys_score9':
                return '9☆'
            case 'sys_score10':
                return '10☆'
            default:
                return tagName
        }
    }
}
