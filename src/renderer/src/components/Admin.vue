<template>
  <div class="admin-container">
    <AdminSetting />
  </div>
</template>

<script lang="ts" setup>
// import AdminSearch from './admin_search/AdminSearch.vue'
import AdminSetting from './admin_setting/AdminSetting.vue'
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
</style>
