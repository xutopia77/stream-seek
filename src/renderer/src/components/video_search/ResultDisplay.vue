<template>
  <div class="result-display-container">
    <div id="timeline" class="result-display">
      <div v-if="displayOption === 'single'" class="single-timeline">
        <ProgressBar :clips="filteredClips" :height="20" />
        <div
          v-for="(dateLabel, index) in dateLabels"
          :key="index"
          class="date-label"
          :style="{ left: `${dateLabel.left}%` }"
        >
          {{ dateLabel.date }}
        </div>
      </div>
      <div v-else class="daily-timelines">
        <div v-for="(dailyClips, date) in groupedClips" :key="date">
          <span class="common-text" style="background-color: #252526">{{ date }}</span>
          <div class="daily-timeline">
            <ProgressBar :clips="dailyClips" :height="20" />
          </div>
        </div>
      </div>
    </div>
    <!-- <ul id="event-list">
        <li v-for="(clip, index) in filteredClips" :key="index" :style="{ color: clip.color }">
          {{
            displayOption === 'single'
              ? `${clip.date} ${clip.start} - ${clip.end}`
              : `${clip.start} - ${clip.end}`
          }}
        </li>
        <li v-if="filteredClips.length === 0">未找到符合条件的录像片段。</li>
      </ul> -->
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import ProgressBar from './ProgressBar.vue' // 引入新组件
import '../../assets/common.css'

import { useAppStore } from '../../stores/AppStore'
const appStore = useAppStore()

// 定义 Clip 类型
interface Clip {
  date: string
  start: string
  end: string
  tip: string
  left?: number
  width?: number
  color?: string
}

// 定义 DateLabel 类型
interface DateLabel {
  left: number
  date: string
}

// 定义 groupedClips 类型
type GroupedClips = Record<string, Clip[]>

const allClips = ref<Clip[]>([
  { date: '2025-03-23', start: '09:00', end: '09:30', tip: 'tip01' },
  { date: '2025-03-23', start: '14:00', end: '14:45', tip: 'tip02' },
  { date: '2025-03-23', start: '16:30', end: '17:00', tip: 'tip03' },
  { date: '2025-03-24', start: '10:00', end: '10:30', tip: 'tip04' },
  { date: '2025-03-24', start: '15:00', end: '15:45', tip: 'tip05' },
  { date: '2025-03-25', start: '08:00', end: '08:45', tip: 'tip06' },
  { date: '2025-03-25', start: '13:00', end: '13:30', tip: '' }
])

const displayOption = computed<string>(() => {
  return appStore.queryCtrl.displayOption
})

const filteredClips = ref<Clip[]>([])
const groupedClips = ref<GroupedClips>({})
const dateLabels = ref<DateLabel[]>([])

/**
 * 处理查询请求的函数
 * @param {Object} queryData - 查询数据对象，包含开始日期、开始时间、结束日期、结束时间和显示选项
 */
const handleQuery1 = (queryData: {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  displayOption: string
}) => {
  // 根据开始和结束时间过滤所有录像片段
  const filtered = allClips.value

  // 定义一组颜色，用于为每个录像片段分配不同的颜色
  const colors = ['#FF5733', '#33FF57', '#5733FF', '#FF33E0', '#33E0FF']
  // 颜色索引，用于循环选择颜色
  let colorIndex = 0

  /**
   * 计算录像片段在时间轴上的位置和宽度
   * @param {Object} clip - 录像片段对象
   * @param {number} totalWidth - 时间轴的总宽度（毫秒）
   * @param {number} start - 时间轴的起始时间（毫秒）
   * @returns {Object} - 包含位置和宽度的对象
   */
  const getLeftAndWidth = (
    clip: Clip,
    totalWidth: number,
    start: number
  ): { left: number; width: number } => {
    const clipStart = new Date(`${clip.date}T${clip.start}`).getTime()
    const clipEnd = new Date(`${clip.date}T${clip.end}`).getTime()
    const left = ((clipStart - start) / totalWidth) * 100
    const width = ((clipEnd - clipStart) / totalWidth) * 100
    return { left, width }
  }

  // 如果显示选项为 'single'，则按单时间轴模式处理
  if (displayOption.value === 'single') {
    const timeStrStart = '2025-03-23'
    const timeStrEnd = '2025-03-25'
    const startDateTime = new Date(`${timeStrStart}T00:00`)
    const endDateTime = new Date(`${timeStrEnd}T23:59`)
    // 计算单时间轴的总宽度
    const totalWidth = 86400000 * Math.ceil((endDateTime - startDateTime) / 86400000)
    // 用于存储日期标签的对象
    const dateLabelsObj: Record<string, DateLabel> = {}
    // 为过滤后的片段添加样式信息
    const clipsWithStyles = filtered.map((clip) => {
      const { left, width } = getLeftAndWidth(clip, totalWidth, startDateTime.getTime())
      const color = colors[colorIndex % colors.length]
      colorIndex++

      if (!dateLabelsObj[clip.date]) {
        dateLabelsObj[clip.date] = { left, date: clip.date }
      }
      return { ...clip, left, width, color }
    })
    // 更新过滤后的片段数据
    filteredClips.value = clipsWithStyles
    // 更新日期标签数据
    dateLabels.value = Object.values(dateLabelsObj)
  } else {
    // 按分组时间轴模式处理
    const grouped: GroupedClips = {}
    filtered.forEach((clip) => {
      if (!grouped[clip.date]) {
        grouped[clip.date] = []
      }
      grouped[clip.date].push(clip)
    })

    const groupedClipsWithStyles: GroupedClips = {}
    for (const date in grouped) {
      groupedClipsWithStyles[date] = grouped[date].map((clip) => {
        const { left, width } = getLeftAndWidth(clip, 86400000, new Date(`${date}T00:00`).getTime())
        const color = colors[colorIndex % colors.length]
        colorIndex++
        return { ...clip, left, width, color }
      })
    }
    // 更新分组后的片段数据
    groupedClips.value = groupedClipsWithStyles
    // 更新过滤后的片段数据
    filteredClips.value = Object.values(groupedClipsWithStyles).flat()
  }
}

handleQuery1()

/**
 * 处理查询请求的函数
 * @param {Object} queryData - 查询数据对象，包含开始日期、开始时间、结束日期、结束时间和显示选项
 */
const handleQuery = (queryData: {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  displayOption: string
}) => {
  // 从查询数据中解构出开始日期、开始时间、结束日期、结束时间和显示选项
  const { startDate, startTime, endDate, endTime, displayOption: option } = queryData
  // 更新显示选项的值
  // 这里 displayOption 是计算属性，不能直接赋值，需要确保 appStore 里对应属性可修改
  // displayOption.value = option;

  // 创建开始日期和结束日期的 Date 对象
  const startDateTime = new Date(`${startDate}T${startTime}`)
  const endDateTime = new Date(`${endDate}T${endTime}`)

  // 根据开始和结束时间过滤所有录像片段
  const filtered = allClips.value.filter((clip) => {
    const clipStart = new Date(`${clip.date}T${clip.start}`)
    const clipEnd = new Date(`${clip.date}T${clip.end}`)
    return clipStart >= startDateTime && clipEnd <= endDateTime
  })

  // 定义一组颜色，用于为每个录像片段分配不同的颜色
  const colors = ['#FF5733', '#33FF57', '#5733FF', '#FF33E0', '#33E0FF']
  // 颜色索引，用于循环选择颜色
  let colorIndex = 0

  /**
   * 计算录像片段在时间轴上的位置和宽度
   * @param {Object} clip - 录像片段对象
   * @param {number} totalWidth - 时间轴的总宽度（毫秒）
   * @param {number} start - 时间轴的起始时间（毫秒）
   * @returns {Object} - 包含位置和宽度的对象
   */
  const getLeftAndWidth = (
    clip: Clip,
    totalWidth: number,
    start: number
  ): { left: number; width: number } => {
    const clipStart = new Date(`${clip.date}T${clip.start}`).getTime()
    const clipEnd = new Date(`${clip.date}T${clip.end}`).getTime()
    const left = ((clipStart - start) / totalWidth) * 100
    const width = ((clipEnd - clipStart) / totalWidth) * 100
    return { left, width }
  }

  // 如果显示选项为 'single'，则按单时间轴模式处理
  if (displayOption.value === 'single') {
    // 计算单时间轴的总宽度
    const totalWidth = 86400000 * Math.ceil((endDateTime - startDateTime) / 86400000)
    // 用于存储日期标签的对象
    const dateLabelsObj: Record<string, DateLabel> = {}
    // 为过滤后的片段添加样式信息
    const clipsWithStyles = filtered.map((clip) => {
      const { left, width } = getLeftAndWidth(clip, totalWidth, startDateTime.getTime())
      const color = colors[colorIndex % colors.length]
      colorIndex++

      if (!dateLabelsObj[clip.date]) {
        dateLabelsObj[clip.date] = { left, date: clip.date }
      }
      return { ...clip, left, width, color }
    })
    // 更新过滤后的片段数据
    filteredClips.value = clipsWithStyles
    // 更新日期标签数据
    dateLabels.value = Object.values(dateLabelsObj)
  } else {
    // 按分组时间轴模式处理
    const grouped: GroupedClips = {}
    filtered.forEach((clip) => {
      if (!grouped[clip.date]) {
        grouped[clip.date] = []
      }
      grouped[clip.date].push(clip)
    })

    const groupedClipsWithStyles: GroupedClips = {}
    for (const date in grouped) {
      groupedClipsWithStyles[date] = grouped[date].map((clip) => {
        const { left, width } = getLeftAndWidth(clip, 86400000, new Date(`${date}T00:00`).getTime())
        const color = colors[colorIndex % colors.length]
        colorIndex++
        return { ...clip, left, width, color }
      })
    }
    // 更新分组后的片段数据
    groupedClips.value = groupedClipsWithStyles
    // 更新过滤后的片段数据
    filteredClips.value = Object.values(groupedClipsWithStyles).flat()
  }
}
</script>

<style scoped>
.result-display-container {
  width: 100%;
  height: 100%;
}

/* #timeline {
    height: 50px;
    background-color: #252526;
    margin-bottom: 20px;
    position: relative;
    width: 100%;
  } */

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
