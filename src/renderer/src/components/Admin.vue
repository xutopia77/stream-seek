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
import { onMounted } from 'vue'
// import AdminSearch from './admin_search/AdminSearch.vue'
// import AdminSetting from './admin_setting/AdminSetting.vue'
import AdminNav from './admin_setting/AdminNav.vue'
import { useRouter } from 'vue-router'
const router = useRouter()

onMounted(() => {
    router.push('/admin/prj_set')
})
</script>

<style scoped>
.admin-container {
    width: 100%;
    height: calc(100% - var(--xc-home-nac-height));
    margin: 0;
    padding: 0;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
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
