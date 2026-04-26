<template>
    <div class="page-contianer">
        <router-link to="/" class="no-underline-link">
            <button class="xc-button">{{ t('adminNav.returnHome') }}</button>
        </router-link>
        <router-link to="/admin/prj_set" class="no-underline-link">
            <button class="xc-button">{{ t('adminNav.projectSettings') }}</button>
        </router-link>
        <router-link to="/admin/tag_mng" class="no-underline-link">
            <button class="xc-button">{{ t('adminNav.tagManagement') }}</button>
        </router-link>
        <router-link to="/thumb_mng" class="no-underline-link">
            <button class="xc-button">{{ t('adminNav.thumbnailManagement') }}</button>
        </router-link>
        <router-link to="/tiny_file_db" class="no-underline-link">
            <button class="xc-button">{{ t('adminNav.smallFileOrganization') }}</button>
        </router-link>
        <router-link to="/app_setting" class="no-underline-link">
            <button class="xc-button">{{ t('adminNav.settings') }}</button>
        </router-link>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.page-contianer {
    display: flex;
    height: 100%;
    width: 100%;
    padding: 0;
    margin: 0;
}
</style>