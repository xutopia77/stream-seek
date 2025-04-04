<template>
  <div class="result-display-container">
    <div id="timeline" class="result-display">
      <div v-if="displayOption === 'single'">
        <ResultDisplaySingle />
      </div>
      <div v-else>
        <ResultDisplayTimeline />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import '../../assets/common.css'

import { useAppStore } from '../../stores/AppStore'
import ResultDisplayTimeline from './ResultDisplayTimeline.vue'
import ResultDisplaySingle from './ResultDisplaySingle.vue'
const appStore = useAppStore()

const displayOption = computed<string>(() => {
  return appStore.queryCtrl.displayOption
})
</script>

<style scoped>
.result-display-container {
  width: 100%;
  height: 100%;
}
</style>
