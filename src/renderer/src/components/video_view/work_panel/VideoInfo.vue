<template>
    <div class="page-container">
        <div class="tag-info">
            <input
                v-model="newTag"
                placeholder="输入标签确认添加"
                class="xc-text-input"
                type="text"
                @keyup.enter="btn_addTag"
            />
            <br />
            <div
                v-for="(tag, index) in fileTags"
                :key="index"
                class="xc-tag"
                :style="{
                    backgroundColor: tag.color
                }"
            >
                {{ tag.name }}
                <span class="xc-text tag-btn-del" @click="btn_removeTag(tag)"> ❌ </span>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import MessageShow from '@renderer/components/util/MessageShow.vue'
// import util from '@renderer/utils/util'
import { ref, computed } from 'vue'
import { useAppStore } from '@renderer/stores/AppStore'
const appStore = useAppStore()
import * as Dty from '../../../../../bridge/dataTypedef'
import util from '@renderer/utils/util'
// ------------------------------------
const fileTags = computed(() => {
    if (appStore.curSltVideo == null) return []
    return appStore.curSltVideo.tags
})
function btn_removeTag(tag: Dty.Tag): void {
    console.log(`remove tag ${tag.name}`)
    // if (appStore.curSltFile?.id == null) return
    // const req: DatType.FilesTagSetReq = {
    //     fileIds: [appStore.curSltFile.id],
    //     tagName: tag.name
    // }
    // Utils.files_tag_delete(req)
}
// ------------------------------------
const newTag = ref('')
const btn_addTag = async (): Promise<void> => {
    const req = new Dty.FileTagsReq()
    let tagName = ''
    if (newTag.value.trim()) {
        tagName = newTag.value.trim()
    }
    if (tagName == '') {
        MessageShow.warn(`标签名不能为空`)
        return
    }
    for (const item of appStore.curCheckedVideo) {
        const fileTag: Dty.FileTagsReqItem = {
            fileId: item.id,
            tagName: tagName
        }
        req.fileTags.push(fileTag)
    }
    if (req.fileTags.length === 0) {
        MessageShow.warn(`请选择文件`)
        return
    }
    await util.file_tags_set(req, { bNeedUpdate: true })
    newTag.value = ''
}
</script>

<style scoped>
/* 原有的样式保持不变 */
.page-container {
    height: 100%;
    width: calc(100% - 1px);
    padding: 0;
    margin: 0;
    background-color: var(--xc-background-color);
    /* VSCode 侧边栏背景色 */
    color: var(--xc-text-color);
    /* 文字颜色 */
    white-space: nowrap;
    overflow-x: auto;
    border-right: 1px solid #333;
    /* 右侧边框 */
}

.tag-info {
    width: 100%;
    padding: 0;
    margin: 0;
}

/* 兼容 Firefox */
.page-container {
    scrollbar-width: thin;
    scrollbar-color: #555 #333;
}

.tag-btn-del {
    font-size: 12px;
}
.tag-btn-del:hover {
    background-color: var(--xc-text-color);
}
</style>
