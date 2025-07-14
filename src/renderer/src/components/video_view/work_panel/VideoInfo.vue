<template>
    <div class="page-container">
        <div class="tag-info">
            <input class="xc-text-input" type="text" placeholder="设置标签" />
        </div>
    </div>
</template>
<script setup lang="ts"></script>

<style scoped>
/* 原有的样式保持不变 */
.page-container {
    height: 100%;
    width: calc(100% - 1px);
    padding: 0;
    margin: 0;
    background-color: var(--xc-background-color);
    /* VSCode 侧边栏背景色 */
    color: var(--xc-text-color);
    /* 文字颜色 */
    white-space: nowrap;
    overflow-x: auto;
    border-right: 1px solid #333;
    /* 右侧边框 */
}

.tag-info {
    width: 100%;
    padding: 0;
    margin: 0;
}

/* 兼容 Firefox */
.page-container {
    scrollbar-width: thin;
    scrollbar-color: #555 #333;
}
</style>
