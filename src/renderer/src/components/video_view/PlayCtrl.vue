<template>
    <div class="play-ctrl">
        <!-- 播放/暂停按钮 -->
        <button class="common-button btn-noborder" title="播放/暂停" @click="btnclk_toggle_play">
            {{ appStore.videoPlayCtrl.isPlay ? '⏸' : '▶' }}
        </button>
        <!-- 文件切换 -->
        <button
            class="common-button btn-noborder"
            title="上一个文件"
            @click="changeFile('previous')"
        >
            ⏮
        </button>
        <button class="common-button btn-noborder" title="停止播放" @click="btnclk_stop_play()">
            ⏹
        </button>
        <button class="common-button btn-noborder" title="下一个文件" @click="changeFile('next')">
            ⏭
        </button>
        <!-- 倍速选择 -->
        <select
            v-model="appStore.videoPlayCtrl.playbackRate"
            class="common-select"
            @change="changePlaybackRate"
        >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
            <option value="6">6x</option>
        </select>
        <!-- 播放时间 -->
        <span class="common-text" style="padding-right: 3px"
            >{{ curTime }}/{{ videoDuration }}</span
        >
        <!-- 帧控制播放 -->
        <button class="common-button btn-noborder" title="后退一帧" @click="previousFrame">
            ◀️
        </button>
        <button class="common-button btn-noborder" title="前进一帧" @click="nextFrame">▶️</button>
        <span class="common-text" style="padding-right: 3px; color: darkcyan">{{ frameInfo }}</span>
        <span class="common-text" style="padding-right: 3px; color: chocolate">{{
            frameRate
        }}</span>
        <!-- 显示i帧 -->
        <button class="common-button btn-noborder" title="显示关键帧" @click="showKeyFrame">
            🔑
        </button>
        <div class="right-area-ctrl">
            <button
                class="common-button btn-noborder"
                title="删除当前所选的文件"
                @click="btnclk_del_cur_video"
            >
                🗑
            </button>
            <button
                class="common-button btn-noborder"
                title="显示文件列表"
                @click="btnclk_chg_panel('list')"
            >
                🛢️
            </button>
            <button
                class="common-button btn-noborder"
                title="显示文件处理"
                @click="btnclk_chg_panel('workPanel')"
            >
                🛠️
            </button>
            <button
                class="common-button btn-noborder"
                title="处理文件标签"
                @click="btnclk_chg_panel('workPanel')"
            >
                🏷️
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '../../stores/AppStore'
import '@renderer/assets/common.css'
import MessageShow from '../util/MessageShow'
import util from '@renderer/utils/util'
const appStore = useAppStore()
import * as DataTypes from '../../../../bridge/dataTypedef'

// 改变播放倍速
const changePlaybackRate = (): void => {}

let curTime = computed(() => {
    let str = '00:00:00.000'
    str = DataTypes.Utils.time_2_msec_str(appStore.videoPlayCtrl.curTime)
    return str
})
let videoDuration = computed(() => {
    let str = '00:00:00.000'
    if (appStore.curVideoInfo?.mediaInfo != null) {
        str = DataTypes.Utils.time_2_msec_str(appStore.curVideoInfo.mediaInfo.duration)
    }
    return str
})
// let videoDuration = computed(() => formatTime(appStore.curVideoInfo?.mediaInfo.duration))

function genFrame(): string {
    if (appStore.curVideoInfo == null) return ''
    if (appStore.curVideoInfo.mediaInfo == null) return ''
    const curTime = appStore.videoPlayCtrl.curTime
    const frameRate = appStore.curVideoInfo.mediaInfo.video.frame_rate
    const frameCount = Math.floor(appStore.curVideoInfo.mediaInfo.video.nb_frames)
    const frame = Math.floor(curTime * frameRate)
    return `${frame}/${frameCount}f`
}
let frameInfo = computed(() => genFrame())

let frameRate = computed(() => {
    if (appStore.curVideoInfo == null) return ''
    if (appStore.curVideoInfo.mediaInfo == null) return ''
    const frameRateStr = appStore.curVideoInfo.mediaInfo.video.frame_rate.toFixed(3)
    return `${frameRateStr}fps`
})

function nextFrame(): void {
    if (appStore.curVideoInfo == null) {
        MessageShow.info('请先选择一个视频')
        return
    }
    if (appStore.func_nextFrame) {
        appStore.func_nextFrame()
    }
}

function previousFrame(): void {
    if (appStore.curVideoInfo == null) {
        MessageShow.info('请先选择一个视频')
        return
    }
    if (appStore.func_prevFrame) {
        appStore.func_prevFrame()
    }
}

function btnclk_stop_play(): void {
    if (appStore.curSltVideo == null) {
        MessageShow.info('请先选择一个视频')
        return
    }
    util.stop_play()
}

// 切换播放/暂停状态
const btnclk_toggle_play = (): void => {
    if (appStore.curSltVideo == null) {
        MessageShow.info('请先选择一个视频')
        return
    }
    appStore.videoPlayCtrl.isPlay = !appStore.videoPlayCtrl.isPlay
}

// ====================================

function showKeyFrame(): void {
    appStore.bShowKeyFrameInfo = !appStore.bShowKeyFrameInfo
}

// ==================================== 文件切换
function changeFile(flag: string): void {
    // 根据curSltVideo 从appStore的videoList中找到当前视频的索引
    if (appStore.videoList.length == 0) {
        MessageShow.info('没有视频文件')
        return
    }
    if (appStore.curSltVideo == null) {
        appStore.curSltVideo = appStore.videoList[0]
        return
    }
    let curVideoIdx = -1
    for (let i = 0; i < appStore.videoList.length; i++) {
        if (appStore.videoList[i].path == appStore.curSltVideo.path) {
            curVideoIdx = i
            break
        }
    }
    if (curVideoIdx == -1) {
        appStore.curSltVideo = appStore.videoList[0]
        return
    }

    if (flag == 'previous') {
        if (curVideoIdx == 0) {
            MessageShow.info('已经是第一个文件')
            appStore.curSltVideo = appStore.videoList[curVideoIdx]
            return
        }
        appStore.curSltVideo = appStore.videoList[curVideoIdx - 1]
    } else {
        if (curVideoIdx == appStore.videoList.length - 1) {
            MessageShow.info('已经是最后一个文件')
            appStore.curSltVideo = appStore.videoList[curVideoIdx]
            return
        }
        appStore.curSltVideo = appStore.videoList[curVideoIdx + 1]
    }
}

function btnclk_chg_panel(model: string): void {
    appStore.rightPanel = model as 'list' | 'workPanel'
}

function btnclk_del_cur_video(): void {
    const curCheckedVideo = appStore.curCheckedVideo
    if (curCheckedVideo == null) {
        MessageShow.info('没有选择的文件')
        return
    }

    const req: DataTypes.DeleteFileReq = new DataTypes.DeleteFileReq()
    for (const item of curCheckedVideo) {
        const fInfo = new DataTypes.File()
        fInfo.path = item.path
        fInfo.repo = item.repo
        req.files.push(fInfo)
    }
    if (req.files.length == 0) {
        MessageShow.info('没有选择的文件')
        return
    }
    console.log('delete file req', req)
    util.delete_video(req).then(() => {
        appStore.curCheckedVideo.clear()
    })

    // const req: DataTypes.CutVideoReq = {
    //   bDelFullVideo: true
    // }
    // util.export_cut_video(req)
}
</script>

<style scoped>
.btn-noborder {
    border: none;
}

.play-ctrl {
    height: 50px;
    width: 100%;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    background-color: #252526;
    /* VSCode 侧边栏背景色 */
}

.right-area-ctrl {
    margin-left: auto;
}
</style>
