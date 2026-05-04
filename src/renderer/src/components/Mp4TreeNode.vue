<template>
    <div class="tree-node" :class="{ 'is-search-match': isSearchMatch }">
        <div
            class="node-content"
            :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
            @click="onNodeClick"
        >
            <span v-if="hasChildren" class="toggle-icon">
                {{ node.expanded ? '▼' : '▶' }}
            </span>
            <span v-else class="toggle-icon placeholder"></span>
            <span class="box-icon">{{ getBoxIcon(node.type) }}</span>
            <span class="box-name" :class="{ selected: isSelected, highlight: isSearchMatch }">
                {{ node.name }}
                <span class="box-type">({{ node.type }})</span>
            </span>
        </div>
        <div v-if="hasChildren && node.expanded" class="children">
            <Mp4TreeNode
                v-for="(child, index) in node.children"
                :key="index"
                :node="child"
                :depth="depth + 1"
                :selected-box="selectedBox"
                :search-text="searchText"
                @select="$emit('select', $event)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as Dty from '../../../bridge/dataTypedef'

const props = defineProps<{
    node: Dty.Mp4Box
    depth: number
    selectedBox: Dty.Mp4Box | null
    searchText: string
}>()

const emit = defineEmits<{
    select: [box: Dty.Mp4Box]
}>()

const hasChildren = computed(() => props.node.children && props.node.children.length > 0)

const isSelected = computed(() => {
    return props.selectedBox === props.node
})

const isSearchMatch = computed(() => {
    if (!props.searchText) return false
    const search = props.searchText.toLowerCase()
    return (
        props.node.name.toLowerCase().includes(search) ||
        props.node.type.toLowerCase().includes(search)
    )
})

function onNodeClick() {
    if (hasChildren.value) {
        props.node.expanded = !props.node.expanded
    }
    emit('select', props.node)
}

function getBoxIcon(type: string): string {
    const iconMap: Record<string, string> = {
        ftyp: '📄',
        moov: '🎬',
        mvhd: '📋',
        trak: '🎞️',
        tkhd: '📋',
        mdia: '📦',
        mdhd: '📋',
        hdlr: '🔧',
        minf: '📦',
        dinf: '📦',
        dref: '📋',
        stbl: '📊',
        stsd: '📋',
        stts: '📊',
        stsc: '📊',
        stsz: '📊',
        stss: '📊',
        ctts: '📊',
        stco: '📍',
        co64: '📍',
        vmhd: '🎥',
        smhd: '🔊',
        udta: '🏷️',
        meta: '📝',
        mdat: '💾',
        free: '⬜',
        skip: '⬜',
        wide: '📐',
        url: '🔗',
        urn: '🔗'
    }
    return iconMap[type] || '📁'
}
</script>

<style scoped>
.tree-node {
    user-select: none;
}

.node-content {
    display: flex;
    align-items: center;
    padding: 3px 0;
    cursor: pointer;
    height: 22px;
    gap: 4px;
}

.node-content:hover {
    background-color: #2a2d2e;
}

.toggle-icon {
    width: 14px;
    font-size: 10px;
    color: #888;
    text-align: center;
    flex-shrink: 0;
}

.toggle-icon.placeholder {
    visibility: hidden;
}

.box-icon {
    width: 16px;
    text-align: center;
    flex-shrink: 0;
    font-size: 12px;
}

.box-name {
    font-size: 12px;
    color: #ccc;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.box-name.selected {
    background-color: #094771;
    color: #fff;
}

.box-name.highlight {
    background-color: rgba(255, 200, 0, 0.2);
}

.is-search-match .node-content {
    background-color: rgba(255, 200, 0, 0.1);
}

.box-type {
    color: #5a5a5a;
    font-size: 11px;
}

.children {
    border-left: 1px dotted #444;
}
</style>
