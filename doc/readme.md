
# TODO 

- [x] 测试如果后台任务没有完成，前端的响应不要处理的功能，删除文件，标记视频


# 设计概要

主要用来快速管理查看摄像头的录像视频，可以快速裁剪，删除无用的录像片段。

支持添加多个视频文件存储路径，删除的视频只是会在回收站中，不会真正删除。


## 功能

### 文件删除
两种删除方式：
- 彻底删除，从仓库/回收站中删除文件（destroy）
  在回收站模式下，会彻底删除文件。
- 移动到回收站（delete）
  在仓库模式下，会把文件移动到回收站。

### 缩略图管理功能
缩略图是与文件进行绑定的。
文件遍历时：
1，遍历文件，把文件全部插入到数据库表files；
2，数据库表files，检查文件是否存在，不存在标记为destroy；
3，遍历缩略图数据库文件，插入到数据库表files（如果表中没有对应项）；

缩略图更新：
1，遍历数据库，查看对应的文件是否有缩略图
如果没有，调用ffmpeg生成，更新files表记录；
如果有，读取缩略图数据库，跟新files表记录

缩略图查看时，按照文件获取
缩略图删除时，如果这个缩略图数据库文件中已经没有文件了，就把整个缩略图数据库文件删除。

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
- 缩略图文件放到数据库中
- 监听本地的58080端口，用于缩略图服务
- 缩略图数据库中两个表 infos和files，infos存放对应文件的mediaInfo，files存放缩略图文件
- thumbnail文件夹下存放的是缩略图文件，默认分辨率是640*480。
- frame文件夹下存放的是视频抽帧文件，分辨率是视频分辨率。
- fix bugs。
- 优化文件/缩略图删除功能。在删除文件时，可以选择是否删除缩略图（只有在回收站模式下有效）。
- 新增缩略图管理功能，可以删除缩略图文件。
- 文件遍历的同时，也遍历数据库，修整数据库的文件信息记录。

# 代码

函数模型如下
```ts

interface Req<T = string> {
  cmd: string
  data?: T
}

interface Resp<T = string> {
  code: number
  status: string
  bOver?: boolean
  data?: T
}

async function trigger_event<T = string, R = string>(req: Dty.Req<T>): Promise<Dty.Resp<R>>
```

发送时，入参是一个对象Req，返回值是一个Promise对象，Promise对象的resolve值是一个对象Resp

至于Req和Resp中的Data，是一个泛型，具体的类型由调用方决定。


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