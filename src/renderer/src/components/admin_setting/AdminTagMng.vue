<template>
    <div class="page-contianer">
        <div class="table-content xc-scrollbar">
            <table class="path-table">
                <thead>
                    <tr>
                        <th class="index-col">序号</th>
                        <th>名称</th>
                        <th>颜色</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="(item, index) in allTags"
                        :key="index"
                        :class="{ selected: selectedTagItem?.name === item.name }"
                        @click="selectTag(item)"
                    >
                        <td class="index-col">{{ index + 1 }}</td>
                        <td>{{ tagNameShowMake(item.name) }}</td>
                        <td>
                            <div
                                :style="{
                                    backgroundColor: item.color,
                                    width: '20px',
                                    height: '20px'
                                }"
                            ></div>
                        </td>
                        <td>
                            <button
                                class="xc-button"
                                style="margin-right: 10px"
                                @click.stop="btn_showEditDialog(item)"
                            >
                                编辑
                            </button>
                            <button class="xc-button" @click="btn_deletetag(item)">删除</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../../stores/AppStore'
const appStore = useAppStore()
import * as DataTypes from '../../../../bridge/dataTypedef'

const allTags = computed(() => {
    return appStore.tags
})
const selectedTagItem = ref<DataTypes.Tag | null>(null)
function selectTag(item: DataTypes.Tag): void {
    selectedTagItem.value = item
}

// 控制编辑弹窗的显示与隐藏
const isEditDialogVisible = ref(false)
// 存储正在编辑的标签
const editingTag = ref<DataTypes.Tag>({ name: '', color: '', id: 0 })
// 显示编辑弹窗
function btn_showEditDialog(item: DataTypes.Tag): void {
    editingTag.value = { ...item }
    isEditDialogVisible.value = true
}
function btn_deletetag(item: DataTypes.Tag): void {
    console.log(item)
    // Utils.tag_delete(item)
}

function tagNameShowMake(tagName: string): string {
    switch (tagName) {
        case 'sys_score1':
            return '1☆'
        case 'sys_score2':
            return '2☆'
        case 'sys_score3':
            return '3☆'
        case 'sys_score4':
            return '4☆'
        case 'sys_score5':
            return '5☆'
        case 'sys_score6':
            return '6☆'
        case 'sys_score7':
            return '7☆'
        case 'sys_score8':
            return '8☆'
        case 'sys_score9':
            return '9☆'
        case 'sys_score10':
            return '10☆'
        default:
            return tagName
    }
}
</script>

<style scoped>
.page-contianer {
    display: flex;
    height: 100%;
    width: 100%;
    padding: 0;
    margin: 0;
}
</style>
