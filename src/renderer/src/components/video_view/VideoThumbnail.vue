<template>
        <div class="thumbnail-image-container">
            <ul class="thumbnail-list">
                <li v-for="(item, index) in imageList" :key="index">
                    <img class="thumbnail-img" :src="item.imageUrl" :alt="item.description">
                    <p>{{ item.description }}</p>
                </li>
            </ul>
        </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 定义图片对象的类型
interface ThumbnailImage {
  imageUrl: string;
  description: string;
}

// 定义图片列表数据
const imageList = ref<ThumbnailImage[]>([
    { imageUrl: 'src/data/image/frame_00001.jpg', description: '小图1描述' },
    { imageUrl: 'src/data/image/frame_00010.jpg', description: '小图2描述' },
]);

</script>

<style scoped>
.thumbnail-image-container {
    height: 15%;
    width: 100%;
    padding: 0;
    margin: 0;
}

.thumbnail-list {
    width: 100%;
    height: 100%;
    list-style-type: none;
    padding: 0;
    display: flex;
    /* 让列表项横向排列 */
    overflow-x: auto;
    /* 超出宽度时可滚动 */
    padding: 0;
    margin: 0;
}

.thumbnail-list li {
    margin: 0 5px;
    /* 调整左右间距 */
    flex-shrink: 0;
    /* 防止列表项收缩 */
    padding: 0;
    margin: 0;
}

/* 底部图片样式 */
.thumbnail-img {
    max-height: 100%;
    /* 确保图片不超过高度限制 */
    width: auto;
}
</style>
