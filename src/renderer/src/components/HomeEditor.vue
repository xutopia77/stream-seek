<template>
    <div
        class="home-editor-container"
        :class="{ 'drag-over': isDragOver }"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
    >
        <div class="editor-main">
            <div class="video-area">
                <div class="video-wrapper">
                    <video
                        v-show="viewModel === 'video'"
                        ref="videoRef"
                        :src="appStore.videoPlayCtrl.curSrc"
                    ></video>
                    <ThumbnailView v-show="viewModel === 'thumbnail'"></ThumbnailView>
                    <div
                        v-if="!appStore.curSltVideo && !isDragOver"
                        class="drop-hint"
                        @click="onHintClick"
                    >
                        <span class="drop-hint-text">{{ t('homeEditor.dropVideoHint') }}</span>
                        <span class="drop-hint-sub">{{ t('homeEditor.clickToSelect') }}</span>
                    </div>
                </div>
            </div>
            <div class="edit-panel">
                <VideList v-if="appStore.isProjectMode" />
                <VideoOperatePanel v-if="!appStore.isProjectMode" />
                <VideoInfo
                    v-if="appStore.isProjectMode && rightPanel === Dty.WorkPanel.VideoInfo"
                />
            </div>
        </div>
        <div class="control-area">
            <PlayProgressBar />
            <PlayCtrl />
        </div>
        <div v-if="isDragOver" class="drag-overlay" @drop.prevent.stop="onDrop">
            <div class="drag-overlay-content">
                <span class="drag-icon">📁</span>
                <span class="drag-text">{{ t('homeEditor.dropToOpen') }}</span>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import VideList from './video_view/work_panel/VideList.vue'
import VideoOperatePanel from './video_view/work_panel/VideoOperatePanel.vue'
import VideoInfo from './video_view/work_panel/VideoInfo.vue'
import ThumbnailView from './video_view/ThumbnailView.vue'
import PlayProgressBar from './video_view/PlayProgressBar.vue'
import PlayCtrl from './video_view/PlayCtrl.vue'
import { PlayReq } from '../utils/util'
import { ref, onMounted, watch, onBeforeMount, computed, onUnmounted, onBeforeUnmount } from 'vue'
import util from '@renderer/utils/util'
import { useAppStore } from '@renderer/stores/AppStore'
import { IpcApi } from '../utils/ipcApi'
import { useI18n } from 'vue-i18n'
const appStore = useAppStore()
import * as Dty from '../../../bridge/dataTypedef'

const { t } = useI18n()

const viewModel = computed(() => {
    return appStore.curViewModel
})

const rightPanel = computed(() => appStore.rightPanel)

const videoRef = ref<HTMLVideoElement | null>(null)
const isDragOver = ref(false)
let dragEnterCounter = 0

const onDragEnter = (_event: DragEvent): void => {
    console.log('[HomeEditor] onDragEnter triggered')
    dragEnterCounter++
    isDragOver.value = true
}

const onDragOver = (event: DragEvent): void => {
    event.preventDefault()
}

const onDragLeave = (_event: DragEvent): void => {
    console.log('[HomeEditor] onDragLeave triggered')
    dragEnterCounter--
    if (dragEnterCounter === 0) {
        isDragOver.value = false
    }
}

const onDrop = async (event: DragEvent): Promise<void> => {
    console.log('[HomeEditor] onDrop triggered')
    isDragOver.value = false
    dragEnterCounter = 0
    console.log('[HomeEditor] event.dataTransfer:', event.dataTransfer)
    const files = event.dataTransfer?.files
    console.log('[HomeEditor] files:', files, 'length:', files?.length)
    if (!files || files.length === 0) {
        console.log('[HomeEditor] No files found')
        return
    }
    const file = files[0]
    console.log('[HomeEditor] file:', file)
    console.log('[HomeEditor] file.name:', file.name)
    console.log('[HomeEditor] file.type:', file.type)

    let filePath: string | null = null
    try {
        filePath = window.electronAPI.getPathForFile(file)
        console.log('[HomeEditor] filePath from webUtils:', filePath)
    } catch (e) {
        console.log('[HomeEditor] getPathForFile failed:', e)
    }

    if (!filePath) {
        console.log('[HomeEditor] filePath is empty, opening file dialog...')
        filePath = await openVideoDialog()
        if (!filePath) {
            console.log('[HomeEditor] User canceled file selection')
            return
        }
    }
    await openExternalVideo(filePath)
}

const openVideoDialog = async (): Promise<string | null> => {
    const req: Dty.Req = {
        cmd: Dty.CmdType.openVideoDialog
    }
    const response: Dty.Resp<string> = await IpcApi.trigger_event(req)
    if (response.code !== 0) {
        return null
    }
    return response.data || null
}

const onHintClick = async (): Promise<void> => {
    const filePath = await openVideoDialog()
    if (filePath) {
        await openExternalVideo(filePath)
    }
}

const openExternalVideo = async (filePath: string): Promise<void> => {
    console.log('[HomeEditor] openExternalVideo called with filePath:', filePath)

    // If in project mode, close the project first
    if (appStore.isProjectMode) {
        console.log('[HomeEditor] Closing project before opening external video')
        const closeReq: Dty.Req = {
            cmd: Dty.CmdType.prjClose
        }
        await IpcApi.trigger_event(closeReq)
        // Clear project info in store
        appStore.prj = null
        appStore.appInfo.prjFile = ''
    }

    if (appStore.curSltVideo) {
        appStore.curSltVideo = null
        appStore.curSltVideoName4Play = ''
        util.clear_cur_slt_video_info(null)
    }
    appStore.videoList = []
    appStore.videoTotalNum = 0
    appStore.clipProject = null

    const req: Dty.Req<Dty.Req_SltFile> = {
        cmd: Dty.CmdType.openExternalVideo,
        data: {
            filepath: filePath
        }
    }
    console.log('[HomeEditor] Sending request:', req)
    const response: Dty.Resp<Dty.File> = await IpcApi.trigger_event(req)
    console.log('[HomeEditor] Response:', response)
    if (response.code !== 0) {
        console.log('[HomeEditor] Response error:', response.status)
        util.addToastErr(`${t('homeEditor.openVideoFailed')}: ${response.status}`)
        return
    }
    const respData: Dty.File | undefined = response.data
    console.log('[HomeEditor] respData:', respData)
    if (respData == undefined) {
        console.log('[HomeEditor] respData is undefined')
        util.addToastErr(t('homeEditor.openVideoFailed'))
        return
    }
    console.log('[HomeEditor] Setting curSltVideo:', respData.name)
    appStore.curSltVideo = respData
    appStore.curSltVideoName4Play = respData.name
    util.addToastInfo(t('homeEditor.openVideoSuccess'))
}

watch(
    () => appStore.curSltVideoName4Play,
    () => {
        if (
            appStore.curSltVideoName4Play == null ||
            appStore.curSltVideoName4Play == '' ||
            appStore.curSltVideo == null
        ) {
            if (videoRef.value) {
                videoRef.value.src = ''
            }
            return
        }
        const clearReq = new Dty.ClearSltInfoReq()
        clearReq.bNotClear_curSltVideo = true
        util.clear_cur_slt_video_info(clearReq)
        console.log(`video info ${appStore.curSltVideo}`)

        const playReq = new PlayReq(Dty.File.makePlayUrl(appStore.curSltVideo))
        if (videoRef.value == null) {
            return
        }
        util.play_video(videoRef.value, playReq)
    }
)

watch(
    () => appStore.videoPlayCtrl.isPlay,
    () => {
        if (videoRef.value == null) {
            return console.log('video ref null')
        }
        util.toggle_play(videoRef.value)
        console.log('video ref', `${videoRef.value.src}`)
    }
)

function nextFrame(): void {
    if (videoRef.value != null) {
        const frameRate = appStore.curSltVideo?.mediaInfo?.video.frame_rate
        if (frameRate == null) {
            console.log('frame rate is null')
            return
        }
        let video = videoRef.value
        if (!video.paused) video.pause()
        const frameInterval = 1 / frameRate
        util.set_video_cur_time(video, video.currentTime + frameInterval)
    }
}

function previousFrame(): void {
    if (videoRef.value != null) {
        const frameRate = appStore.curSltVideo?.mediaInfo?.video.frame_rate
        if (frameRate == null) {
            console.log('frame rate is null')
            return
        }
        let video = videoRef.value
        if (!video.paused) video.pause()
        const frameInterval = 1 / frameRate
        util.set_video_cur_time(video, Math.max(0, video.currentTime - frameInterval))
    }
}

watch(
    () => videoRef.value,
    (newVal) => {
        if (newVal == null) {
            return
        }
        if (appStore.curSltVideo != null) {
            if (videoRef.value == null) {
                console.log('video ref null')
                return
            }
            const playReq = new PlayReq(Dty.File.makePlayUrl(appStore.curSltVideo))
            util.play_video(videoRef.value, playReq)
        }
    }
)

watch(
    () => appStore.curViewModel,
    (newVal) => {
        if (newVal === 'video') {
            if (appStore.curSltVideo == null) {
                return
            }

            if (appStore.curSltVideo != null) {
                if (videoRef.value == null) {
                    console.log('video ref null')
                    return
                }
                const playReq = new PlayReq(Dty.File.makePlayUrl(appStore.curSltVideo))
                if (appStore.thumbSeekTime != 0) {
                    playReq.playStartTimeSec = appStore.thumbSeekTime
                }
                util.play_video(videoRef.value, playReq)
            }
        } else if (newVal === 'thumbnail') {
            util.clear_cur_slt_video_info({ clearModel: 'changeToThumbnail' })
        } else {
            console.log('unsupported view model:', newVal)
        }
    }
)

watch(
    () => appStore.videoPlayCtrl.playbackRate,
    () => {
        if (videoRef.value != null) {
            videoRef.value.playbackRate = appStore.videoPlayCtrl.playbackRate
        }
    }
)

watch(
    () => appStore.barSeekTime,
    (newValue) => {
        if (videoRef.value != null && appStore.videoPlayCtrl.curSrc) {
            const targetTime = newValue + appStore.videoPlayCtrl.videoStartTime

            const wasPlaying = !videoRef.value.paused
            if (wasPlaying) {
                videoRef.value.pause()
            }

            videoRef.value.currentTime = targetTime

            console.log(
                `seeking to ${targetTime}(start:${appStore.videoPlayCtrl.videoStartTime}), state ${videoRef.value.readyState}, currentTime ${appStore.videoPlayCtrl.curTime}`
            )

            const waitForSeek = new Promise<void>((resolve) => {
                const onSeeked = (): void => {
                    videoRef.value?.removeEventListener('seeked', onSeeked)
                    videoRef.value?.removeEventListener('error', onError)
                    resolve()
                }

                const onError = (): void => {
                    videoRef.value?.removeEventListener('seeked', onSeeked)
                    videoRef.value?.removeEventListener('error', onError)
                    console.error('Video seek error')
                    resolve()
                }

                videoRef.value?.addEventListener('seeked', onSeeked, { once: true })
                videoRef.value?.addEventListener('error', onError, { once: true })
            })

            waitForSeek.then(() => {
                if (wasPlaying && videoRef.value) {
                    videoRef.value.play()
                }
                console.log(
                    `seek completed to ${targetTime}, currentTime ${appStore.videoPlayCtrl.curTime}`
                )
            })
        }
    }
)

watch(
    () => appStore.videoPlayCtrl.isStop,
    (newValue) => {
        if (videoRef.value != null) {
            if (newValue == true) {
                videoRef.value.pause()
            }
        }
    }
)

onBeforeMount(() => {
    appStore.func_nextFrame = nextFrame
    appStore.func_prevFrame = previousFrame
    appStore.func_get_ele_video = (): HTMLVideoElement | null => {
        return videoRef.value
    }
    appStore.rightPanel = Dty.WorkPanel.Operate
})
onMounted(() => {
    if (videoRef.value == null) {
        console.log('video ref null')
        return
    }
    util.setupVideoEventListeners(videoRef.value)
})

onBeforeUnmount(() => {
    if (videoRef.value == null) {
        console.log('video ref null')
        return
    }
    util.stop_play(false)
    util.toggle_play(videoRef.value)
    videoRef.value.src = ''
})

onUnmounted(() => {
    if (videoRef.value == null) {
        console.log('video ref null')
        return
    }
    util.setupVideoEventListeners(videoRef.value, true)
    const clearReq = new Dty.ClearSltInfoReq()
    clearReq.bNotClear_curSltVideo = true
    util.clear_cur_slt_video_info(clearReq)
})
</script>

<style scoped>
.home-editor-container {
    height: calc(100% - var(--xc-home-nac-height));
    width: 100%;
    padding: 0;
    margin: 0;
    background-color: #1e1e1e;
    display: flex;
    flex-direction: column;
    position: relative;
}

.home-editor-container.drag-over {
    background-color: #2a2d2e;
}

.editor-main {
    width: 100%;
    height: calc(100% - 60px);
    padding: 0;
    margin: 0;
    display: flex;
}

.video-area {
    height: 100%;
    flex: 1;
    padding: 0;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
}

.video-wrapper {
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: black;
    position: relative;
}

.video-wrapper video {
    max-height: 100%;
    width: 100%;
    padding: 0;
    margin: 0;
    object-fit: contain;
}

.drop-hint {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: auto;
    cursor: pointer;
    padding: 20px 40px;
    border-radius: 8px;
    transition: background-color 0.2s;
}

.drop-hint:hover {
    background-color: rgba(0, 122, 204, 0.1);
}

.drop-hint-text {
    color: #666;
    font-size: 18px;
    display: block;
}

.drop-hint-sub {
    color: #007acc;
    font-size: 14px;
    display: block;
    margin-top: 8px;
}

.edit-panel {
    height: 100%;
    width: 20%;
    max-width: 250px;
    padding: 0;
    margin: 0;
    border-left: 1px solid #333;
}

.control-area {
    height: 60px;
    width: 100%;
    padding: 0;
    margin: 0;
    background-color: #252526;
}

.drag-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(37, 37, 38, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    border: 3px dashed #007acc;
    box-sizing: border-box;
}

.drag-overlay-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    pointer-events: none;
}

.drag-icon {
    font-size: 64px;
}

.drag-text {
    color: #007acc;
    font-size: 24px;
    font-weight: 500;
}
</style>
