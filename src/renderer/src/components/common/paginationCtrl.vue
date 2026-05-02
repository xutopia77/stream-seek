<template>
    <!-- 分页控制区域 -->
    <div class="pagination-controls">
        <div class="pagination-info">
            <div>
                <span class="xc-text">
                    {{
                        t('pagination.pageInfo', {
                            current: currentPage,
                            total: totalPages,
                            count: totalNum
                        })
                    }}
                </span>
            </div>
            <div class="multi-select-dropdown">
                <div class="dropdown-header" @click="toggleDropdown">
                    <span class="selected-text">{{ getSelectedLevelsText() }}</span>
                    <span class="dropdown-arrow">▼</span>
                </div>
                <div v-show="isDropdownOpen" class="dropdown-content">
                    <div class="select-all-container">
                        <label class="checkbox-label">
                            <input
                                type="checkbox"
                                :checked="selectedLevels.length === 5"
                                @change="toggleSelectAll"
                            />
                            {{ t('pagination.selectAll') }}
                        </label>
                    </div>
                    <div v-for="index in 5" :key="index" class="level-option">
                        <label class="checkbox-label">
                            <input
                                v-model="selectedLevels"
                                type="checkbox"
                                :value="index - 1"
                                @change="handleLevelChange"
                            />
                            {{ index }}☆
                        </label>
                    </div>
                </div>
            </div>
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
                <span class="xc-text">{{ t('pagination.jumpTo') }}</span>
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
            <span class="xc-text">{{ t('pagination.itemsPerPage') }}</span>
            <div class="page-size-selector">
                <select v-model="pageSize" class="size-select" @change="handlePageSizeChange">
                    <option :value="10">10</option>
                    <option :value="50">50</option>
                    <option :value="100">100</option>
                    <option :value="200">200</option>
                    <option :value="500">500</option>
                    <option :value="1000">1000</option>
                </select>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@renderer/stores/AppStore'
import { useI18n } from 'vue-i18n'
const appStore = useAppStore()
import '@renderer/assets/common.css'
import * as Dty from '../../../../bridge/dataTypedef'
import util from '@renderer/utils/util'

const { t } = useI18n()

const props = defineProps({
    pageType: {
        type: String,
        default: 'video',
        validator: (value: string) => ['video', 'thumb'].includes(value)
    }
})

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

const totalPages = computed(() => {
    let total = appStore.videoTotalNum
    if (props.pageType === 'thumb') {
        total = appStore.thumbTotalNum
    }
    if (total == 0) return 0
    return Math.ceil(total / appStore.fileSearchPageSize)
})

const totalNum = computed(() => {
    return props.pageType === 'thumb' ? appStore.thumbTotalNum : appStore.videoTotalNum
})
const jumpPageNum = ref(1) // 用于跳转的页码输入

const selectedLevels = ref<number[]>([]) // 默认不选择任何级别
const isDropdownOpen = ref(false) // 控制下拉框是否打开

// 切换下拉框显示状态
const toggleDropdown = (): void => {
    isDropdownOpen.value = !isDropdownOpen.value
}

// 获取选中级别的显示文本
const getSelectedLevelsText = (): string => {
    if (selectedLevels.value.length === 0) {
        return t('pagination.noLevelSelected')
    } else if (selectedLevels.value.length === 5) {
        return t('pagination.allLevels')
    } else {
        return selectedLevels.value.map((level) => `${level + 1}☆`).join(', ')
    }
}

// 全选/取消全选
const toggleSelectAll = (): void => {
    if (selectedLevels.value.length === 5) {
        selectedLevels.value = []
    } else {
        selectedLevels.value = [0, 1, 2, 3, 4]
    }
    handleLevelChange()
}

// 处理级别选择变化
const handleLevelChange = (): void => {
    handleSearch()
}

// 点击外部关闭下拉框
const handleClickOutside = (event: Event): void => {
    const target = event.target as Element
    if (!target.closest('.multi-select-dropdown')) {
        isDropdownOpen.value = false
    }
}

// 添加和移除全局点击事件监听
onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})

// 搜索处理函数
const handleSearch = (): void => {
    if (props.pageType === 'thumb') {
        let searchReq = new Dty.FilesReq()
        searchReq.status.push(Dty.Fstatus.Destroy)
        for (const lvl of selectedLevels.value) {
            searchReq.tags.push(`sys_score${lvl + 1}`)
        }
        util.thumbsGet(searchReq)
    } else {
        let searchReq = new Dty.FilesReq()
        const fStatus =
            appStore.prj?.repoType == Dty.RepoType.Normal ? Dty.Fstatus.Normal : Dty.Fstatus.Deleted
        searchReq.status.push(fStatus)
        for (const lvl of selectedLevels.value) {
            searchReq.tags.push(`sys_score${lvl + 1}`)
        }
        util.files_get(searchReq)
    }
}

// 页面大小改变处理
const handlePageSizeChange = (): void => {
    handleSearch()
    currentPage.value = 1 // 每页大小变化时回到第一页
}

// 跳转到指定页
const goToPage = (pageNum: number): void => {
    if (pageNum < 1 || pageNum > totalPages.value) return

    currentPage.value = pageNum
    handleSearch()
}

// 跳转到输入的页码
const jumpToPage = (): void => {
    if (jumpPageNum.value < 1) {
        jumpPageNum.value = 1
    } else if (jumpPageNum.value > totalPages.value) {
        jumpPageNum.value = totalPages.value
    }
    currentPage.value = jumpPageNum.value
    handleSearch()
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

/* 多选下拉框样式 */
.multi-select-dropdown {
    position: relative;
    min-width: 120px;
}

.dropdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    background-color: #2d2d30;
    border: 1px solid #3c3c41;
    border-radius: 3px;
    color: var(--xc-text-color);
    cursor: pointer;
    user-select: none;
}

.dropdown-header:hover {
    border-color: #007fd4;
}

.selected-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100px;
    font-size: small;
}

.dropdown-arrow {
    font-size: 10px;
    margin-left: 5px;
}

.dropdown-content {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background-color: #2d2d30;
    border: 1px solid #3c3c41;
    border-radius: 3px;
    z-index: 10;
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 2px;
}

.select-all-container {
    /* padding: 6px 8px; */
    padding: 0px;
    font-size: small;
    border-bottom: 1px solid #3c3c41;
}

.level-option {
    /* padding: 4px 8px; */
    padding: 0px;
}

.level-option:hover {
    background-color: #3c3c41;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--xc-text-color);
    cursor: pointer;
    /* font-size: 12px; */
    font-size: small;
    width: 100%;
}

.checkbox-label input[type='checkbox'] {
    accent-color: #007fd4;
}
</style>
