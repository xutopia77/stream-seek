<template>
    <div class="mp4-structure-container">
        <div class="tree-header">
            <span class="header-title">MP4 Box {{ t('mediaInfo.structure') }}</span>
            <button class="expand-btn" @click="toggleExpandAll">
                {{ isAllExpanded ? '−' : '+' }}
            </button>
            <input type="text" class="search-input" :placeholder="t('mediaInfo.searchBox')" v-model="searchText">
        </div>
        <div class="tree-area xc-scrollbar">
            <div v-if="!boxes || boxes.length === 0" class="empty-hint">
                <span>{{ t('mediaInfo.noMp4Data') }}</span>
            </div>
            <div v-else class="tree-content">
                <Mp4TreeNode
                    v-for="(box, index) in filteredBoxes"
                    :key="index"
                    :node="box"
                    :depth="0"
                    :selected-box="selectedBox"
                    :search-text="searchText"
                    @select="onSelectBox"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Mp4TreeNode from './Mp4TreeNode.vue'
import * as Dty from '../../../bridge/dataTypedef'

const { t } = useI18n()

const props = defineProps<{
    boxes?: Dty.Mp4Box[]
}>()

const emit = defineEmits<{
    (e: 'select', box: Dty.Mp4Box): void
}>()

const searchText = ref('')
const selectedBox = ref<Dty.Mp4Box | null>(null)
const isAllExpanded = ref(true)

const filteredBoxes = computed(() => {
    if (!props.boxes) return []
    if (!searchText.value) return props.boxes
    return filterBoxes(props.boxes, searchText.value.toLowerCase())
})

function filterBoxes(boxes: Dty.Mp4Box[], search: string): Dty.Mp4Box[] {
    const result: Dty.Mp4Box[] = []
    for (const box of boxes) {
        const matchName = box.name.toLowerCase().includes(search)
        const matchType = box.type.toLowerCase().includes(search)
        let matchedChildren: Dty.Mp4Box[] | undefined
        if (box.children) {
            matchedChildren = filterBoxes(box.children, search)
        }
        if (matchName || matchType || (matchedChildren && matchedChildren.length > 0)) {
            result.push({
                ...box,
                children: matchedChildren
            })
        }
    }
    return result
}

function toggleExpandAll() {
    isAllExpanded.value = !isAllExpanded.value
}

function onSelectBox(box: Dty.Mp4Box) {
    selectedBox.value = box
    emit('select', box)
}
</script>

<style scoped>
.mp4-structure-container {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--xc-background-color);
    color: var(--xc-text-color);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.tree-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: #2d2d30;
    border-bottom: 1px solid #444;
}

.header-title {
    font-size: 13px;
    font-weight: 600;
    color: #ddd;
}

.expand-btn {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #3c3c41;
    border: 1px solid #555;
    border-radius: 3px;
    color: #ccc;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
}

.expand-btn:hover {
    background: #45454a;
    border-color: #666;
}

.search-input {
    flex: 1;
    padding: 4px 8px;
    background: #1e1e1e;
    border: 1px solid #3c3c41;
    border-radius: 3px;
    color: #ccc;
    font-size: 12px;
    outline: none;
}

.search-input:focus {
    border-color: #007acc;
}

.tree-area {
    flex: 1;
    overflow-y: auto;
}

.tree-content {
    padding: 8px 0;
}

.empty-hint {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: #5a5a5a;
    font-size: 13px;
}
</style>
