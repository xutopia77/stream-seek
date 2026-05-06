<template>
    <div class="page-container xc-scrollbar">
        <ul>
            <!-- Modified: Add dynamic class name and checkbox -->
            <li
                v-for="(video, index) in videoList"
                :key="index"
                :class="{ selected: video === appStore.curSltThumb }"
            >
                <label class="vscode-checkbox">
                    <input
                        type="checkbox"
                        :checked="appStore.curChkThumb.has(video)"
                        @change="
                            toggleVideoSelection(
                                video,
                                ($event.target as HTMLInputElement).checked,
                                index
                            )
                        "
                    />
                    <span class="checkmark"></span>
                </label>
                <span
                    class="xc-text"
                    :style="getVideoLevelColorStyle(video)"
                    @click="btn_playVideo(video)"
                    >{{ `${index + 1}:${Dty.File.makeDisplayName(video)}` }}</span
                >
            </li>
        </ul>
        <PaginationCtrl page-type="thumb" />
    </div>
</template>

<script setup lang="ts">
import PaginationCtrl from '@renderer/components/common/paginationCtrl.vue'
import { computed, onBeforeMount, ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@renderer/stores/AppStore'
import { useI18n } from 'vue-i18n'
const appStore = useAppStore()
import '@renderer/assets/common.css'
import * as Dty from '../../../../bridge/dataTypedef'

const { t } = useI18n()
const videoList = computed<Dty.File[]>(() => appStore.thumbList)

// Record last selected index
const lastSelectedIndex = ref(-1)
// Record if Shift key is pressed
const isShiftPressed = ref(false)

// Listen to keyboard events
const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.shiftKey) {
        isShiftPressed.value = true
    }
}

const handleKeyUp = (): void => {
    isShiftPressed.value = false
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
})

// Toggle video selection state
const toggleVideoSelection = (video: Dty.File, isChecked: boolean, currentIndex: number): void => {
    console.log(
        t('thumbFileList.selectionChanged', {
            name: video.name,
            status: isChecked ? 'selected' : 'deselected'
        })
    )
    if (isShiftPressed.value && lastSelectedIndex.value !== -1) {
        const start = Math.min(lastSelectedIndex.value, currentIndex)
        const end = Math.max(lastSelectedIndex.value, currentIndex)
        for (let i = start; i <= end; i++) {
            const item = videoList.value[i]
            if (isChecked) {
                appStore.curChkThumb.add(item)
            } else {
                appStore.curChkThumb.delete(item)
            }
        }
    } else {
        if (isChecked) {
            appStore.curChkThumb.add(video)
        } else {
            appStore.curChkThumb.delete(video)
        }
    }
    lastSelectedIndex.value = currentIndex
}

onBeforeMount(() => {})

const btn_playVideo = (video: Dty.File): void => {
    appStore.curSltThumb = video
}

/**
 * Get font color style under dark theme based on video level
 * @param {Object} video - Video object containing tags array
 * @returns {string} Inline style string with color
 */
const getVideoLevelColorStyle = (video): string => {
    // Defensive check: avoid errors caused by tags not existing or being empty
    if (!video?.tags || video.tags.length === 0) {
        return 'color: #cccccc;' // Default light gray (common for dark background)
    }

    // Extract level name and convert to lowercase for robustness
    const levelName = video.tags[0].name.toLowerCase()

    // Level color mapping for dark theme (high contrast, level distinction)
    const levelColorMap = {
        sys_score1: '#00c6ff', // Bright blue (highest level, most prominent)
        sys_score2: '#76ff03', // Bright green (second highest)
        sys_score3: '#ffea00', // Golden yellow (medium level)
        sys_score4: '#ff9100', // Orange (second lowest)
        sys_score5: '#ff3d00' // Orange-red (lowest level)
    }

    // Match color, use default light gray if no match
    const targetColor = levelColorMap[levelName] || '#cccccc'
    console.log(t('thumbFileList.levelColorMapping', { levelName, targetColor }))
    return `color: ${targetColor};`
}
</script>

<style scoped>
/* Keep original styles unchanged */
.page-container {
    height: 100%;
    width: calc(100% - 1px);
    padding: 0;
    margin: 0;
    background-color: var(--xc-background-color);
    /* VSCode sidebar background color */
    color: var(--xc-text-color);
    /* Text color */
    white-space: nowrap;
    overflow-x: auto;
    border-right: 1px solid #333;
    /* Right border */
    display: flex;
    flex-direction: column;
}

/* Firefox compatibility */
.page-container {
    scrollbar-width: thin;
    scrollbar-color: #555 #333;
}

.page-container ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
    flex: 1;
    overflow-y: auto;
}

.page-container li {
    cursor: pointer;
    padding: 2px 2px;
    /* Add padding */
    border-bottom: 1px solid #333;
    /* Bottom border */
}

.page-container li:hover {
    background-color: #37373d;
    /* Mouse hover background color */
}

.page-container li:active {
    background-color: #094771;
    /* Mouse click background color */
}

/* Modified: Add selected style */
.page-container li.selected {
    background-color: #094771;
    /* VSCode selected item background color */
    color: white;
    /* VSCode selected item text color */
}

.vscode-checkbox {
    padding-left: 10px;
    padding-right: 10px;
    padding: 0px;
    margin: 0px;
    opacity: 0.7;
}
</style>
