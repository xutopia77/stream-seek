<template>
    <div class="page-container">
        <div class="tag-info">
            <div class="tag-input-section">
                <input
                    v-model="newTag"
                    :placeholder="t('videoInfo.tagPlaceholder')"
                    class="xc-text-input tag-input"
                    type="text"
                    @keyup.enter="btn_addTag"
                />
            </div>
            <div class="tags-container">
                <div
                    v-for="(tag, index) in fileTags"
                    :key="index"
                    class="xc-tag tag-item"
                    :style="{
                        backgroundColor: tag.color
                    }"
                >
                    <span class="tag-name">{{ tag.name }}</span>
                    <span class="tag-btn-del" @click="btn_removeTag(tag)">×</span>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@renderer/stores/AppStore'
import { useI18n } from 'vue-i18n'
import * as Dty from '../../../../../bridge/dataTypedef'
import util from '@renderer/utils/util'

const appStore = useAppStore()
const { t } = useI18n()

const fileTags = computed(() => {
    if (appStore.curSltVideo == null) return []
    return appStore.curSltVideo.tags
})

function btn_removeTag(tag: Dty.Tag): void {
    console.log(t('videoInfo.removeTag', { name: tag.name }))
    
    if (appStore.curSltVideo == null) {
        util.addToastErr(t('videoInfo.selectFileFirst'))
        return
    }
    
    util.file_tag_delete(appStore.curSltVideo.id, tag.id, { bNeedUpdate: true, bNeedSltCurVideo: true })
}

const newTag = ref('')
const btn_addTag = async (): Promise<void> => {
    const req = new Dty.FileTagsReq()
    let tagName = ''
    if (newTag.value.trim()) {
        tagName = newTag.value.trim()
    }
    if (tagName == '') {
        util.addToastErr(t('videoInfo.tagNameEmpty'))
        return
    }
    
    if (appStore.curCheckedVideo.size === 0) {
        util.addToastErr(t('videoInfo.selectFileFirst'))
        return
    }
    
    for (const item of appStore.curCheckedVideo) {
        const fileTag: Dty.FileTagsReqItem = {
            fileId: item.id,
            tagName: tagName
        }
        req.fileTags.push(fileTag)
    }
    
    await util.file_tags_set(req, { bNeedUpdate: true, bNeedSltCurVideo: true })
    newTag.value = ''
}
</script>

<style scoped>
.page-container {
    height: 100%;
    width: calc(100% - 1px);
    padding: 0;
    margin: 0;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    overflow-x: hidden;
    overflow-y: auto;
    border-right: 1px solid #333;
}

.tag-info {
    width: 100%;
    padding: 8px;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tag-input-section {
    width: 100%;
}

.tag-input {
    width: 100%;
    box-sizing: border-box;
}

.tags-container {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: flex-start;
}

.tag-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 12px;
    white-space: nowrap;
    user-select: none;
}

.tag-name {
    flex: 1;
}

.tag-btn-del {
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    opacity: 0.7;
    transition: opacity 0.2s;
    line-height: 1;
}

.tag-btn-del:hover {
    opacity: 1;
}

.page-container::-webkit-scrollbar {
    width: 8px;
}

.page-container::-webkit-scrollbar-track {
    background: #333;
}

.page-container::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
}

.page-container::-webkit-scrollbar-thumb:hover {
    background: #666;
}
</style>
