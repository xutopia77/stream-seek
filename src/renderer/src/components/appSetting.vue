<template>
    <div class="app-setting-container">
        <div class="setting-card">
            <h3 class="setting-title">{{ t('appSetting.title') }}</h3>
            <div class="mode-selector">
                <span class="option-label">{{ t('appSetting.language') }}:</span>
                <select v-model="selectedLanguage" class="xc-select">
                    <option value="zh-CN">{{ t('appSetting.languageOptions.chinese') }}</option>
                    <option value="en-US">{{ t('appSetting.languageOptions.english') }}</option>
                </select>
            </div>
        </div>

        <div class="setting-card">
            <h3 class="setting-title">{{ t('common.operations') }}</h3>
            <button class="xc-button primary" @click="btnclk_saveSettings">
                {{ t('appSetting.operations.save') }}
            </button>
            <button class="xc-button" @click="btnclk_resetSettings">
                {{ t('appSetting.operations.reset') }}
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import '@renderer/assets/common.css'
// import { IpcApi } from '../utils/ipcApi'
import * as Dty from '../../../bridge/dataTypedef'
import { useAppStore } from '@renderer/stores/AppStore'

const { t, locale } = useI18n()
const appStore = useAppStore()

const selectedLanguage = ref<Dty.LangType>('zh-CN')

async function btnclk_saveSettings(): Promise<void> {
    try {
        // 保存语言设置到 store
        if (appStore.prj) {
            appStore.prj.language = selectedLanguage.value
        }

        // 保存到本地存储
        localStorage.setItem('locale', selectedLanguage.value)

        // 更新全局语言
        locale.value = selectedLanguage.value

        console.log(`Language setting saved: ${selectedLanguage.value}`)
    } catch (error) {
        console.error('Failed to save language setting:', error)
    }
    return
}

async function btnclk_resetSettings(): Promise<void> {
    try {
        // 重置为默认语言
        selectedLanguage.value = 'zh-CN'
        if (appStore.prj) {
            appStore.prj.language = 'zh-CN'
        }

        // 更新本地存储和全局语言
        localStorage.setItem('locale', 'zh-CN')
        locale.value = 'zh-CN'

        console.log('Language setting reset to default')
    } catch (error) {
        console.error('Failed to reset language setting:', error)
    }
}

// ------------------------------------------------

onMounted(() => {
    // 从 AppStore 加载当前语言设置
    if (appStore.prj) {
        selectedLanguage.value = appStore.prj.language
    }

    // 也可以从本地存储加载作为备用
    const storedLanguage = localStorage.getItem('locale') as Dty.LangType | null
    if (storedLanguage) {
        selectedLanguage.value = storedLanguage
        if (appStore.prj) {
            appStore.prj.language = storedLanguage
        }
    }
})
</script>

<style scoped>
.app-setting-container {
    height: 100%;
    width: 100%;
    padding: 15px;
    margin: 0;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
    box-sizing: border-box;
}

.setting-card {
    background-color: #2d2d30;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    flex-shrink: 0;
}

.setting-title {
    margin: 0 0 10px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #444;
    color: #ddd;
    font-size: 15px;
    font-weight: 600;
}

.mode-selector {
    display: flex;
    align-items: center;
    gap: 8px;
}

.option-label {
    color: #ccc;
    font-size: 13px;
}
</style>
