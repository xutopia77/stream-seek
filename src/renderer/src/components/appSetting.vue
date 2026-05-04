<template>
    <div class="app-setting-container">
        <div class="setting-header">
            <button class="back-btn" @click="goBack">
                ← {{ t('common.back') }}
            </button>
            <h2>{{ t('appSetting.title') }}</h2>
        </div>

        <div class="setting-content xc-scrollbar">
            <div class="setting-card">
                <h3 class="setting-title">{{ t('appSetting.language') }}</h3>
                <div class="mode-selector">
                    <select v-model="selectedLanguage" class="xc-select">
                        <option value="zh-CN">{{ t('appSetting.languageOptions.chinese') }}</option>
                        <option value="en-US">{{ t('appSetting.languageOptions.english') }}</option>
                    </select>
                </div>
            </div>

            <div class="setting-card">
                <h3 class="setting-title">{{ t('common.operations') }}</h3>
                <div class="action-buttons">
                    <button class="xc-button primary" @click="btnclk_saveSettings">
                        {{ t('appSetting.operations.save') }}
                    </button>
                    <button class="xc-button" @click="btnclk_resetSettings">
                        {{ t('appSetting.operations.reset') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import '@renderer/assets/common.css'
import * as Dty from '../../../bridge/dataTypedef'
import { useAppStore } from '@renderer/stores/AppStore'

const { t, locale } = useI18n()
const router = useRouter()
const appStore = useAppStore()

const selectedLanguage = ref<Dty.LangType>('zh-CN')

const goBack = (): void => {
    router.push('/')
}

async function btnclk_saveSettings(): Promise<void> {
    try {
        if (appStore.prj) {
            appStore.prj.language = selectedLanguage.value
        }

        localStorage.setItem('locale', selectedLanguage.value)
        locale.value = selectedLanguage.value

        console.log(`Language setting saved: ${selectedLanguage.value}`)
    } catch (error) {
        console.error('Failed to save language setting:', error)
    }
    return
}

async function btnclk_resetSettings(): Promise<void> {
    try {
        selectedLanguage.value = 'zh-CN'
        if (appStore.prj) {
            appStore.prj.language = 'zh-CN'
        }

        localStorage.setItem('locale', 'zh-CN')
        locale.value = 'zh-CN'

        console.log('Language setting reset to default')
    } catch (error) {
        console.error('Failed to reset language setting:', error)
    }
}

onMounted(() => {
    if (appStore.prj) {
        selectedLanguage.value = appStore.prj.language
    }

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
    height: calc(100% - var(--xc-home-nac-height));
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    border-top: 1px solid #333;
    box-sizing: border-box;
}

.setting-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 24px;
    background-color: #252526;
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

.setting-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: #fff;
}

.setting-content {
    flex: 1;
    padding: 16px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.setting-card {
    background-color: #2d2d30;
    border: 1px solid #444;
    border-radius: 6px;
    padding: 16px;
}

.setting-title {
    margin: 0 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid #444;
    color: #ddd;
    font-size: 14px;
    font-weight: 600;
}

.mode-selector {
    display: flex;
    align-items: center;
    gap: 8px;
}

.action-buttons {
    display: flex;
    gap: 12px;
}

.xc-button.primary {
    background-color: #007acc;
    color: #fff;
    border-color: #007acc;
}

.xc-button.primary:hover {
    background-color: #0098ff;
    border-color: #0098ff;
}
</style>
