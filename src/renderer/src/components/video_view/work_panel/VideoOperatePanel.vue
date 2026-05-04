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
        <button class="xc-button" title="在光标处拆分片段" @click="btnclk_splitVideo">➕</button>
        <button class="xc-button" title="去掉此片段的拆分信息" @click="removeVideosplit">➖</button>
        <button class="xc-button" title="去掉此片段" @click="removeVideoRecord">❌</button>
        <button class="xc-button" title="恢复此片段" @click="restoreVideoRecord">🔃</button>
        <button class="xc-button" title="导出剪辑" @click="showExportDialog">📤</button>
        <button class="xc-button" title="添加标签" @click="showTagDialog">🏷️</button>
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
            <span v-if="splitInfo.description" class="xc-text description-text">{{
                splitInfo.description
            }}</span>
        </div>
        <div v-if="tagDialogVisible" class="modal-overlay" @click.self="cancelTag">
            <div class="modal-dialog">
                <div class="modal-header">
                    <span class="modal-title">{{ t('videoOperatePanel.enterDescription') }}</span>
                </div>
                <div class="modal-body">
                    <input
                        ref="tagInputRef"
                        v-model="tagInputValue"
                        type="text"
                        class="tag-input"
                        :placeholder="t('videoOperatePanel.enterDescription')"
                        @keyup.enter="saveTag"
                        @keyup.escape="cancelTag"
                    />
                </div>
                <div class="modal-footer">
                    <button class="xc-button" @click="saveTag">{{ t('common.confirm') }}</button>
                    <button class="xc-button" @click="cancelTag">{{ t('common.cancel') }}</button>
                </div>
            </div>
        </div>
        <div v-if="exportDialogVisible" class="modal-overlay" @click.self="cancelExport">
            <div class="modal-dialog export-dialog">
                <div class="modal-header">
                    <span class="modal-title">{{ t('videoOperatePanel.exportSettings') }}</span>
                </div>
                <div class="modal-body">
                    <div class="export-option">
                        <label class="export-label">{{ t('videoOperatePanel.exportMode') }}</label>
                        <div class="export-mode-options">
                            <label class="radio-label">
                                <input
                                    v-model="exportMode"
                                    type="radio"
                                    :value="Dty.ExportMode.Segment"
                                />
                                <span>{{ t('videoOperatePanel.segmentExport') }}</span>
                            </label>
                            <label class="radio-label">
                                <input
                                    v-model="exportMode"
                                    type="radio"
                                    :value="Dty.ExportMode.Merge"
                                />
                                <span>{{ t('videoOperatePanel.mergeExport') }}</span>
                            </label>
                        </div>
                    </div>
                    <div class="export-hint">
                        <span class="hint-text">{{ t('videoOperatePanel.exportHint') }}</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="xc-button" @click="confirmExport">
                        {{ t('videoOperatePanel.export') }}
                    </button>
                    <button class="xc-button" @click="cancelExport">
                        {{ t('common.cancel') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { useAppStore } from '../../../stores/AppStore'
import { useI18n } from 'vue-i18n'
const appStore = useAppStore()
import '@renderer/assets/common.css'
import util from '../../../utils/util.js'
import * as Dty from '../../../../../bridge/dataTypedef'

const { t } = useI18n()

const tagDialogVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref<HTMLInputElement | null>(null)

const exportDialogVisible = ref(false)
const exportMode = ref<Dty.ExportMode>(Dty.ExportMode.Segment)

const showExportDialog = (): void => {
    exportDialogVisible.value = true
}

const cancelExport = (): void => {
    exportDialogVisible.value = false
}

const confirmExport = async (): Promise<void> => {
    exportDialogVisible.value = false
    await util.export_cut_video(exportMode.value)
}

const showTagDialog = (): void => {
    if (!selectedSplitInfo.value) {
        util.addToastErr(t('videoOperatePanel.selectSegmentFirst'))
        return
    }
    tagInputValue.value = selectedSplitInfo.value.description || ''
    tagDialogVisible.value = true
    nextTick(() => {
        tagInputRef.value?.focus()
    })
}

const saveTag = (): void => {
    if (!selectedSplitInfo.value || appStore.curSltVideo?.splitInfo == null) {
        return
    }
    const index = appStore.curSltVideo.splitInfo.splits.findIndex(
        (item: Dty.SplitInfo) => item.percent === selectedSplitInfo.value?.percent
    )
    if (index !== -1) {
        appStore.curSltVideo.splitInfo.splits[index].description = tagInputValue.value
    }
    tagDialogVisible.value = false
}

const cancelTag = (): void => {
    tagDialogVisible.value = false
}

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
        appStore.curSltVideo.splitInfo.splits[i].color =
            appStore.barColorDictionary[i % appStore.barColorDictionary.length]
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
                    splits[i].color =
                        appStore.barColorDictionary[i % appStore.barColorDictionary.length]
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
    border: 1px solid #800000;
    text-decoration: line-through;
    color: #a6a6a6;
}

.description-text {
    display: block;
    margin-top: 4px;
    padding: 4px;
    background-color: #2a2a2a;
    border-radius: 2px;
    color: #9cdcfe;
    font-size: 12px;
    word-break: break-all;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-dialog {
    background-color: #252526;
    border: 1px solid #454545;
    border-radius: 6px;
    min-width: 300px;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.modal-header {
    padding: 12px 16px;
    border-bottom: 1px solid #454545;
}

.modal-title {
    color: #d4d4d4;
    font-size: 14px;
    font-weight: 500;
}

.modal-body {
    padding: 16px;
}

.modal-footer {
    padding: 12px 16px;
    border-top: 1px solid #454545;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.tag-input {
    width: 100%;
    padding: 8px 12px;
    background-color: #3c3c3c;
    border: 1px solid #555;
    border-radius: 4px;
    color: #d4d4d4;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
}

.tag-input:focus {
    border-color: #007acc;
}

.export-dialog {
    min-width: 350px;
}

.export-option {
    margin-bottom: 12px;
}

.export-label {
    display: block;
    color: #d4d4d4;
    font-size: 13px;
    margin-bottom: 8px;
}

.export-mode-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: #d4d4d4;
    font-size: 13px;
}

.radio-label input[type='radio'] {
    accent-color: #007acc;
}

.export-hint {
    margin-top: 12px;
    padding: 8px;
    background-color: #2a2a2a;
    border-radius: 4px;
}

.hint-text {
    color: #9cdcfe;
    font-size: 12px;
}
</style>
