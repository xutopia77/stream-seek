<template>
    <div class="page-contianer">
        <router-link to="/" class="no-underline-link">
            <button class="xc-button">返回主页</button>
        </router-link>
        <router-link to="/admin/prj_set" class="no-underline-link">
            <button class="xc-button">项目设置</button>
        </router-link>
        <router-link to="/admin/tag_mng" class="no-underline-link">
            <button class="xc-button">标签管理</button>
        </router-link>
        <router-link to="/thumb_mng" class="no-underline-link">
            <button class="xc-button">缩略图管理</button>
        </router-link>
        <router-link to="/tiny_file_db" class="no-underline-link">
            <button class="xc-button">小文件整理</button>
        </router-link>
    </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.page-contianer {
    display: flex;
    height: 100%;
    width: 100%;
    padding: 0;
    margin: 0;
}
</style>
