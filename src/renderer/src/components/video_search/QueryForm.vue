<template>
    <div>
        <form id="query-form">
            <label for="start-date">{{ t('queryForm.start') }}:</label>
            <input id="start-date" v-model="startDate" type="date" value="2025-03-23" />
            <input id="start-time" v-model="startTime" type="time" value="00:00" />
            <label for="end-date">{{ t('queryForm.end') }}:</label>
            <input id="end-date" v-model="endDate" type="date" value="2025-03-25" />
            <input id="end-time" v-model="endTime" type="time" value="23:59" />
            <button class="xc-button" type="button" @click="handleQuery">{{ t('queryForm.query') }}</button>
        </form>
        <div id="display-option">
            <input
                id="single-bar"
                v-model="displayOption"
                type="radio"
                name="display"
                value="single"
                checked
            />
            <label for="single-bar">{{ t('queryForm.overallDisplay') }}</label>
            <input
                id="daily-bars"
                v-model="displayOption"
                type="radio"
                name="display"
                value="daily"
            />
            <label for="daily-bars">{{ t('queryForm.dailyDisplay') }}</label>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
// import { IpcApi } from '../../utils/ipcApi'
import { useAppStore } from '../../stores/AppStore'
// import * as Dty from '../../../../bridge/dataTypedef'
const appStore = useAppStore()
const { t } = useI18n()

// 明确 ref 变量的类型
const startDate = ref<string>('2025-03-23')
const startTime = ref<string>('00:00')
const endDate = ref<string>('2025-03-25')
const endTime = ref<string>('23:59')

const displayOption = computed<string>({
    get() {
        return appStore.queryCtrl.displayOption
    },
    set(newValue) {
        // Check if newValue is either "single" or "daily"
        if (newValue === 'single' || newValue === 'daily') {
            appStore.queryCtrl.displayOption = newValue
        } else {
            console.error(`Invalid value for displayOption: ${newValue}`)
        }
    }
})

// 定义 handleQuery 函数的返回值类型
const handleQuery = async (): Promise<void> => {
}
</script>

<style scoped>
#query-form {
    margin-bottom: 20px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
}

#query-form label {
    margin-right: 5px;
}

#query-form input {
    margin-right: 10px;
    background-color: #252526;
    color: #d4d4d4;
    border: 1px solid #333333;
    border-radius: 3px;
    padding: 5px;
}

#display-option {
    margin-bottom: 10px;
}
</style>