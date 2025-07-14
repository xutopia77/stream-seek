<template>
    <div class="admin-container">
        <div class="content-nav">
            <AdminNav></AdminNav>
        </div>
        <div class="content-section">
            <router-view />
        </div>
        <!-- <AdminSetting /> -->
    </div>
</template>

<script lang="ts" setup>
// import AdminSearch from './admin_search/AdminSearch.vue'
// import AdminSetting from './admin_setting/AdminSetting.vue'
import AdminNav from './admin_setting/AdminNav.vue'
</script>

<style scoped>
.admin-container {
    width: 100%;
    height: calc(100% - var(--xc-home-nac-height));
    margin: 0;
    padding: 0;
    background-color: var(--xc-page-background-color);
    color: var(--xc-page-text-color);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.content-nav {
    padding: 0;
    margin: 0;
    height: 32px;
    width: 100%;
    overflow-y: auto;
    /* 添加垂直滚动条 */
}

.content-section {
    padding: 0;
    margin: 0;
    height: calc(100% - 342px);
    width: 100%;
    overflow-y: auto;
    /* 添加垂直滚动条 */
}
</style>
