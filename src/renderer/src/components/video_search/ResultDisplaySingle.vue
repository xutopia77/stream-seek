<template>
    <div class="single-timeline">
        <ProgressBar :clips="filteredClips" :height="20" />
        <div
            v-for="(dateLabel, index) in dateLabels"
            :key="index"
            class="date-label"
            :style="{ left: `${dateLabel.percent}%` }"
        >
            {{ dateLabel.date }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
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

// Define DateLabel type
interface DateLabel {
    percent: number
    date: string
}

type GroupedClips = Record<string, Clip[]>

const filteredClips = ref<Clip[]>([])
const dateLabels = ref<DateLabel[]>([])

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
    // Merge all grouped video clips and add date information
    const allClipsArray = Object.entries(allClips.value).flatMap(([date, clips]) => {
        return clips.map((clip) => ({ ...clip, date }))
    })
    // Filter all video clips by start and end time
    const filtered = allClipsArray

    // Define a set of colors to assign different colors to each video clip
    const colors = ['#FF5733', '#33FF57', '#5733FF', '#FF33E0', '#33E0FF']
    // Color index for cycling through colors
    let colorIndex = 0

    const timeStrStart = '2025-03-23'
    const timeStrEnd = '2025-03-25'
    const startDateTime = new Date(`${timeStrStart}T00:00`)
    const endDateTime = new Date(`${timeStrEnd}T23:59`)
    // Calculate total width of single timeline
    const totalWidth =
        86400000 * Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / 86400000)
    // Object to store date labels
    const dateLabelsObj: Record<string, DateLabel> = {}
    // Add style information to filtered clips
    const clipsWithStyles = filtered.map((clip) => {
        const { percent, width } = getLeftAndWidth(clip, totalWidth, startDateTime.getTime())
        const color = colors[colorIndex % colors.length]
        colorIndex++

        if (!dateLabelsObj[clip.date]) {
            dateLabelsObj[clip.date] = { percent, date: clip.date }
        }
        return { ...clip, percent, width, color }
    })
    filteredClips.value = clipsWithStyles // Update filtered clip data
    dateLabels.value = Object.values(dateLabelsObj) // Update date label data
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
