<template>
    <div>
        <form id="query-form">
            <label for="start-date">开始:</label>
            <input id="start-date" v-model="startDate" type="date" value="2025-03-23" />
            <input id="start-time" v-model="startTime" type="time" value="00:00" />
            <label for="end-date">结束:</label>
            <input id="end-date" v-model="endDate" type="date" value="2025-03-25" />
            <input id="end-time" v-model="endTime" type="time" value="23:59" />
            <button class="xc-button" type="button" @click="handleQuery">查询</button>
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
            <label for="single-bar">整体展示</label>
            <input
                id="daily-bars"
                v-model="displayOption"
                type="radio"
                name="display"
                value="daily"
            />
            <label for="daily-bars">按天展示</label>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { IpcApi } from '../../utils/IpcApi'
import { useAppStore } from '../../stores/AppStore'
import MessageShow from '../util/MessageShow'
import * as DataTypes from '../../../../bridge/dataTypedef'
const appStore = useAppStore()

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
    const req: DataTypes.Req<DataTypes.Req_TraversalFolder> = {
        cmd: 'query_video',
        data: {
            type: 'search',
            startTime: `${startDate.value} ${startTime.value}`,
            endTime: `${endDate.value} ${endTime.value}`
        }
    }
    const response: DataTypes.Resp<DataTypes.TraversalFolder> = await IpcApi.trigger_event(req)
    if (response.code != 0) {
        console.log(response)
        MessageShow.error(`查询失败:${response.status}`)
    } else {
        if (response.bOver == false) {
            MessageShow.info(`后台执行中...`)
        } else {
            MessageShow.success(`查询成功`)
        }
    }
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
