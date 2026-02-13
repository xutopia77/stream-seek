<template>
    <div class="create-prj-comtainer">
        <router-link to="/" class="no-underline-link">
            <button class="xc-button">{{ t('createPrj.returnHome') }}</button>
        </router-link>
        <br />
        <div v-for="(repo, index) in dataRepo" :key="index" class="input-container">
            <div>
                <label>{{ t('createPrj.repoPath') }}：</label>
                <input
                    v-model="repo.path"
                    class="xc-text-input"
                    type="text"
                    :placeholder="t('createPrj.repoPathPlaceholder')"
                    style="width: 80%"
                />
            </div>
        </div>

        <button class="xc-button" @click="btnclk_create_prj">{{ t('createPrj.createProject') }}</button>
        <label>{{ t('createPrj.description') }}</label>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
// import { useAppStore } from '../stores/AppStore'
// const appStore = useAppStore()
import '@renderer/assets/common.css'
import { useRouter } from 'vue-router'
const router = useRouter()
import * as Dty from '../../../bridge/dataTypedef'
import util from '@renderer/utils/util'

const { t } = useI18n()

// 创建一个ref数组 3个元素
const dataRepo = ref<Dty.DataRepo[]>([
    {
        name: 'test_data',
        path: 'D:/02_workspace/05_timeCapsule/02_stream_manager/test_data',
        thumbnailPath: '',
        framePath: ''
    }
])

async function btnclk_create_prj(): Promise<void> {
    let relRepo = dataRepo.value.filter((repo) => repo.name != null && repo.name !== '')

    if (relRepo == null || relRepo.length === 0) {
        return util.addToast(t('createPrj.enterDataPath'), 'error')
    }
    const response = await util.create_prj(relRepo)
    if (response.code === 0) {
        if (response.bOver === false) {
            util.addToast(t('createPrj.creatingProject'), 'warning')
        } else {
            util.addToast(t('createPrj.createProjectSuccess'), 'info')
        }
        router.push('/')
    } else {
        util.addToast(`${t('createPrj.createProjectFailed')}: ${response.status}`, 'error')
    }
}
</script>
<style scoped>
.create-prj-comtainer {
    width: 100%;
    height: calc(100% - var(--xc-home-nac-height));
    margin: 0;
    padding: 0;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.input-container {
    margin: 0;
    padding: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--xc-background-color);
}
</style>