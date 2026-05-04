<template>
    <div class="video-action-contianer">
        <button class="xc-button">{{ t('videoAction.startDetection') }}</button>
    </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import '@renderer/assets/common.css'

const { t } = useI18n()
</script>

<style scoped>
.video-action-contianer {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
}
</style>
