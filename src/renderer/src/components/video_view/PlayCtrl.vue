<template>
    <div class="play-ctrl">
        <!-- Play/Pause button -->
        <button class="xc-button btn-noborder" title="Play/Pause" @click="btnclk_toggle_play">
            {{ iconPlayPause }}
        </button>
        <!-- File switch -->
        <button class="xc-button btn-noborder" title="Previous file" @click="changeFile('previous')">
            ⏮
        </button>
        <button class="xc-button btn-noborder" title="Stop" @click="btnclk_stop_play()">
            ⏹
        </button>
        <button class="xc-button btn-noborder" title="Next file" @click="changeFile('next')">
            ⏭
        </button>
        <!-- Speed selection -->
        <select
            v-model="appStore.videoPlayCtrl.playbackRate"
            class="xc-select"
            @change="changePlaybackRate"
        >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
            <option value="6">6x</option>
        </select>
        <!-- Volume control -->
        <button
            class="xc-button btn-noborder"
            :title="appStore.videoPlayCtrl.muted ? t('playCtrl.unmute') : t('playCtrl.mute')"
            @click="toggleMute"
        >
            {{ volumeIcon }}
        </button>
        <input
            v-model.number="appStore.videoPlayCtrl.volume"
            type="range"
            class="volume-slider"
            min="0"
            max="1"
            step="0.01"
            :title="t('playCtrl.volume')"
            @input="changeVolume"
        />
        <!-- Playback time -->
        <span class="xc-text" style="padding-right: 3px">{{ curTime }}/{{ videoDuration }}</span>
        <!-- Frame control playback -->
        <button class="xc-button btn-noborder" title="Previous frame" @click="previousFrame">◀️</button>
        <button class="xc-button btn-noborder" title="Next frame" @click="nextFrame">▶️</button>
        <span class="xc-text" style="padding-right: 3px; color: darkcyan">{{ frameInfo }}</span>
        <span class="xc-text" style="padding-right: 3px; color: chocolate">{{ frameRate }}</span>
        <!-- Show I-frame -->
        <button class="xc-button btn-noborder" title="Show key frame" @click="btn_showKeyFrame">
            🔑
        </button>
        <div v-if="appStore.isProjectMode" class="right-area-ctrl">
            <button
                class="xc-button btn-noborder"
                title="Set file level"
                @click="btnclk_set_file_level"
            >
                ⭐
            </button>
            <select v-model="fileLevel" class="xc-select">
                <option v-for="index in 6" :key="index" :value="index - 1">{{ index - 1 }}☆</option>
            </select>

            <button
                class="xc-button btn-noborder"
                title="Delete selected files"
                @click="btnclk_delSltVideos"
            >
                🗑
            </button>
            <select v-model="delType" class="xc-select" title="Delete method" @change="changeDelType">
                <option value="delVideo" title="Move to recycle bin">🗑</option>
                <option
                    value="delVideoAndThumb"
                    title="Move to recycle bin and delete thumbnails"
                    :disabled="!(appStore.fileSearchStatus == Dty.Fstatus.Deleted)"
                >
                    🗑+
                </option>
            </select>

            <button
                class="xc-button btn-noborder"
                title="Show file list"
                @click="btnclk_chg_panel(Dty.WorkPanel.List)"
            >
                🛢️
            </button>
            <button
                v-if="!appStore.isProjectMode"
                class="xc-button btn-noborder"
                title="Show file operations"
                @click="btnclk_chg_panel(Dty.WorkPanel.Operate)"
            >
                🛠️
            </button>
            <button
                class="xc-button btn-noborder"
                title="Edit file tags"
                @click="btnclk_chg_panel(Dty.WorkPanel.VideoInfo)"
            >
                🏷️
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAppStore } from '../../stores/AppStore'
import { useI18n } from 'vue-i18n'
import '@renderer/assets/common.css'
import util from '../../utils/util'
const appStore = useAppStore()
import * as Dty from '../../../../bridge/dataTypedef'

const { t } = useI18n()

// Change playback speed
const changePlaybackRate = (): void => {}

// volume control
const toggleMute = (): void => {
    appStore.videoPlayCtrl.muted = !appStore.videoPlayCtrl.muted
    util.set_volume_muted(appStore.videoPlayCtrl.muted)
}

const changeVolume = (): void => {
    util.set_volume(appStore.videoPlayCtrl.volume)
    if (appStore.videoPlayCtrl.volume > 0 && appStore.videoPlayCtrl.muted) {
        appStore.videoPlayCtrl.muted = false
    }
}

const volumeIcon = computed(() => {
    if (appStore.videoPlayCtrl.muted || appStore.videoPlayCtrl.volume === 0) {
        return '🔇'
    } else if (appStore.videoPlayCtrl.volume < 0.3) {
        return '🔈'
    } else if (appStore.videoPlayCtrl.volume < 0.7) {
        return '🔉'
    } else {
        return '🔊'
    }
})

let curTime = computed(() => {
    let str = '00:00:00.000'
    str = Dty.Utils.time_2_msec_str(appStore.videoPlayCtrl.curTime)
    return str
})
let videoDuration = computed(() => {
    let str = '00:00:00.000'
    if (appStore.curSltVideo?.mediaInfo != null) {
        str = Dty.Utils.time_2_msec_str(appStore.curSltVideo.mediaInfo.duration)
    }
    return str
})
// let videoDuration = computed(() => formatTime(appStore.curSltVideo?.mediaInfo.duration))

function genFrame(): string {
    if (appStore.curSltVideo == null) return ''
    if (appStore.curSltVideo.mediaInfo == null) return ''
    const curTime = appStore.videoPlayCtrl.curTime
    const frameRate = appStore.curSltVideo.mediaInfo.video.frame_rate
    const frameCount = Math.floor(appStore.curSltVideo.mediaInfo.video.nb_frames)
    const frame = Math.floor(curTime * frameRate)
    return `${frame}/${frameCount}f`
}
let frameInfo = computed(() => genFrame())

let frameRate = computed(() => {
    if (appStore.curSltVideo == null) return ''
    if (appStore.curSltVideo.mediaInfo == null) return ''
    const frameRateStr = appStore.curSltVideo.mediaInfo.video.frame_rate.toFixed(3)
    return `${frameRateStr}fps`
})

function nextFrame(): void {
    if (appStore.curSltVideo == null) {
        util.addToastInfo(t('playCtrl.selectVideoFirst'))
        return
    }
    if (appStore.func_nextFrame) {
        appStore.func_nextFrame()
    }
}

function previousFrame(): void {
    if (appStore.curSltVideo == null) {
        util.addToastInfo(t('playCtrl.selectVideoFirst'))
        return
    }
    if (appStore.func_prevFrame) {
        appStore.func_prevFrame()
    }
}

function btnclk_stop_play(): void {
    if (appStore.curSltVideo == null) {
        util.addToastInfo(t('playCtrl.selectVideoFirst'))
        return
    }
    util.stop_play()
}

// Toggle play/pause status
const btnclk_toggle_play = (): void => {
    if (appStore.curSltVideo == null) {
        util.addToastInfo(t('playCtrl.selectVideoFirst'))
        return
    }
    appStore.videoPlayCtrl.isPlay = !appStore.videoPlayCtrl.isPlay
}

const iconPlayPause = ref('▶')
watch(
    () => appStore.videoPlayCtrl.isPlay,
    (isPlay: boolean) => {
        if (isPlay) {
            iconPlayPause.value = '⏸'
        } else {
            iconPlayPause.value = '▶'
        }
    }
)

// ==================================== File level setting
const fileLevel = ref(1)
async function btnclk_set_file_level(): Promise<void> {
    const req = new Dty.FileTagsReq()
    const levelVal = fileLevel.value
    if (levelVal < 0 || levelVal > 5) {
        util.addToastErr(t('playCtrl.levelRangeError'))
        return
    }
    let tagName = `sys_score${levelVal}`
    for (const item of appStore.curCheckedVideo) {
        const fileTag: Dty.FileTagsReqItem = {
            fileId: item.id,
            tagName: tagName
        }
        req.fileTags.push(fileTag)
    }
    if (req.fileTags.length === 0) {
        util.addToastErr(t('playCtrl.selectFileFirst'))
        return
    }
    await util.file_tags_set(req, { bNeedSltCurVideo: true, bNeedUpdate: true })
    appStore.curCheckedVideo.clear()
}

// ====================================

function btn_showKeyFrame(): void {
    appStore.bShowKeyFrameInfo = !appStore.bShowKeyFrameInfo
}

// ==================================== File switch
function changeFile(flag: string): void {
    // Find current video index from appStore's videoList based on curSltVideo
    if (appStore.videoList.length == 0) {
        util.addToastInfo(t('playCtrl.noVideoFiles'))
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
            util.addToastInfo(t('playCtrl.alreadyFirstFile'))
            appStore.curSltVideo = appStore.videoList[curVideoIdx]
            return
        }
        appStore.curSltVideo = appStore.videoList[curVideoIdx - 1]
    } else {
        if (curVideoIdx == appStore.videoList.length - 1) {
            util.addToastInfo(t('playCtrl.alreadyLastFile'))
            appStore.curSltVideo = appStore.videoList[curVideoIdx]
            return
        }
        appStore.curSltVideo = appStore.videoList[curVideoIdx + 1]
    }
}

function btnclk_chg_panel(model: Dty.WorkPanel): void {
    appStore.rightPanel = model
}

let delType = ref<'delVideo' | 'delVideoAndThumb'>('delVideo')

function changeDelType(): void {
    let str = t('playCtrl.moveToTrash')
    if (delType.value == 'delVideoAndThumb') str = t('playCtrl.moveToTrashWithThumb')
    util.addToastInfo(`${t('playCtrl.deleteMethod')}: ${str}`)
}

function btnclk_delSltVideos(): void {
    const curCheckedVideo = appStore.curCheckedVideo
    if (curCheckedVideo == null) {
        util.addToastInfo(t('playCtrl.noSelectedFile'))
        return
    }

    const req: Dty.DeleteFileReq = new Dty.DeleteFileReq()
    for (const item of curCheckedVideo) {
        const fInfo = new Dty.File()
        fInfo.path = item.path
        fInfo.repo = item.repo
        req.files.push(fInfo)
    }
    if (req.files.length == 0) {
        util.addToastInfo(t('playCtrl.noSelectedFile'))
        return
    }
    if (appStore.fileSearchStatus == Dty.Fstatus.Normal) {
        req.type = 'del'
    } else {
        req.type = 'destroy'
    }
    req.bDelThumb = false
    if (delType.value == 'delVideoAndThumb') req.bDelThumb = true
    console.log('delete file req', req)
    util.filesDel(req)
    appStore.curCheckedVideo.clear()
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
    /* VSCode sidebar background color */
}

.right-area-ctrl {
    margin-left: auto;
}

.volume-slider {
    width: 60px;
    height: 4px;
    margin: 0 8px;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
    background: #3c3c3c;
    border-radius: 2px;
}

.volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #0e639c;
    cursor: pointer;
}

.volume-slider::-webkit-slider-thumb:hover {
    background: #1177bb;
}

.volume-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #0e639c;
    cursor: pointer;
    border: none;
}
</style>
