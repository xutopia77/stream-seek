<template>
  <div v-for="(dailyClips, date) in groupedClips" :key="date">
    <span class="common-text" style="background-color: #252526">{{ date }}</span>
    <div class="daily-timeline">
      <ProgressBar :clips="dailyClips" :height="20" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ProgressBar from './ProgressBar.vue'
import '@renderer/assets/common.css'

// 定义 Clip 类型
interface Clip {
  start: string
  end: string
  tip: string
  percent: number
  width: number
  color: string
}

type GroupedClips = Record<string, Clip[]>

// 修改为分组后的数据结构
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
 * 计算录像片段在时间轴上的位置和宽度
 * @param {Object} clip - 录像片段对象
 * @param {number} totalWidth - 时间轴的总宽度（毫秒）
 * @param {number} start - 时间轴的起始时间（毫秒）
 * @returns {Object} - 包含位置和宽度的对象
 */
const getLeftAndWidth = (
  clip: Clip & { date: string }, // 添加 date 属性
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
  // 定义一组颜色，用于为每个录像片段分配不同的颜色
  const colors = ['#FF5733', '#33FF57', '#5733FF', '#FF33E0', '#33E0FF']
  // 颜色索引，用于循环选择颜色
  let colorIndex = 0

  // 按分组时间轴模式处理
  const groupedClipsWithStyles: GroupedClips = {}
  for (const date in allClips.value) {
    groupedClipsWithStyles[date] = allClips.value[date].map((clip) => {
      const { percent, width } = getLeftAndWidth(
        { ...clip, date }, // 添加 date 属性
        86400000,
        new Date(`${date}T00:00`).getTime()
      )
      const color = colors[colorIndex % colors.length]
      colorIndex++
      return { ...clip, percent, width, color }
    })
  }
  // 更新分组后的片段数据
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
