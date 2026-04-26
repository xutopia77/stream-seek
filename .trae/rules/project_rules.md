# Record Manager 项目规则

## 1. 项目概述

Record Manager 是一个基于 Electron + Vue 3 的桌面应用，专门用于管理录像文件。

核心能力：视频文件自动扫描入库、文件分类归整、缩略图/帧图生成、视频预览播放、标签分类检索、回收站管理。

---

## 开发
- vue-i18n 国际化
- sqlite3 数据库
- ESLint + Prettier 代码规范
- 请求格式: `Req<T>` = `{ cmd: CmdType, data?: T, cseq?: number }`
- 响应格式: `Resp<T>` = `{ code: RespCode, status: string, bOver?: boolean, data?: T }`
- 项目界面风格与vscode一致。
- 提交代码使用英文，代码注释也使用英文。不要自动提交，需要手动提交。
