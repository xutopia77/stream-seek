
# TODO 

- [x] 支持多视频文件存储路径
- [x] 支持取消全部的多选
- [x] 增加标记和删除同时设置的功能
- [x] 测试如果后台任务没有完成，前端的响应不要处理的功能，删除文件，标记视频
- [x] 增加一个状态消息展示栏目，显示5条历史消息


# 设计概要

主要用来快速管理查看摄像头的录像视频，可以快速裁剪，删除无用的录像片段。

支持添加多个视频文件存储路径，删除的视频只是会在回收站中，不会真正删除。


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

async function trigger_event<T = string, R = string>(req: DataTypes.Req<T>): Promise<DataTypes.Resp<R>>
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