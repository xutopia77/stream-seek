<template>
    <div class="project-settings-container">
        <div class="settings-sidebar">
            <div class="sidebar-header">
                <button class="back-btn" @click="goBack">
                    ← {{ t('common.back') }}
                </button>
            </div>

            <div class="sidebar-menu">
                <div
                    v-for="item in menuItems"
                    :key="item.id"
                    class="menu-item"
                    :class="{ active: activeTab === item.id }"
                    @click="activeTab = item.id"
                >
                    <span class="icon">{{ item.icon }}</span>
                    <span class="label">{{ t(item.label) }}</span>
                </div>
            </div>
        </div>

        <div class="settings-content">
            <div class="content-header">
                <h2>{{ currentTitle }}</h2>
            </div>

            <div class="content-body xc-scrollbar">
                <AdminSetting v-if="activeTab === 'basic'" />
                <AdminFileList v-else-if="activeTab === 'files'" />
                <AdminTagMng v-else-if="activeTab === 'tags'" />
                <thumbMng v-else-if="activeTab === 'thumbnails'" />
                <tinyFileDb v-else-if="activeTab === 'tinyfiles'" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AdminSetting from './admin_setting/AdminSetting.vue'
import AdminFileList from './admin_setting/AdminFileList.vue'
import AdminTagMng from './admin_setting/AdminTagMng.vue'
import thumbMng from './thumbMng/thumbMng.vue'
import tinyFileDb from './tinyFileDb/tinyFileDb.vue'

const { t } = useI18n()
const router = useRouter()

const activeTab = ref('basic')

const menuItems = [
    { id: 'basic', icon: '⚙️', label: 'projectSettings.basicInfo' },
    { id: 'files', icon: '📁', label: 'projectSettings.fileList' },
    { id: 'tags', icon: '🏷️', label: 'projectSettings.tagManagement' },
    { id: 'thumbnails', icon: '🖼️', label: 'projectSettings.thumbnailManagement' },
    { id: 'tinyfiles', icon: '📦', label: 'projectSettings.smallFileOrganization' }
]

const currentTitle = computed(() => {
    const item = menuItems.find(i => i.id === activeTab.value)
    return item ? t(item.label) : ''
})

const goBack = (): void => {
    router.push('/')
}
</script>

<style scoped>
.project-settings-container {
    height: calc(100% - var(--xc-home-nac-height));
    display: flex;
    background-color: var(--xc-background-color);
}

.settings-sidebar {
    width: 200px;
    min-width: 200px;
    background-color: #252526;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    padding: 12px;
    border-bottom: 1px solid #333;
}

.back-btn {
    background: none;
    border: none;
    color: #007acc;
    cursor: pointer;
    font-size: 13px;
    padding: 4px 8px;
    border-radius: 4px;
}

.back-btn:hover {
    background-color: #37373d;
}

.sidebar-menu {
    flex: 1;
    padding: 8px 0;
    overflow-y: auto;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    color: #ccc;
    cursor: pointer;
    transition: background-color 0.15s;
}

.menu-item:hover {
    background-color: #37373d;
}

.menu-item.active {
    background-color: #094771;
    color: #fff;
}

.icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
}

.label {
    font-size: 13px;
}

.settings-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.content-header {
    padding: 16px 24px;
    border-bottom: 1px solid #333;
    background-color: #252526;
}

.content-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: #fff;
}

.content-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;
}
</style>
