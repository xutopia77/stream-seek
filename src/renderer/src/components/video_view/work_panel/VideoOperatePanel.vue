<template>
    <div class="work-panel-contianer">
        <div class="video-info-contianer">
            <!-- <span class="xc-text"></span> -->
        </div>
        <span class="xc-text"
            >{{
                `${util.getFilenameFromPath(appStore.curSltVideo ? appStore.curSltVideo.path : null)}`
            }} </span
        ><br />
        <button class="xc-button" title="切换视图" @click="btnclk_change_view_model">
            {{ curViewBtn }}
        </button>
        <br />
        <button class="xc-button" title="在光标处拆分片段" @click="btnclk_splitVideo">➕</button>
        <button class="xc-button" title="去掉此片段的拆分信息" @click="removeVideosplit">➖</button>
        <button class="xc-button" title="去掉此片段" @click="removeVideoRecord">❌</button>
        <button class="xc-button" title="恢复此片段" @click="restoreVideoRecord">🔃</button>
        <button class="xc-button" title="导出剪辑" @click="exportVideoRecord">✂</button>
        <div
            v-for="splitInfo in videoSplitInfo"
            :key="splitInfo.percent"
            class="slpit-info-card"
            :class="{
                selected: splitInfo === selectedSplitInfo,
                deleted: splitInfo.isDelete
            }"
            :style="{ borderLeftColor: splitInfo.color }"
            @click="selectSplitInfo(splitInfo)"
        >
            <span class="xc-text"
                >{{
                    `${util.formatTime(splitInfo.startTime)} - ${util.formatTime(splitInfo.endTime)}`
                }} </span
            ><br />
            <span class="xc-text" style="margin-right: 2px; color: #669999"
                >{{ `时长:${util.formatTime(splitInfo.duration)}` }}
            </span>
            <span class="xc-text" style="color: #990033">{{ `${splitInfo.frameNum}帧` }} </span>
            <br />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../../../stores/AppStore'
import { useI18n } from 'vue-i18n'
const appStore = useAppStore()
import '@renderer/assets/common.css'
import util from '../../../utils/util.js'
// import { IpcApi } from '../../utils/ipcApi'
import * as Dty from '../../../../../bridge/dataTypedef'

const { t } = useI18n()

// ------ 切换视图
const curViewBtn = computed(() => {
    return appStore.curViewModel === 'video' ? '🖼️' : '☰'
})

const btnclk_change_view_model = (): void => {
    util.viewModelChange(appStore.curViewModel === 'video' ? 'thumbnail' : 'video')
}

// ------
const btnclk_splitVideo = (): void => {
    if (appStore.curSltVideo?.mediaInfo == null) {
        util.addToastErr(t('videoOperatePanel.selectVideoFirst'))
        return
    }
    if (appStore.curSltVideo?.splitInfo == null) {
        util.addToastErr(t('videoOperatePanel.noSplitInfo'))
        return
    }
    const currentTime = appStore.videoPlayCtrl.curTime
    const videoDuration = appStore.curSltVideo?.mediaInfo.duration
    const curpercent = (currentTime / videoDuration) * 100
    if (
        appStore.curSltVideo?.splitInfo.splits.some(
            (item: Dty.SplitInfo) => item.percent === curpercent
        )
    ) {
        return
    }
    if (currentTime >= videoDuration) {
        return
    }
    appStore.curSltVideo.splitInfo.splits.sort(
        (a: Dty.SplitInfo, b: Dty.SplitInfo) => a.percent - b.percent
    )

    for (let i = 0; i < appStore.curSltVideo.splitInfo.splits.length; i++) {
        const splitInfo = appStore.curSltVideo.splitInfo.splits[i]
        if (splitInfo.startTime < currentTime && splitInfo.endTime > currentTime) {
            const oldEndTime = splitInfo.endTime
            splitInfo.endTime = currentTime
            const newItemInfo = util.makeSplitInfo(appStore.curSltVideo.splitInfo.splits.length)
            newItemInfo.startTime = currentTime
            newItemInfo.endTime = oldEndTime
            appStore.curSltVideo.splitInfo.splits.push(newItemInfo)
            break
        }
    }
    util.splitInfoCorrect(appStore.curSltVideo.splitInfo.splits, videoDuration)
    for (let i = 0; i < appStore.curSltVideo.splitInfo.splits.length; i++) {
        appStore.curSltVideo.splitInfo.splits[i].color = appStore.barColorDictionary[i % appStore.barColorDictionary.length]
    }
}

const videoSplitInfo = computed(() => {
    if (appStore.curSltVideo?.splitInfo == null) {
        return []
    }
    let splitInfo = appStore.curSltVideo.splitInfo.splits
    return splitInfo
})

const selectedSplitInfo = ref<Dty.SplitInfo | null>({
    percent: 0,
    startTime: 0,
    endTime: 0,
    frameNum: 0,
    duration: 0,
    isDelete: false,
    color: '#669999',
    currentTime: 0,
    frameIdx: 0
})

const selectSplitInfo = (splitInfo: Dty.SplitInfo): void => {
    selectedSplitInfo.value = splitInfo
    console.log(splitInfo)
}

const removeVideosplit = (): void => {
    if (selectedSplitInfo.value?.percent === 100) {
        util.addToastInfo(t('videoOperatePanel.cannotDeleteSystemSegment'))
        return
    }
    if (appStore.curSltVideo?.splitInfo == null) {
        util.addToastInfo(t('videoOperatePanel.noSplitInfo'))
        return
    }
    if (selectedSplitInfo.value) {
        const confirmDelete = confirm(t('videoOperatePanel.confirmDeleteSegment'))
        if (confirmDelete) {
            const splits = appStore.curSltVideo.splitInfo.splits
            splits.sort((a: Dty.SplitInfo, b: Dty.SplitInfo) => a.percent - b.percent)
            const index = splits.findIndex(
                (item: Dty.SplitInfo) => item.percent === selectedSplitInfo.value?.percent
            )
            if (index !== -1) {
                if (index === 0) {
                    if (splits.length > 1) {
                        splits[1].startTime = splits[0].startTime
                    }
                } else {
                    splits[index - 1].endTime = splits[index].endTime
                }
                splits.splice(index, 1)
                selectedSplitInfo.value = null
                const videoDuration = appStore.curSltVideo?.mediaInfo?.duration || 0
                util.splitInfoCorrect(splits, videoDuration)
                for (let i = 0; i < splits.length; i++) {
                    splits[i].color = appStore.barColorDictionary[i % appStore.barColorDictionary.length]
                }
            }
        }
    }
}

const removeVideoRecord = (): void => {
    if (selectedSplitInfo.value == null) {
        util.addToastErr(t('videoOperatePanel.selectSegmentFirst'))
        return
    }
    if (appStore.curSltVideo?.splitInfo == null) {
        util.addToastErr(t('videoOperatePanel.noSplitInfo'))
        return
    }
    const confirmDelete = confirm(t('videoOperatePanel.confirmDeleteSegment'))
    if (!confirmDelete) {
        return
    }
    const index = appStore.curSltVideo.splitInfo.splits.findIndex(
        (item: Dty.SplitInfo) => item.percent == selectedSplitInfo?.value?.percent
    )
    if (index === -1) {
        return
    }
    appStore.curSltVideo.splitInfo.splits[index]['isDelete'] = true
}

const restoreVideoRecord = (): void => {
    if (!selectedSplitInfo.value) {
        util.addToastErr(t('videoOperatePanel.selectSegmentFirst'))
        return
    }
    if (appStore.curSltVideo?.splitInfo == null) {
        util.addToastErr(t('videoOperatePanel.noSplitInfo'))
        return
    }
    const index = appStore.curSltVideo.splitInfo.splits.findIndex(
        (item: Dty.SplitInfo) => item.percent == selectedSplitInfo?.value?.percent
    )
    if (index === -1) {
        return
    }
    appStore.curSltVideo.splitInfo.splits[index]['isDelete'] = false
}

const exportVideoRecord = async (): Promise<void> => {
    return util.export_cut_video(null)

    // const prjInfo: Dty.Req_CutVideo | null = await util.make_prj_info()
    // if (prjInfo === null) {
    //   util.addToastErr(`no project info`)
    //   return
    // }
    // if (appStore.curSltVideo == null) {
    //   MessageShow.info('请先选择一个视频')
    //   return
    // }
    // util.stop_play()

    // const req: Dty.Req<Dty.Req_CutVideo> = {
    //   cmd: 'cut_video',
    //   data: prjInfo
    // }
    // const response = await IpcApi.trigger_event(req)
    // if (response.code === 1001) {
    //   return
    // }
    // if (response.code !== 0) {
    //   util.addToastInfo(`剪辑失败: ${response.status}`)
    // } else {
    //   if (response.bOver === false) {
    //     MessageShow.info(`正在处理...`)
    //   } else {
    //     util.addToastInfo(`剪辑成功`)
    //   }
    // }
}
</script>

<style scoped>
.work-panel-contianer {
    height: 100%;
    width: 100%;
    padding: 0;
    margin: 0;
    background-color: #1e1e1e;
    color: #d4d4d4;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    /* 设置超出范围了是不显示，而是出现滚动条 */
    overflow-x: hidden;
}

.video-info-contianer {
    width: 100%;
    margin: 0;
    padding: 0;
}

.slpit-info-card {
    width: calc(100% - 16px);
    margin: 4px;
    border-radius: 3px;
    background-color: #252526;
    border: 1px solid #333;
    border-left: 4px solid #669999;
    transition: background-color 0.2s ease;
}

.slpit-info-card:hover {
    background-color: #3c3c3c;
}

.slpit-info-card.selected {
    border: 2px solid #007acc;
    background-color: #2d2d2d;
}

.slpit-info-card.deleted {
    background-color: #4d1919;
    /* 暗红色背景表示删除 */
    border: 1px solid #800000;
    /* 暗红色边框 */
    text-decoration: line-through;
    /* 文字添加删除线 */
    color: #a6a6a6;
    /* 文字颜色变浅 */
}
</style>