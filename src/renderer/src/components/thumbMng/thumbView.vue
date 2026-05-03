<template>
    <div class="thumbnail-container xc-scrollbar">
        <div v-for="thumb in thumbnailImages" :key="thumb.path" class="thumbnail-card">
            <img :src="thumbUrlMake(thumb)" :alt="thumb.name" />
            <span class="xc-text" @click="btnclk_card_check(thumb)">{{ thumb.btnName }}</span>
            <span class="xc-text">{{ Thumbnail.makeDisplayName(thumb.name) }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, reactive } from 'vue'
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
    const videoName = appStore.curSltThumb?.name
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
        thumbnailImages.value[i].btnName = t('thumbView.unchecked')
    }
    curCheckImage.value = thumb
    thumb.checked = !lastChked
    if (thumb.checked) {
        thumb.btnName = t('thumbView.checked')
    } else {
        thumb.btnName = t('thumbView.unchecked')
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
    if (appStore.curSltThumb === null) {
        return
    }
    if (appStore.curSltThumb.thumbnail?.path == null) {
        console.log(t('thumbView.curVideoThumbnailNull'))
        return
    }
    for (let i = 0; i < appStore.curSltThumb.thumbnail.path.length; i++) {
        const thumb = appStore.curSltThumb.thumbnail.path[i]
        const thumbInfo = new Thumbnail()
        thumbInfo.path = thumb
        thumbInfo.indexTime = Dty.FileTools.parse_timestr_2_seconds(thumb)
        thumbInfo.name = util.getFilenameFromPath(thumb)
        thumbInfo.btnName = t('thumbView.unchecked')
        thumbnailImages.push(thumbInfo)
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
    () => appStore.curSltThumb?.thumbnail,
    async (): Promise<void> => {
        thumbDataUrls.clear()
        thumbnailImages.value = []
        update_thumbnail_images(thumbnailImages.value)
        console.log(t('thumbView.thumbnailCount', { count: thumbnailImages.value.length }))
    }
)

// 组件挂载时更新缩略图
onMounted(async (): Promise<void> => {
    thumbnailImages.value = []
    update_thumbnail_images(thumbnailImages.value)
})
</script>

<style scoped>
.thumbnail-container {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    /* 卡片之间的间隙 */
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    color: var(--xc-text-color);
    overflow-y: auto;
    /* 添加竖向滚动条 */
    /* 计算卡片的总高度（3 行卡片 + 2 个间隙） */
    /* max-height: calc((((100% - 20px) / 3) * 3) + 20px); */
}

.thumbnail-card {
    /* 每行显示 4 张图片，减去间隙宽度 */
    flex: 0 0 calc(25% - 2px);
    max-width: calc(25% - 2px);
    border: 1px solid #2e2e2e;
    border-radius: 4px;
    padding: 1px;
    box-sizing: border-box;
    background-color: var(--xc-background-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    /* 计算卡片的高度，使每行显示 3 行 */
    height: calc((100% - 8px) / 3);
}

.thumbnail-card img {
    width: 100%;
    height: calc(100% - 20px);
    /* 减去标题的高度 */
    /* object-fit: cover; */
    border-radius: 4px;
}

.thumbnail-card p {
    /* margin-top: 1px; */
    margin-top: 0px;
    margin-bottom: 0px;
    padding: 0px;
    font-size: small;
    text-align: center;
}
</style>