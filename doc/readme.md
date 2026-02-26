
# TODO 

- [x] 测试如果后台任务没有完成，前端的响应不要处理的功能，删除文件，标记视频


# 设计概要

主要用来快速管理查看摄像头的录像视频，可以快速裁剪，删除无用的录像片段。

支持添加多个视频文件存储路径，删除的视频只是会在回收站中，不会真正删除。


## 功能

### 录像文件整理

录像文件为MP4文件，命名格式为`00_20260208103944_20260208104539.mp4`，包含录像文件的开始时间和结束时间，这样程序才可以解析出来录像对应的时间，然后进行处理。

程序会遍历存储仓库，把录像文件的信息存储到项目路径下的数据库中。同时会把录像文件按照时间顺序，每10个为一组，存储到按照数字编号的文件夹中，避免单个文件夹下文件过多，导致文件夹打开慢。

### 文件删除
三种删除方式：
- 移动到回收站（delete）
  在仓库模式下，会把文件移动到回收站。
- 彻底删除，从仓库/回收站中删除文件（destroy）
  在回收站模式下，会彻底删除文件。
- 彻底删除文件，同时删除对应的缩略图/关键帧
  在回收站模式下，会彻底删除文件，同时也可以选择删除录像文件对应的缩略图/关键帧。

### 缩略图管理功能
录像文件按照固定的间隔进行抽帧，生成缩略图，抽帧间隔默认为10秒，缩略图分辨率默认为`640*480`。抽取的缩略图全部存储到项目路径下的`thumbnail`文件夹中，与录像文件同名的数据库文件中。

同时也会对录像文件进行关键帧抽帧，抽帧时间间隔与缩略图保持一致，分辨率为录像文件的分辨率。储到项目路径下的`frame`文件夹中，与录像文件同名的数据库文件中。

如果缩略图/关键帧对应的数据库文件已经存在，就不会重新生成。

### 数据库存储
- files 
  文件数据库表格结构

| 字段名        | 类型        | 约束/说明                                   |
|---------------|-------------|---------------------------------------------|
| id            | INTEGER     | 主键，自增（PRIMARY KEY AUTOINCREMENT）      |
| name          | TEXT        | 非空（NOT NULL），文件名称                  |
| path          | TEXT        | 非空（NOT NULL），文件绝对路径                  |
| startTimeSec  | INTEGER     | 非空（NOT NULL），开始时间（秒）            |
| endTimeSec    | INTEGER     | 非空（NOT NULL），结束时间（秒）            |
| duration      | INTEGER     | 非空（NOT NULL），文件时长（秒）            |
| size          | INTEGER     | 非空（NOT NULL），文件大小（字节）          |
| mediaInfo     | TEXT        | 可选，媒体信息（如编码、分辨率等）          |
| splitInfo     | TEXT        | 可选，分片信息                              |
| frameInfo     | TEXT        | 可选，帧信息                                |
| thumbnail     | TEXT        | 可选， 存储的是缩略图的文件名称数组，存储在缩略图数据库文件中 |
| eventInfo     | TEXT        | 可选，事件相关信息，暂时没有用                          |
| type          | INTEGER     | 非空（NOT NULL），文件类型（自定义枚举）    |
| status        | INTEGER     | 非空（NOT NULL），文件状态（自定义枚举）    |
| repo          | TEXT        | 非空（NOT NULL），所属仓库，暂时不用了，目前只支持一个仓库       |
| infoHash      | TEXT        | 非空（NOT NULL）、唯一（UNIQUE），文件哈希值，暂时不用，因为文件的绝对路径已经可以表示唯一了|
| description   | TEXT        | 可选，文件描述                              |
| created_at    | DATETIME    | 默认值为当前时间戳（CURRENT_TIMESTAMP）     |
| updated_at    | DATETIME    | 可选，更新时间戳                            |
| deleted_at    | DATETIME    | 可选，软删除时间戳（逻辑删除）              |

- tags
  文件标签表，目前只支持文件等级标签

| 字段名        | 类型        | 约束/说明                                   |
|---------------|-------------|---------------------------------------------|
| id            | INTEGER     | 主键，自增（PRIMARY KEY AUTOINCREMENT）      |
| name          | TEXT        | 非空（NOT NULL）、唯一（UNIQUE），标签名称  |
| color         | TEXT        | 可选，标签颜色（如十六进制值 #FF0000）      |
| created_at    | DATETIME    | 默认值为当前时间戳（CURRENT_TIMESTAMP）     |
| updated_at    | DATETIME    | 可选，标签更新时间戳                        |
| deleted_at    | DATETIME    | 可选，软删除时间戳（非空表示逻辑删除）      |

## 创建工程

# 打包

## 打包命令

```bash
npm run build:win
```


# 版本记录

## 2.1.0 2026年1月25日18:34:25
- 时隔很久，重新开始开发。
- 修复部分问题。
- 使用新的消息提示组件，可以查看历史消息。
- 文件等级使用☆, ☆越多，表示文件越重要。

## 2.2.1 2026年2月7日15:01:10
1. fix bugs
2. 监听本地的58080端口，用于缩略图服务
3. 缩略图文件放到数据库中
4. 缩略图数据库中两个表 infos和files，infos存放对应文件的mediaInfo，files存放缩略图文件
5. thumbnail文件夹下存放的是缩略图文件，默认分辨率是`640*480`
6. frame文件夹下存放的是视频抽帧文件，分辨率是视频分辨率。
7. 优化文件/缩略图删除功能。在删除文件时，可以选择是否删除缩略图（只有在回收站模式下有效）。
8. 新增缩略图管理功能，可以删除缩略图文件。
9. 文件遍历的同时，也遍历数据库，修整数据库的文件信息记录。
10. 异步操作的结果，由后端主动通知给前端，不再使用前端定时心跳拉取的方式。
11. 文件遍历时，与数据库中任何状态的数据都进行检查，然后再根据情况更新数据库中的记录信息

## 3.1.2 2026年2月26日18:21:06
1. add i18n for overseas
2. 搜索时支持tags过滤
3. 支持取消文件等级设置 2026年2月26日18:20:29


# 代码

记录一些代码使用示例

```shell

ffmpeg -hwaccel cuda -hwaccel_output_format cuda -i 00_20250301122432_20250301123046.mp4 -vf "fps=15,hwupload" -c:v hevc_nvenc -preset medium output.mp4


ffmpeg -hwaccel cuda -hwaccel_output_format cuda -i 00_20250302134545_20250302135107.mp4 -vf "fps=5,hwupload" -c:v hevc_nvenc -preset medium output.mp4


ffmpeg -hwaccel cuda -i input.mp4 \
  -vf "mpdecimate,fps=5,hwupload" \
  -c:v hevc_nvenc \
  -preset slow \
  -crf 32 \
  -g 50 \
  -sc_threshold 0 \
  -tune zerolatency \  # 适用于实时监控
  output.mp4


ffmpeg -hwaccel cuda -i input.mp4 \
  # 1. 视频滤镜：降低帧率+删除冗余帧（核心！）
  -vf "mpdecimate=hi=64:lo=32:frac=0.3,fps=5,hwupload" \
  # 2. 视频编码：H.265（HEVC）+ GPU加速+低码率控制
  -c:v hevc_nvenc \
  -preset slow \          # 慢预设，压缩效率更高（牺牲速度换体积）
  -crf 30 \               # 恒定质量因子（值越大体积越小，建议28-35）
  -g 100 \                # 关键帧间隔（每100帧1个I帧，适合静态场景）
  -sc_threshold 0 \       # 禁用场景变化检测（固定视角无需频繁切关键帧）
  # 3. 音频处理：监控多无需音频，直接删除
  -an \
  # 4. 容器格式（保证兼容性）
  -f mp4 \
  output_compressed.mp4



ffmpeg -hwaccel cuda -i static.mp4 -vf "mpdecimate=hi=64:lo=32:frac=0.3,fps=5,hwupload" -c:v hevc_nvenc -preset slow -crf 30 -g 100 -sc_threshold 0 -an -f mp4 output_compressed.mp4

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


ffmpeg -i static.mp4 \
  # 1. 视频处理：降帧率+去冗余+GPU加速
  -vf "mpdecimate=hi=64:lo=32:frac=0.3,fps=5,hwupload" \
  # 2. 编码参数：HEVC+极致压缩
  -c:v hevc_nvenc \
  -preset veryslow \    # 最慢但最高效的压缩
  -crf 35 \             # 高CRF值（画质略有损失，但体积极小）
  -g 50 \               # 关键帧间隔（每50帧1个I帧）
  -sc_threshold 0 \     # 禁用场景变化检测
  -b:v 2000k \          # 限制最大码率（防止体积暴涨）
  -tune zero-latency \  # 针对监控场景优化
  # 3. 音频处理：极低码率
  -c:a aac -b:a 16k \   # 保留音频但压缩至16kbps
  # 4. 输出格式优化
  -movflags +faststart \
  output_compressed.mp4

ffmpeg -hwaccel cuda -i static.mp4 -vf "mpdecimate=hi=64:lo=32:frac=0.3,fps=5,hwupload" -c:v hevc_nvenc -preset veryslow -crf 35 -g 50 -sc_threshold 0 -b:v 2000k -tune zero-latency -movflags +faststart output_compressed.mp4

ffmpeg -hwaccel cuda -i static.mp4 -vf "mpdecimate=hi=64:lo=32:frac=0.3,fps=5,hwupload" -c:v hevc_nvenc -preset slow -crf 30 -g 100 -sc_threshold 0 -b:v 2000k  -an -f mp4 output_compressed.mp4

ffmpeg -hwaccel cuda -i static.mp4 -vf "mpdecimate=hi=64:lo=24:frac=0.5,fps=5,hwupload" -c:v hevc_nvenc -preset slow -crf 30 -g 360 -sc_threshold 0 -b:v 100k  -an -f mp4 output_compressed.mp4




```