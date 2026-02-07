<template>
    <!-- 分页控制区域 -->
    <div class="pagination-controls">
        <div class="pagination-info">
            <span class="xc-text">
                第 {{ currentPage }} 页 / 共 {{ totalPages }} 页 (共 {{ totalNum }} 条)
            </span>
        </div>

        <div class="pagination-nav">
            <button
                :disabled="currentPage <= 1"
                class="xc-button small"
                @click="goToPage(currentPage - 1)"
            >
                ◀
            </button>

            <div class="page-jump">
                <span class="xc-text">跳转</span>
                <input
                    v-model.number="jumpPageNum"
                    type="number"
                    class="page-input"
                    :min="1"
                    :max="totalPages"
                    @keyup.enter="jumpToPage"
                />
            </div>

            <button
                :disabled="currentPage >= totalPages"
                class="xc-button small"
                @click="goToPage(currentPage + 1)"
            >
                ▶
            </button>
            <span class="xc-text">每页</span>
            <div class="page-size-selector">
                <select v-model="pageSize" class="size-select" @change="handlePageSizeChange">
                    <option :value="10">10</option>
                    <option :value="20">20</option>
                    <option :value="50">50</option>
                    <option :value="100">100</option>
                </select>
            </div>
            <span class="xc-text"> 条</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '@renderer/stores/AppStore'
const appStore = useAppStore()
import '@renderer/assets/common.css'
import * as DataTypes from '../../../../bridge/dataTypedef'
import util from '@renderer/utils/util'

// 分页相关
const currentPage = computed({
    get: () => appStore.fileSearchPage,
    set: (value: number) => {
        appStore.fileSearchPage = value
    }
})

const pageSize = computed({
    get: () => appStore.fileSearchPageSize,
    set: (value: number) => {
        appStore.fileSearchPageSize = value
    }
})

// todo
const totalPages = computed(() => appStore.videoTotalNum / appStore.fileSearchPageSize)
const totalNum = computed(() => appStore.videoTotalNum)
const jumpPageNum = ref(1) // 用于跳转的页码输入

// 搜索处理函数
const handleSearch = (): void => {
    util.files_get(null)
    // 搜索后重置到第一页
    currentPage.value = 1
}

// 页面大小改变处理
const handlePageSizeChange = (): void => {
    currentPage.value = 1 // 每页大小变化时回到第一页
}

// 跳转到指定页
const goToPage = (pageNum: number): void => {
    if (pageNum < 1 || pageNum > totalPages.value) return

    currentPage.value = pageNum
}

// 跳转到输入的页码
const jumpToPage = (): void => {
    if (jumpPageNum.value < 1) {
        jumpPageNum.value = 1
    } else if (jumpPageNum.value > totalPages.value) {
        jumpPageNum.value = totalPages.value
    }

    currentPage.value = jumpPageNum.value
}
</script>

<style scoped>
/* 分页控制区域样式 */
.pagination-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px;
    background-color: var(--xc-background-color);
    border-top: 1px solid #333;
    flex-wrap: wrap;
    gap: 2px;
}

.pagination-info {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-width: 150px;
}

.pagination-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 2;
    min-width: 200px;
}

.page-input {
    width: 60px;
    padding: 4px 8px;
    background-color: #2d2d30;
    border: 1px solid #3c3c41;
    border-radius: 3px;
    color: var(--xc-text-color);
    text-align: center;
    outline: none;
}

/* 隐藏数字输入框的上下箭头 */
.page-input::-webkit-outer-spin-button,
.page-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.page-input:focus {
    border-color: #007fd4;
}

.page-size-selector {
    text-align: right;
}

.size-select {
    padding: 4px 8px;
    background-color: #2d2d30;
    border: 1px solid #3c3c41;
    border-radius: 3px;
    color: var(--xc-text-color);
    outline: none;
}

.size-select:focus {
    border-color: #007fd4;
}
</style>
