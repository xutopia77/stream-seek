<template>
    <div class="progress-bar-container" :style="{ height: height + 'px' }">
        <div
            v-for="(clip, index) in clips"
            :key="index"
            class="progress-bar"
            :style="{
                left: `${clip.percent}%`,
                width: `${clip.width}%`,
                backgroundColor: clip.color
            }"
            @mouseover="showTooltip(clip)"
            @mouseout="handleMouseOut($event, clip)"
        >
            <!-- Modified: Add check for clip.tip -->
            <div v-if="showTip && currentClip === clip && clip.tip" class="tooltip">
                {{ `${clip.tip}` }}
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { defineProps, ref } from 'vue'

// Define clip type interface
interface Clip {
    percent: number
    width: number
    color: string
    tip?: string
}

// Define props type
defineProps<{
    clips: Clip[]
    height: number
}>()

const showTip = ref(false)
const currentClip = ref<Clip | null>(null)

const showTooltip = (clip: Clip): void => {
    showTip.value = true
    currentClip.value = clip
}

const handleMouseOut = (event: MouseEvent, clip: Clip | null): void => {
    if (event.target == null) {
        return
    }
    const tooltip = (event.target as Element).querySelector('.tooltip')
    // Modified: First check if event.relatedTarget is of Node type
    const relatedTarget = event.relatedTarget as Node | null
    if (!tooltip || (relatedTarget && !tooltip.contains(relatedTarget))) {
        showTip.value = false
        currentClip.value = null
    }
    if (clip) {
        return
    }
}
</script>

<style scoped>
.progress-bar-container {
    position: relative;
    width: 100%;
}

.progress-bar {
    position: absolute;
    height: 100%;
    border-radius: 2px;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
    opacity: 0.8;
    transition: opacity 0.2s ease;
}

.progress-bar:hover {
    opacity: 1;
}

.tooltip {
    position: absolute;
    top: -20px;
    left: 0;
    background-color: #333;
    color: white;
    padding: 5px;
    border-radius: 3px;
    font-size: 12px;
}
</style>
