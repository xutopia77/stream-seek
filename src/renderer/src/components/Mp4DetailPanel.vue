<template>
    <div class="detail-panel">
        <div class="panel-header">
            <span class="header-title">{{ t('mediaInfo.detailInfo') }}</span>
        </div>
        <div class="panel-content xc-scrollbar">
            <div v-if="!box" class="no-selection">
                <span>{{ t('mediaInfo.selectBoxHint') }}</span>
            </div>
            <template v-else>
                <div class="info-section">
                    <h4 class="section-title">{{ t('mediaInfo.boxBasic') }}</h4>
                    <div class="info-table">
                        <div class="info-row">
                            <span class="info-label">type</span>
                            <span class="info-value">{{ box.type }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">name</span>
                            <span class="info-value">{{ box.name }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">size</span>
                            <span class="info-value">{{ formatSize(box.size) }}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">offset</span>
                            <span class="info-value offset-value"
                                >0x{{
                                    box.offset.toString(16).toUpperCase().padStart(8, '0')
                                }}</span
                            >
                        </div>
                    </div>
                </div>

                <div v-if="box.properties && box.properties.length > 0" class="info-section">
                    <h4 class="section-title">{{ t('mediaInfo.boxProperties') }}</h4>
                    <div class="info-table">
                        <div v-for="(prop, index) in box.properties" :key="index" class="info-row">
                            <span class="info-label">{{ prop.name }}</span>
                            <span class="info-value" :class="{ 'prop-hex': prop.isHex }">
                                {{ prop.isHex ? formatHex(prop.value) : prop.value }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="info-section">
                    <h4 class="section-title">{{ t('mediaInfo.boxDescription') }}</h4>
                    <div class="description-content">
                        {{ getBoxDescription(box.type) }}
                    </div>
                </div>

                <div v-if="box.children && box.children.length > 0" class="info-section">
                    <h4 class="section-title">
                        {{ t('mediaInfo.childBoxes') }} ({{ box.children.length }})
                    </h4>
                    <div class="children-list">
                        <div v-for="(child, index) in box.children" :key="index" class="child-item">
                            <span class="child-type">{{ child.type }}</span>
                            <span class="child-name">{{ child.name }}</span>
                            <span class="child-size">{{ formatSize(child.size) }}</span>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import * as Dty from '../../../bridge/dataTypedef'

const { t } = useI18n()

defineProps<{
    box: Dty.Mp4Box | null
}>()

function getBoxDescription(type: string): string {
    const trimmedType = type.trim()
    const key = `mp4BoxDescriptions.${trimmedType}`
    const description = t(key)
    if (description !== key) {
        return description
    }
    return t('mp4BoxDescriptions.default', { type })
}

function formatSize(size: number): string {
    if (size === 0) return '0'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
    return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function formatHex(value: string | number | boolean): string {
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    const num = typeof value === 'string' ? parseInt(value, 10) : value
    if (isNaN(num)) return String(value)
    return `0x${num.toString(16).toUpperCase().padStart(8, '0')}`
}
</script>

<style scoped>
.detail-panel {
    height: 100%;
    width: 320px;
    min-width: 280px;
    display: flex;
    flex-direction: column;
    background-color: #1e1e1e;
    border-left: 1px solid #333;
}

.panel-header {
    padding: 8px 12px;
    background-color: #2d2d30;
    border-bottom: 1px solid #444;
}

.header-title {
    font-size: 13px;
    font-weight: 600;
    color: #ddd;
}

.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
}

.no-selection {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: #5a5a5a;
    font-size: 12px;
}

.info-section {
    margin-bottom: 16px;
}

.section-title {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: #9cdcfe;
}

.info-table {
    display: flex;
    flex-direction: column;
}

.info-row {
    display: grid;
    grid-template-columns: 90px 1fr;
    padding: 3px 0;
    border-bottom: 1px solid #2d2d30;
    font-size: 11px;
}

.info-label {
    color: #858585;
}

.info-value {
    color: #ccc;
    word-break: break-all;
}

.prop-hex {
    color: #b5cea8;
    font-family: 'Consolas', monospace;
}

.offset-value {
    color: #b5cea8;
    font-family: 'Consolas', monospace;
}

.description-content {
    font-size: 11px;
    line-height: 1.6;
    color: #a0a0a0;
    background: #252526;
    padding: 8px 10px;
    border-radius: 4px;
    border-left: 3px solid #007acc;
}

.children-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.child-item {
    display: grid;
    grid-template-columns: 70px 1fr 60px;
    padding: 3px 6px;
    background: #252526;
    border-radius: 2px;
    font-size: 11px;
}

.child-item:hover {
    background: #37373d;
}

.child-type {
    color: #569cd6;
    font-family: 'Consolas', monospace;
}

.child-name {
    color: #ccc;
}

.child-size {
    color: #858585;
    text-align: right;
}
</style>
