<template>
    <div class="thumbnail-wrapper">
        <div class="thumbnail-toolbar">
            <span class="xc-text toolbar-label">{{ t('thumbnailView.cardSize') }}:</span>
            <button
                class="size-btn"
                :disabled="appStore.thumbnailCardSize <= 2"
                @click="changeCardSize(-1)"
            >
                -
            </button>
            <span class="xc-text size-value">{{ appStore.thumbnailCardSize }}</span>
            <button
                class="size-btn"
                :disabled="appStore.thumbnailCardSize >= 8"
                @click="changeCardSize(1)"
            >
                +
            </button>
        </div>
        <div class="thumbnail-container xc-scrollbar">
            <div
                v-for="thumb in thumbnailImages"
                :key="thumb.path"
                class="thumbnail-card"
                :style="cardStyle"
            >
                <img :src="thumbUrlMake(thumb)" :alt="thumb.name" />
                <span class="xc-text" @click="btnclk_card_check(thumb)">{{ thumb.btnName }}</span>
                <span class="xc-text">{{ Thumbnail.makeDisplayName(thumb.name) }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import '@renderer/assets/common.css'
import util from '../../utils/util'
import * as Dty from '../../../../bridge/dataTypedef'
import { useAppStore } from '../../stores/AppStore'
const appStore = useAppStore()

const { t } = useI18n()

class Thumbnail {
    path: string = ''
    name: string = ''
    indexTime: number = 0
    checked: boolean = false
    btnName: string = ''
    static makeDisplayName(thumbName: string): string {
        const timeStr = thumbName
        const year = timeStr.slice(0, 4)
        const month = timeStr.slice(4, 6)
        const day = timeStr.slice(6, 8)
        const hour = timeStr.slice(8, 10)
        const minute = timeStr.slice(10, 12)
        const second = timeStr.slice(12, 14)
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`
    }
}

const thumbDataUrls = reactive<Map<string, string>>(new Map())

async function loadThumbImage(thumb: Thumbnail): Promise<void> {
    const videoName = appStore.curSltVideo?.name
    if (!videoName) return
    if (thumbDataUrls.has(thumb.path)) return

    const dataUrl = await util.thumb_img_get(videoName, thumb.path)
    if (dataUrl) {
        thumbDataUrls.set(thumb.path, dataUrl)
    }
}

function thumbUrlMake(thumb: Thumbnail): string {
    const cached = thumbDataUrls.get(thumb.path)
    if (cached) return cached
    loadThumbImage(thumb)
    return ''
}

let thumbnailImages = ref<Thumbnail[]>([])

let curCheckImage = ref<Thumbnail | null>(null)

// 按钮点击检查函数
function btnclk_card_check(thumb: Thumbnail): void {
    let lastChked = thumb.checked
    for (let i = 0; i < thumbnailImages.value.length; i++) {
        thumbnailImages.value[i].checked = false
        thumbnailImages.value[i].btnName = t('thumbnailView.unchecked')
    }
    curCheckImage.value = thumb
    thumb.checked = !lastChked
    if (thumb.checked) {
        thumb.btnName = t('thumbnailView.checked')
    } else {
        thumb.btnName = t('thumbnailView.unchecked')
    }
}

// 处理图片选中状态改变函数
function handle_image_checked_change(thumb: Thumbnail | null): void {
    if (thumb?.checked === false) {
        appStore.thumbSeekTime = 0
        return
    }
    if (thumb?.indexTime == null) {
        appStore.thumbSeekTime = 0
    } else {
        const thubs = thumbnailImages.value
        if (thubs.length == 0) {
            appStore.thumbSeekTime = 0
        } else {
            appStore.thumbSeekTime = thumb.indexTime - thubs[0].indexTime
        }
    }
}

function update_thumbnail_images(thumbnailImages: Thumbnail[]): void {
    if (appStore.curSltVideo === null) {
        return
    }
    if (appStore.curSltVideo.thumbnail?.path == null) {
        console.log(t('thumbnailView.curVideoThumbnailNull'))
        return
    }
    for (let i = 0; i < appStore.curSltVideo.thumbnail.path.length; i++) {
        const thumb = appStore.curSltVideo.thumbnail.path[i]
        const thumbInfo = new Thumbnail()
        thumbInfo.path = thumb
        thumbInfo.indexTime = Dty.FileTools.parse_timestr_2_seconds(thumb)
        thumbInfo.name = util.getFilenameFromPath(thumb)
        thumbInfo.btnName = t('thumbnailView.unchecked')
        thumbnailImages.push(thumbInfo)
    }
}

const cardStyle = computed((): { flex: string; maxWidth: string } => {
    const cols = appStore.thumbnailCardSize
    const widthPercent = 100 / cols
    return {
        flex: `0 0 calc(${widthPercent}% - 2px)`,
        maxWidth: `calc(${widthPercent}% - 2px)`
    }
})

function changeCardSize(delta: number): void {
    const newSize = appStore.thumbnailCardSize + delta
    if (newSize >= 2 && newSize <= 8) {
        appStore.thumbnailCardSize = newSize
    }
}

// 监听当前选中图片的变化
watch(
    () => curCheckImage.value,
    async (newVal: Thumbnail | null, oldVal: Thumbnail | null): Promise<void> => {
        if (newVal === oldVal) {
            return
        }
        handle_image_checked_change(newVal)
    }
)

// 监听当前视频信息的缩略图变化
watch(
    () => appStore.curSltVideo?.thumbnail,
    async (): Promise<void> => {
        thumbDataUrls.clear()
        thumbnailImages.value = []
        update_thumbnail_images(thumbnailImages.value)
    }
)

// 组件挂载时更新缩略图
onMounted(async (): Promise<void> => {
    thumbnailImages.value = []
    update_thumbnail_images(thumbnailImages.value)
})
</script>

<style scoped>
.thumbnail-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}

.thumbnail-toolbar {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    background-color: var(--xc-background-color);
    border-bottom: 1px solid #333;
    gap: 8px;
}

.toolbar-label {
    font-size: 12px;
}

.size-btn {
    width: 24px;
    height: 24px;
    border: 1px solid #555;
    background-color: #333;
    color: var(--xc-text-color);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
}

.size-btn:hover:not(:disabled) {
    background-color: #444;
}

.size-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.size-value {
    min-width: 20px;
    text-align: center;
    font-size: 12px;
}

.thumbnail-container {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    flex: 1;
    padding: 2px;
    margin: 0;
    color: var(--xc-text-color);
    overflow-y: auto;
}

.thumbnail-card {
    border: 1px solid #2e2e2e;
    border-radius: 4px;
    padding: 1px;
    box-sizing: border-box;
    background-color: var(--xc-background-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
}

.thumbnail-card img {
    width: 100%;
    flex: 1;
    border-radius: 4px;
    object-fit: cover;
}

.thumbnail-card span {
    margin: 0;
    padding: 2px 4px;
    font-size: 11px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
