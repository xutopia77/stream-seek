<template>
    <div v-for="(dailyClips, date) in groupedClips" :key="date">
        <span class="xc-text" style="background-color: #252526">{{ date }}</span>
        <div class="daily-timeline">
            <ProgressBar :clips="dailyClips" :height="20" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ProgressBar from './ProgressBar.vue'
import '@renderer/assets/common.css'

// Define Clip type
interface Clip {
    start: string
    end: string
    tip: string
    percent: number
    width: number
    color: string
}

type GroupedClips = Record<string, Clip[]>

// Modified to grouped data structure
const allClips = ref<GroupedClips>({
    '2025-03-23': [
        { start: '09:00', end: '09:30', tip: 'tip01', percent: 0, width: 0, color: '' },
        { start: '14:00', end: '14:45', tip: 'tip02', percent: 0, width: 0, color: '' },
        { start: '16:30', end: '17:00', tip: 'tip03', percent: 0, width: 0, color: '' }
    ],
    '2025-03-24': [
        { start: '10:00', end: '10:30', tip: 'tip04', percent: 0, width: 0, color: '' },
        { start: '15:00', end: '15:45', tip: 'tip05', percent: 0, width: 0, color: '' }
    ],
    '2025-03-25': [
        { start: '08:00', end: '08:45', tip: 'tip06', percent: 0, width: 0, color: '' },
        { start: '13:00', end: '13:30', tip: '', percent: 0, width: 0, color: '' }
    ]
})

const groupedClips = ref<GroupedClips>({})

/**
 * Calculate the position and width of a video clip on the timeline
 * @param {Object} clip - Video clip object
 * @param {number} totalWidth - Total width of the timeline (milliseconds)
 * @param {number} start - Start time of the timeline (milliseconds)
 * @returns {Object} - Object containing position and width
 */
const getLeftAndWidth = (
    clip: Clip & { date: string }, // Add date property
    totalWidth: number,
    start: number
): { percent: number; width: number } => {
    const clipStart = new Date(`${clip.date}T${clip.start}`).getTime()
    const clipEnd = new Date(`${clip.date}T${clip.end}`).getTime()
    const percent = ((clipStart - start) / totalWidth) * 100
    const width = ((clipEnd - clipStart) / totalWidth) * 100
    return { percent, width }
}

function updateClip(): void {
    // Define a set of colors to assign different colors to each video clip
    const colors = ['#FF5733', '#33FF57', '#5733FF', '#FF33E0', '#33E0FF']
    // Color index for cycling through colors
    let colorIndex = 0

    // Process by grouped timeline mode
    const groupedClipsWithStyles: GroupedClips = {}
    for (const date in allClips.value) {
        groupedClipsWithStyles[date] = allClips.value[date].map((clip) => {
            const { percent, width } = getLeftAndWidth(
                { ...clip, date }, // Add date property
                86400000,
                new Date(`${date}T00:00`).getTime()
            )
            const color = colors[colorIndex % colors.length]
            colorIndex++
            return { ...clip, percent, width, color }
        })
    }
    // Update grouped clip data
    groupedClips.value = groupedClipsWithStyles
}

onMounted(() => {
    updateClip()
})
</script>
<style scoped>
.result-display-container {
    width: 100%;
    height: 100%;
}

.single-timeline {
    position: relative;
    height: 20px;
    background-color: #252526;
    border-top: 1px solid #333;
}

.daily-timelines {
    display: flex;
    flex-direction: column;
}

.daily-timeline {
    height: 20px;
    background-color: #252526;
    margin-bottom: 10px;
    position: relative;
    border-top: 1px solid #333;
}

.date-label {
    position: absolute;
    top: -20px;
    left: 0;
    font-size: 12px;
}
</style>
