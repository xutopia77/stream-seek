<template>
  <div class="thumbnail-container common-scrollbar">
    <div v-for="thumb in thumbnailImages" :key="thumb.src" class="thumbnail-card">
      <img :src="thumb.src" :alt="thumb.title" />
      <span class="common-text" @click="btnclk_card_check(thumb)">{{ thumb.btnName }}</span>
      <span class="common-text">{{ thumb.title }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import '../../assets/common.css'
import util from '../../utils/util'
import { IpcApi } from '../../utils/IpcApi'
const ipcAPi: IpcApi = new IpcApi()
import { useAppStore } from '../../stores/AppStore'
const appStore = useAppStore()

// 定义缩略图对象的类型
interface Thumbnail {
  src: string
  time: number
  indexTime: number
  title: string
  checked: boolean
  btnName: string
}

let thumbnailImages = ref<Thumbnail[]>([])

let curCheckImage = ref<Thumbnail | null>(null)

// 按钮点击检查函数
function btnclk_card_check(thumb: Thumbnail): void {
  let lastChked = thumb.checked
  for (let i = 0; i < thumbnailImages.value.length; i++) {
    thumbnailImages.value[i].checked = false
    thumbnailImages.value[i].btnName = '⬜'
  }
  curCheckImage.value = thumb
  thumb.checked = !lastChked
  if (thumb.checked) {
    thumb.btnName = '✅'
  } else {
    thumb.btnName = '⬜'
  }
}

// 处理图片选中状态改变函数
function handle_image_checked_change(thumb: Thumbnail | null): void {
  if (thumb?.checked === false) {
    appStore.thumbSeekTime = 0
    return
  }
  appStore.thumbSeekTime = thumb?.indexTime || 0
  appStore.videoPlayCtrl.curTime = thumb?.indexTime || 0
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

// 更新缩略图函数
function updateThumbnailImages(): void {
  thumbnailImages.value = []
  if (appStore.curVideoInfo === null) {
    return
  }
  if (appStore.curVideoInfo.thumbnail === null) {
    return
  }
  for (let i = 0; i < appStore.curVideoInfo.thumbnail.length; i++) {
    let thumb = appStore.curVideoInfo.thumbnail[i]
    thumbnailImages.value.push({
      src: thumb.filepath,
      time: thumb.time,
      indexTime: thumb.indexTime,
      title: util.formatSecond2Time(thumb.indexTime),
      checked: false,
      btnName: '⬜'
    })
  }
}

// 监听当前选中视频的变化
watch(
  () => appStore.curSltVideo,
  async (newVal: any, oldVal: any): Promise<void> => {
    if (newVal === oldVal) {
      return
    }
    util.clear_cur_slt_video_info()
    await util.get_slt_video(ipcAPi, newVal)
    updateThumbnailImages()
    // playVideo(newVal.src)
  }
)

// 监听当前视频信息的缩略图变化
watch(
  () => appStore.curVideoInfo?.thumbnail,
  async (newVal: any, oldVal: any): Promise<void> => {
    if (newVal === oldVal) {
      return
    }
    updateThumbnailImages()
  }
)

// 组件挂载时更新缩略图
onMounted(async (): Promise<void> => {
  updateThumbnailImages()
})
</script>

<style scoped>
.thumbnail-container {
  display: flex;
  flex-wrap: wrap;
  gap: 2px; /* 卡片之间的间隙 */
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  color: var(--common-page-text-color);
  overflow-y: auto; /* 添加竖向滚动条 */
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
  background-color: var(--common-page-background-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  /* 计算卡片的高度，使每行显示 3 行 */
  height: calc((100% - 8px) / 3);
}

.thumbnail-card img {
  width: 100%;
  height: calc(100% - 20px); /* 减去标题的高度 */
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
