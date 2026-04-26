# Record Manager 项目设计文档

## 1. 项目概述

### 1.1 项目名称
**Record Manager** (录像文件智能管理系统)

### 1.2 版本信息
- 当前版本：3.1.2
- 项目类型：Electron + Vue 3 桌面应用程序
- 开发语言：TypeScript

### 1.3 项目描述
Record Manager 是一个专门用于管理监控摄像头录像文件的桌面应用系统。该系统提供视频文件的自动扫描入库、文件分类归整、缩略图/帧图生成、视频预览播放、标签分类检索、回收站管理等核心功能。

### 1.4 核心能力
| 功能模块 | 描述 |
|---------|------|
| 视频文件自动扫描入库 | 自动扫描指定目录下的视频文件，解析文件名并录入数据库 |
| 文件分类归整 | 根据配置规则对视频文件进行分类整理 |
| 缩略图/帧图生成 | 使用 FFmpeg 自动生成视频缩略图和关键帧图像 |
| 视频预览播放 | 支持视频播放、逐帧查看、进度条拖拽等操作 |
| 视频分片编辑 | 支持在光标处拆分片段、删除/恢复片段、导出剪辑 |
| 标签分类检索 | 为视频文件添加标签，支持按标签筛选和搜索 |
| 回收站管理 | 支持软删除（移至回收站）和彻底删除功能 |
| 小文件整理 | 将小文件缩略图整理到数据库中存储 |

---

## 2. 技术架构

### 2.1 整体架构
项目采用 **Electron 主进程 + 渲染进程** 的经典架构模式：

```
┌─────────────────────────────────────────────────────────────┐
│                        Electron 应用                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    IPC 通信     ┌──────────────────┐ │
│  │   渲染进程        │ ◄────────────► │   主进程          │ │
│  │   (Renderer)     │                │   (Main)         │ │
│  │                  │                │                  │ │
│  │  - Vue 3         │                │  - Node.js       │ │
│  │  - Vue Router    │                │  - SQLite3       │ │
│  │  - Pinia Store   │                │  - FFmpeg        │ │
│  │  - vue-i18n      │                │  - Express HTTP  │ │
│  └──────────────────┘                └──────────────────┘ │
│         ▲                                  │               │
│         │                                  │               │
│  ┌──────┴──────┐                   ┌──────┴──────┐        │
│  │  Preload 脚本│                   │  文件系统    │        │
│  │  (安全桥接)  │                   │  数据库      │        │
│  └─────────────┘                   └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈详情

#### 前端技术（渲染进程）
| 技术 | 版本 | 用途 |
|-----|------|------|
| Vue 3 | ^3.5.13 | UI 框架，使用 Composition API |
| TypeScript | ^5.8.2 | 类型安全编程语言 |
| Vue Router | ^4.5.0 | 前端路由管理 |
| Pinia | ^3.0.1 | 状态管理库 |
| vue-i18n | ^11.2.8 | 国际化支持（中文/英文） |
| Vite | ^6.2.3 | 构建工具和开发服务器 |
| electron-vite | ^3.1.0 | Electron 专用构建工具链 |

#### 后端技术（主进程）
| 技术 | 版本 | 用途 |
|-----|------|------|
| Electron | ^35.0.3 | 桌面应用框架 |
| Node.js | - | 运行时环境 |
| SQLite3 | ^5.1.7 / sqlite ^5.1.1 | 本地数据库 |
| Express | ^5.2.1 | HTTP 服务（可选） |
| FFmpeg | - | 视频处理工具（外部依赖） |
| FFprobe | - | 视频信息获取工具（外部依赖） |

#### 开发工具
| 工具 | 版本 | 用途 |
|-----|------|------|
| ESLint | ^9.23.0 | 代码检查 |
| Prettier | ^3.5.3 | 代码格式化 |
| electron-builder | ^25.1.8 | 打包发布工具 |
| vue-tsc | ^2.2.8 | Vue 类型检查 |
| vite-plugin-vue-devtools | ^7.7.2 | Vue 开发者工具 |

---

## 3. 目录结构

```
record-manager/
├── assets/                    # 静态资源（FFmpeg、FFprobe 可执行文件）
│   └── bin/
│       ├── ffmpeg.exe
│       └── ffprobe.exe
├── doc/                       # 项目文档
├── src/
│   ├── bridge/                # 共享类型定义（主进程与渲染进程共用）
│   │   └── dataTypedef.ts     # 所有数据类型、枚举、接口定义
│   ├── main/                  # Electron 主进程代码
│   │   ├── index.ts           # 主入口，创建窗口
│   │   └── proc_models/       # 业务处理模块
│   │       ├── AppProc.ts     # 应用核心逻辑，命令分发处理
│   │       ├── AppDb.ts       # 数据库操作封装
│   │       ├── AppCfg.ts      # 应用配置管理
│   │       ├── IpcHandlers.ts # IPC 事件处理器
│   │       ├── MediaProcess.ts# 视频媒体处理（FFmpeg 封装）
│   │       ├── RecordsProcess.ts # 录像文件处理
│   │       ├── Logger.ts      # 日志记录器
│   │       ├── TaskEvent.ts   # 任务队列管理
│   │       └── Utils.ts       # 工具函数集合
│   ├── preload/               # 预加载脚本（安全桥接）
│   │   ├── index.ts           # 预加载脚本实现
│   │   └── index.d.ts         # 类型声明
│   └── renderer/              # 渲染进程代码（Vue 前端）
│       └── src/
│           ├── main.ts        # Vue 入口文件
│           ├── App.vue        # 根组件
│           ├── router/        # 路由配置
│           │   └── router.ts
│           ├── stores/        # Pinia 状态管理
│           │   └── AppStore.ts
│           ├── utils/         # 工具函数
│           │   ├── util.ts    # 通用工具函数
│           │   └── ipcApi.ts  # IPC 通信封装
│           ├── i18n/          # 国际化配置
│           │   └── index.ts
│           ├── locales/       # 语言包
│           │   ├── zh-CN.json # 中文
│           │   └── en-US.json # 英文
│           ├── assets/        # 前端资源
│           │   └── common.css # 全局样式
│           └── components/    # Vue 组件
│               ├── AppEntry.vue        # 应用入口组件
│               ├── HomeNavigation.vue   # 顶部导航栏
│               ├── HomeEditor.vue       # 主页（视频分片编辑）
│               ├── FileManagement.vue   # 文件管理界面
│               ├── VideoPreview.vue     # 视频预览（旧版）
│               ├── Admin.vue            # 功能管理页面容器
│               ├── CreatePrj.vue        # 创建项目页面
│               ├── appSetting.vue       # 应用设置页面
│               ├── Versions.vue         # 版本信息组件
│               ├── MessageNotify/       # 消息通知模块
│               ├── admin_setting/       # 管理设置子模块
│               ├── admin_search/        # 管理搜索子模块
│               ├── common/              # 公共组件
│               ├── thumbMng/             # 缩略图管理模块
│               ├── tinyFileDb/          # 小文件数据库模块
│               ├── video_search/         # 视频搜索模块
│               └── video_view/           # 视频查看模块
├── electron.vite.config.ts      # Electron Vite 配置
├── package.json                 # 项目依赖配置
└── tsconfig.json                # TypeScript 配置
```

---

## 4. 系统设计

### 4.1 进程间通信（IPC）设计

#### 4.1.1 通信机制
采用 **IPC (Inter-Process Communication)** 模式进行主进程与渲染进程的通信：

```
渲染进程 (Renderer)                          主进程 (Main)
      │                                          │
      │  window.electron.ipcRenderer.invoke()    │
      │  ('render_event', JSON.stringify(req))   │
      ├─────────────────────────────────────────►│
      │                                          │
      │                              IpcHandlers.handle_event()
      │                              AppProc.handle_cmd()
      │                              处理业务逻辑...
      │                                          │
      │                          JSON.stringify(resp)│
      │◄─────────────────────────────────────────┤
      │                                          │
      │  返回 Promise<Resp<T>>                   │
```

#### 4.1.2 请求/响应格式

**请求格式 (Req<T>)：**
```typescript
interface Req<T = string> {
    cmd: CmdType;      // 命令类型枚举
    data?: T;          // 请求数据（JSON 序列化后传输）
    cseq?: number;     // 序列号（用于追踪请求）
}
```

**响应格式 (Resp<T>)：**
```typescript
interface Resp<T = string> {
    code: RespCode;    // 状态码：0=成功, 1=错误, 1001=文件已存在
    status: string;    // 状态描述
    bOver?: boolean;   // 是否执行完毕（异步任务可能为 false）
    data?: T;          // 响应数据（JSON 反序列化）
}
```

#### 4.1.3 命令类型定义 (CmdType)

| 命令标识 | 枚举值 | 描述 |
|---------|--------|------|
| `heart_beat` | heartBeat | 心跳检测，保持连接活跃 |
| `create_prj` | createPrj | 创建新项目 |
| `app_start` | appStart | 应用启动初始化 |
| `get_key_frame_info` | getKeyFrameInfo | 获取关键帧信息 |
| `tags_get` | tagsGet | 获取标签列表 |
| `files_get` | filesGet | 获取文件列表 |
| `file_tags_set` | fileTagsSet | 设置文件标签 |
| `search_tag` | tagsSearch | 搜索标签 |
| `search_file` | searchFile | 搜索文件 |
| `slt_video` | sltVideo | 选择/打开视频文件 |
| `open_external_video` | openExternalVideo | 打开外部视频文件 |
| `open_video_dialog` | openVideoDialog | 打开视频文件选择对话框 |
| `cut_video` | videoCut | 视频剪辑/裁剪 |
| `thumbGet` | thumbGet | 获取缩略图列表 |
| `thumbDel` | thumbDel | 删除缩略图 |
| `open_prj` | prjOpen | 打开已有项目 |
| `sync_prj` | prjSync | 同步项目数据 |
| `syncStop` | SyncStop | 停止同步 |
| `delete_video` | videoDel | 删除视频文件 |
| `tinyFileDbStart` | tinyFileDbStart | 启动小文件数据库整理 |
| `tinyFileDbStop` | tinyFileDbStop | 停止小文件数据库整理 |

#### 4.1.4 Preload API

预加载脚本通过 `contextBridge` 安全地暴露 API 给渲染进程：

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
    // 监听主进程主动推送的事件
    onSystemNotify: (callback: (data: unknown) => void) => {
        ipcRenderer.on('msg-notify', (_event, data) => callback(data))
    },
    // 获取拖拽文件的路径（使用 Electron webUtils）
    getPathForFile: (file: File): string => {
        return webUtils.getPathForFile(file)
    }
})
```

**getPathForFile 用途：**
- 在渲染进程中获取拖拽文件的真实路径
- 由于安全限制，渲染进程无法直接访问 `file.path`
- 使用 `webUtils.getPathForFile()` 安全获取文件路径

### 4.2 数据库设计

#### 4.2.1 数据库选型
使用 **SQLite** 作为本地嵌入式数据库，具有以下优势：
- 无需独立服务器进程
- 零配置部署
- 单文件存储，便于备份迁移
- 支持 SQL 标准

#### 4.2.2 数据表结构

**files 表（视频文件主表）：**
```sql
CREATE TABLE files (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,           -- 文件名
    path            TEXT NOT NULL,           -- 文件路径
    startTimeSec    INTEGER NOT NULL,        -- 开始时间（秒）
    endTimeSec      INTEGER NOT NULL,        -- 结束时间（秒）
    duration        INTEGER NOT NULL,        -- 时长（秒）
    size            INTEGER NOT NULL,        -- 文件大小（字节）
    mediaInfo       TEXT,                    -- 媒体信息（JSON字符串）
    splitInfo       TEXT,                    -- 分片信息（JSON字符串）
    frameInfo       TEXT,                    -- 帧信息（JSON字符串）
    thumbnail       TEXT,                    -- 缩略图信息（JSON字符串）
    eventInfo       TEXT,                    -- 事件信息（JSON字符串）
    type            INTEGER NOT NULL,        -- 文件类型
    status          INTEGER NOT NULL,        -- 文件状态
    repo            TEXT NOT NULL,           -- 所属仓库
    infoHash        TEXT NOT NULL UNIQUE,    -- 信息哈希（唯一索引）
    description     TEXT,                    -- 描述
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME,
    deleted_at      DATETIME
);
```

**tags 表（标签表）：**
```sql
CREATE TABLE tags (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,        -- 标签名称
    color       TEXT,                        -- 标签颜色
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME,
    deleted_at  DATETIME
);
```

**fileTags 表（文件-标签关联表）：**
```sql
CREATE TABLE fileTags (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    fileId      INTEGER NOT NULL,            -- 关联文件ID
    tagId       INTEGER NOT NULL,            -- 关联标签ID
    uniqueHash  TEXT NOT NULL UNIQUE,        -- 唯一哈希
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME,
    deleted_at  DATETIME,
    FOREIGN KEY (fileId) REFERENCES files(id),
    FOREIGN KEY (tagId)   REFERENCES tags(id)
);
```

**files_view 视图（文件+标签关联视图）：**
```sql
CREATE VIEW files_view AS
SELECT 
    files.*,
    tags.name AS tagName,
    tags.color AS tagColor
FROM files
LEFT JOIN fileTags ON files.id = fileTags.fileId
LEFT JOIN tags ON tags.id = fileTags.tagId;
```

#### 4.2.3 文件状态枚举 (Fstatus)

| 状态值 | 枚举名 | 描述 |
|-------|--------|------|
| 0 | Normal | 正常状态，文件可用 |
| 1 | Deleted | 已删除（在回收站中） |
| 2 | Error | 错误状态 |
| 3 | Destroy | 销毁状态（数据库有记录但文件不存在） |
| 4 | Nothing | 不存在（文件和缩略图均不存在） |

### 4.3 核心数据结构

#### 4.3.1 File 类（视频文件实体）
```typescript
class File {
    id: number;              // 视频 ID
    name: string;            // 文件名（如：00_20250313113251_20250313114420.mp4）
    path: string;            // 完整文件路径
    startTimeSec: number;    // 开始时间（秒）
    endTimeSec: number;      // 结束时间（秒）
    duration: number;        // 总时长（秒）
    size: number;            // 文件大小（字节）
    mediaInfo: MediaInfo;    // 媒体详细信息
    splitInfo: SqlitInfos;   // 分片信息
    frameInfo: FrameInfo;    // 帧信息
    thumbnail: ThumbnailInfo;// 缩略图信息
    eventInfo: FileEventInfo;// 事件检测信息
    type: FileType;          // 文件类型
    status: Fstatus;         // 文件状态
    repo: string;            // 所属仓库
    tags: Tag[];             // 关联标签列表
    
    // 静态方法
    static makePlayUrl(finfo: File): string;   // 生成播放URL
    static makeDisplayName(f: File): string;   // 生成显示名称
}
```

#### 4.3.2 MediaInfo 类（媒体信息）
```typescript
interface MediaInfo {
    nb_streams: number;      // 流数量
    duration: number;        // 总时长
    size: number;            // 文件大小
    start_time: number;      // 起始时间
    bit_rate: number;        // 比特率
    video: {
        codec_name: string;  // 编码格式
        codec_type: string;
        width: number;       // 分辨率宽度
        height: number;      // 分辨率高度
        pix_fmt: string;     // 像素格式
        bit_rate: number;
        frame_rate: number;  // 帧率
        nb_frames: number;   // 总帧数
    };
    audio: {
        codec_name: string;
        codec_type: string;
        sample_rate: number;
        channels: number;
        bit_rate: number;
        channel_layout: string;
    };
}
```

#### 4.3.3 SplitInfo 接口（分片信息）
```typescript
interface SplitInfo {
    startTime: number;       // 片段开始时间
    endTime: number;         // 片段结束时间
    duration: number;        // 片段时长
    percent: number;         // 百分比位置
    color: string;           // 显示颜色
    currentTime: number;     // 当前时间
    isDelete: boolean;       // 是否已删除标记
    frameIdx: number;        // 帧索引
    frameNum: number;        // 帧数量
}
```

#### 4.3.4 Prj 类（项目配置）
```typescript
class Prj {
    name: string;                    // 项目名称
    version: string = '3.0.0';       // 项目版本
    path: string;                    // 项目路径
    thumbStrategy: ThumbStrategy;    // 缩略图策略（按时间/按大小）
    thumbEachSec: number;            // 每N秒生成一张缩略图
    thumbEachSize: number;           // 每N字节生成一张缩略图
    numEachFolder: number;           // 每个文件夹存放的视频数
    dataRepo: DataRepo[];            // 数据仓库列表
    repoType: RepoType;              // 仓库模式（正常/回收站）
    language: LangType;              // 界面语言
}
```

### 4.4 状态管理设计 (Pinia Store)

**AppStore 全局状态：**
```typescript
interface AppStore {
    // 应用信息
    appInfo: AppInfo;
    prj: Prj;
    
    // 消息通知
    toasts: ToastMessage[];
    historyToasts: ToastMessage[];
    
    // 导航栏内容
    homeNavContent: string;
    
    // 视频播放控制
    videoPlayCtrl: {
        curSrc: string;          // 当前播放源
        curTime: number;         // 当前播放时间
        videoStartTime: number;  // 视频起始时间
        isPlay: boolean;         // 是否播放中
        isStop: boolean;         // 是否停止
        playbackRate: number;    // 播放倍速
    };
    
    // 视图模式
    curViewModel: 'video' | 'thumbnail';
    rightPanel: WorkPanel;       // 右侧面板类型
    
    // 文件数据
    videoList: File[];
    curCheckedVideo: Set<File>;
    curSltVideo: File | null;
    curSltVideoName4Play: string;
    
    // 缩略图数据
    thumbList: File[];
    curSltThumb: File | null;
    
    // 进度条控制
    barSeekTime: number;
    thumbSeekTime: number;
    
    // 标签数据
    tags: Tag[];
    
    // 功能函数引用
    func_nextFrame: (() => void) | null;
    func_prevFrame: (() => void) | null;
    func_get_ele_video: (() => HTMLVideoElement | null) | null;
}

// Getters
getters: {
    // 判断是否为项目模式（用户已打开或创建项目）
    isProjectMode: (state): boolean => {
        return state.appInfo.prjFile !== '';
    }
}
```

---

## 5. 功能模块详细设计

### 5.1 页面路由设计

| 路径 | 组件 | 描述 |
|-----|------|------|
| `/` | HomeEditor | **主页** - 视频分片编辑界面（支持拖拽打开） |
| `/file_management` | FileManagement | 文件管理界面（视频预览+文件列表） |
| `/admin` | Admin | 功能管理页面（含子路由） |
| `/admin/prj_set` | AdminSetting | 项目设置子页面 |
| `/admin/tag_mng` | AdminTagMng | 标签管理子页面 |
| `/create_prj` | CreatePrj | 创建新项目页面 |
| `/thumb_mng` | thumbMng | 缩略图管理页面 |
| `/tiny_file_db` | tinyFileDb | 小文件数据库整理页面 |
| `/app_setting` | appSetting | 应用设置页面 |

### 5.2 主页 (HomeEditor) 设计

主页是用户进入应用后的默认界面，专注于**视频分片编辑**功能。根据当前模式显示不同的界面布局。

#### 5.2.1 运行模式

系统支持两种运行模式，通过 `AppStore.isProjectMode` getter 判断：

| 模式 | 判断条件 | 描述 |
|-----|---------|------|
| **项目模式** | `appInfo.prjFile !== ''` | 用户打开了项目或新建了项目，可进行完整的文件管理 |
| **文件编辑模式** | `appInfo.prjFile === ''` | 用户直接打开单个视频文件，仅提供编辑功能 |

#### 5.2.2 布局结构

**项目模式布局：**
```
┌────────────────────────────────────────────────────────────┐
│  [文件] [视图] [功能] [帮助]                                 │
├──────────────────────────────────────┬─────────────────────┤
│                                      │                     │
│          视频预览区域 (75%)           │   右侧面板 (25%)     │
│          ┌──────────────────┐        │                     │
│          │                  │        │  VideList           │
│          │   Video/Thumb    │        │  VideoOperatePanel  │
│          │                  │        │  VideoInfo          │
│          │                  │        │  （可切换三种面板）   │
│          └──────────────────┘        │                     │
│                                      │                     │
├──────────────────────────────────────┴─────────────────────┤
│  PlayProgressBar (进度条)  │  PlayCtrl (播放控制)          │
└────────────────────────────────────────────────────────────┘
```

**文件编辑模式布局：**
```
┌────────────────────────────────────────────────────────────┐
│  [文件] [帮助]                                              │
├──────────────────────────────────────┬─────────────────────┤
│                                      │                     │
│          视频预览区域 (75%)           │   编辑面板 (25%)     │
│          ┌──────────────────┐        │                     │
│          │                  │        │  VideoOperatePanel  │
│          │   Video/Thumb    │        │  - 切换视图按钮      │
│          │                  │        │  - 拆分片段(➕)      │
│          │                  │        │  - 移除拆分(➖)      │
│          │                  │        │  - 删除片段(❌)      │
│          └──────────────────┘        │  - 恢复片段(🔃)      │
│                                      │  - 导出剪辑(✂)      │
│                                      │  - 分片列表         │
│                                      │                     │
├──────────────────────────────────────┴─────────────────────┤
│  PlayProgressBar (进度条)  │  PlayCtrl (播放控制)          │
└────────────────────────────────────────────────────────────┘
```

#### 5.2.3 导航菜单差异

| 菜单项 | 项目模式 | 文件编辑模式 |
|-------|---------|-------------|
| 文件 | ✓ | ✓ |
| 视图 | ✓ | ✗ |
| 功能 | ✓ | ✗ |
| 帮助 | ✓ | ✓ |

**文件菜单项：**
- 创建项目
- 打开项目
- 打开视频文件（用于文件编辑模式）
- 退出

#### 5.2.4 拖拽打开功能
- 支持将视频文件从系统拖拽到界面直接打开
- 拖拽时显示蓝色虚线边框覆盖层提示
- 未选择视频时显示"拖拽视频文件到此处打开"提示文字
- 支持的视频格式：`.mp4`, `.avi`, `.mkv`, `.mov`, `.wmv`, `.flv`, `.webm`
- 通过 `openExternalVideo` 命令调用后端获取视频媒体信息

### 5.3 文件管理界面 (FileManagement) 设计

文件管理界面是原来的主页功能，包含完整的视频浏览和管理功能。

#### 5.3.1 布局结构
```
┌────────────────────────────────────────────────────────────┐
│                     HomeNavigation 导航栏                    │
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│    视频预览区域 (90%)        │    右侧面板 (200-300px)      │
│    ┌────────────────────┐    │                              │
│    │                    │    │  VideList / Operate / Info   │
│    │   Video/Thumbnail  │    │  （可切换三种面板）           │
│    │                    │    │                              │
│    └────────────────────┘    │                              │
│                              │                              │
├──────────────────────────────┴──────────────────────────────┤
│  PlayProgressBar (进度条)  │  PlayCtrl (播放控制)           │
└────────────────────────────────────────────────────────────┘
```

#### 5.3.2 右侧面板类型
| 面板类型 | WorkPanel 枚举 | 描述 |
|---------|----------------|------|
| 文件列表 | List | 显示所有视频文件列表，支持多选 |
| 操作面板 | Operate | 显示当前选中视频的操作按钮和分片信息 |
| 视频信息 | VideoInfo | 显示视频详细信息和标签管理 |

### 5.4 视频分片编辑功能

#### 5.4.1 操作说明
| 按钮 | 图标 | 快捷操作 | 功能描述 |
|-----|------|---------|---------|
| 切换视图 | 🖼️/☰ | - | 在视频模式和缩略图模式之间切换 |
| 拆分片段 | ➕ | - | 在当前播放位置拆分视频为一个新片段 |
| 移除拆分 | ➖ | - | 移除当前选中片段的拆分点（合并相邻片段） |
| 删除片段 | ❌ | - | 逻辑删除当前选中片段（标记为删除状态） |
| 恢复片段 | 🔃 | - | 恢复之前删除的片段 |
| 导出剪辑 | ✂ | - | 导出未删除的片段为新视频文件 |

#### 5.4.2 分片数据流
```
选择视频 → 后端查询(splitInfo字段) → 前端展示分片列表
                                              ↓
                                    用户操作(拆分/删除/恢复)
                                              ↓
                              更新 splitInfo.splits 数组
                                              ↓
                              进度条根据 splits 重绘分段显示
```

### 5.5 功能管理页面 (Admin)

功能管理页面提供项目相关的管理功能，通过 AdminNav 导航组件切换不同子页面。

#### 5.5.1 AdminNav 导航按钮
| 按钮 | 路由 | 描述 |
|-----|------|------|
| 返回主页 | `/` | 返回主页编辑界面 |
| 项目设置 | `/admin/prj_set` | 项目配置管理 |
| 标签管理 | `/admin/tag_mng` | 标签增删改查 |
| 缩略图管理 | `/thumb_mng` | 缩略图生成和管理 |
| 小文件整理 | `/tiny_file_db` | 小文件数据库整理 |
| 设置 | `/app_setting` | 应用设置 |

**注意：** 文件管理功能已整合到主页（项目模式下），不再需要单独的文件管理按钮。

### 5.6 项目管理功能

#### 5.6.1 创建项目流程
```
用户输入仓库路径 → 创建项目请求 → 后端创建项目配置文件 → 
→ 返回项目信息 → 进入功能界面同步数据
```

#### 5.6.2 项目同步
支持多种同步类型：
- `all`: 全量同步（项目信息+分类+缩略图）
- `prjInfo`: 仅同步项目信息
- `classify`: 仅执行文件分类
- `thumbnail`: 仅生成缩略图

### 5.7 缩略图管理

#### 5.7.1 生成策略
| 策略 | 说明 |
|-----|------|
| 按时间 (ByTime) | 每隔固定秒数生成一张缩略图 |
| 按大小 (BySize) | 每隔固定字节数生成一张缩略图 |

#### 5.7.2 存储结构
```
项目目录/
├── thumbnails/
│   └── [仓库名]/
│       └── [视频文件名]/
│           ├── thumb_001.jpg
│           ├── thumb_002.jpg
│           └── ...
└── frames/
    └── [仓库名]/
        └── [视频文件名]/
            ├── frame_001.jpg
            └── ...
```

---

## 6. UI/UX 设计规范

### 6.1 设计风格
- **整体风格**: VSCode 风格（暗色主题）
- **背景色**: `#1e1e1e` (主背景), `#252526` (次级背景), `#333` (卡片背景)
- **文字色**: `#ccc` (普通文字), `#d4d4d4` (高亮文字)
- **强调色**: `#007acc` (蓝色，用于链接、选中状态等)
- **悬停色**: `#37373d` (鼠标悬停背景)
- **激活色**: `#094771` (选中项背景)

### 6.2 导航栏设计
顶部固定导航栏（高度30px），根据运行模式显示不同菜单：

**项目模式菜单：**
- **文件菜单**: 创建项目、打开项目、打开视频文件、退出
- **视图菜单**: 文件列表、操作面板、缩略图查看、视频查看、返回主页
- **功能按钮**: 进入功能管理界面
- **关于按钮**: 显示版本信息

**文件编辑模式菜单：**
- **文件菜单**: 创建项目、打开项目、打开视频文件、退出
- **关于按钮**: 显示版本信息

**状态栏（右侧）：**
- 当前仓库模式+选中内容
- 消息通知图标

### 6.3 等级颜色映射
| 等级标签 | 颜色值 | 用途 |
|---------|--------|------|
| sys_score1 | `#00c6ff` (亮蓝) | 最高级别 |
| sys_score2 | `#76ff03` (亮绿) | 高级别 |
| sys_score3 | `#ffea00` (金黄) | 中等级别 |
| sys_score4 | `#ff9100` (橙色) | 低级别 |
| sys_score5 | `#ff3d00` (橙红) | 最低级别 |

---

## 7. 国际化设计

### 7.1 支持语言
- 中文简体 (`zh-CN`) - 默认语言
- 英文 (`en-US`)

### 7.2 语言切换机制
1. 优先读取 `localStorage.getItem('locale')` 用户设置
2. 其次使用浏览器语言检测 `navigator.language`
3. 默认回退到中文 (`zh-CN`)

### 7.3 翻译键命名规范
采用嵌套对象结构：
```json
{
    "navigation": {
        "menuItems": {
            "createProject": "创建项目",
            "returnHome": "返回主页"
        }
    },
    "homeEditor": {
        "dropVideoHint": "拖拽视频文件到此处打开"
    }
}
```

---

## 8. 安全设计

### 8.1 Context Isolation
启用 Electron 的上下文隔离特性，确保渲染进程无法直接访问 Node.js API。

### 8.2 Preload 脚本桥接
通过 `contextBridge.exposeInMainWorld()` 安全地暴露必要的 API：
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
    onSystemNotify: (callback) => { ... }  // 监听系统消息
});
```

### 8.3 Web Security
- 设置 `webSecurity: false` 允许加载本地 `file://` 协议资源
- 使用 `sandbox: false` 以支持某些功能需求

---

## 9. 构建与发布

### 9.1 开发命令
| 命令 | 描述 |
|-----|------|
| `npm run dev` | 启动开发模式（带热重载） |
| `npm run start` | 预览生产版本 |
| `npm run format` | 格式化代码 (Prettier) |
| `npm run lint` | 代码检查 (ESLint) |
| `npm run typecheck` | 类型检查 (TypeScript) |

### 9.2 构建命令
| 命令 | 目标平台 |
|-----|---------|
| `npm run build` | 类型检查 + 构建 |
| `npm run build:win` | Windows (x64, zip) |
| `npm run build:mac` | macOS |
| `npm run build:linux` | Linux |
| `npm run build:unpack` | 解压版（不打包安装程序） |

### 9.3 输出产物
- 主输出格式：ZIP 压缩包
- 包含额外资源：`assets/bin/` 目录（FFmpeg/FFprobe 可执行文件）

---

## 10. 外部依赖

### 10.1 FFmpeg / FFprobe
- **用途**: 视频信息获取、帧提取、视频剪辑
- **位置**: `assets/bin/ffmpeg.exe`, `assets/bin/ffprobe.exe`
- **版本**: 需要与平台匹配的静态编译版本

### 10.2 SQLite3
- **用途**: 本地数据持久化存储
- **集成方式**: npm 包 `sqlite3` + `sqlite` (better-sqlite3 wrapper)

---

## 11. 未来扩展方向

### 11.1 计划中的功能
- [ ] 批量视频处理
- [ ] 视频转码/格式转换
- [ ] 云存储同步支持
- [ ] 多语言扩展（日文、韩文等）
- [ ] 主题切换（亮色/暗色/跟随系统）
- [ ] 插件系统

### 11.2 性能优化方向
- 大文件列表虚拟滚动
- 缩略图懒加载
- 数据库查询优化
- 内存占用优化

---

## 12. 附录

### 12.1 文件命名规范
视频文件采用特定命名格式：`{序号}_{开始时间}_{结束时间}.mp4`
- 示例：`00_20250313113251_20250313114420.mp4`
- 时间格式：`YYYYMMDDHHmmss`

### 12.2 关键路径说明
| 路径变量 | 描述 |
|---------|------|
| `appData` | 应用数据根目录 |
| `log_dir` | 日志文件目录 |
| `file_prj_dir` | 项目配置文件目录 |
| `cfg_dir` | 配置文件目录 |

### 12.3 日志系统
- 日志级别：INFO、WARN、ERROR
- 日志输出：控制台 + 文件
- 日志轮转：按需实现

---

*文档版本: 1.0*
*最后更新: 2026-04-26*
*维护者: Record Manager 开发团队*
