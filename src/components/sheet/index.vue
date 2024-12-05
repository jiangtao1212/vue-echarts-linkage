<template>
  <div class='sheet-container'>
    <div ref="tableRef" class="table-container">
      <table class="border-collapse table-auto w-full" border="1">
        <thead>
          <tr>
            <th v-for="col in headComputed">
              <el-input v-model="col.label"></el-input>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in bodyComputed" :key="idx">
            <td v-for="(col, idx) in headComputed" :key="idx">{{ row[col.prop] }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex justify-end items-center">
      <button @click="exportFile">导出</button>
    </div>
  </div>
</template>

<script setup lang='ts'>
import { ref, reactive, onMounted, computed } from 'vue';
import { read, utils, writeFileXLSX } from 'xlsx';
import { type SheetHeadType } from './type/index';

const tableRef = ref(null);
const html = ref("");

const props = defineProps({
  head: {
    type: Array<SheetHeadType>,
    default: () => [],
  },
  body: {
    type: Array,
    default: () => [],
  },
});

const dataAbout = reactive({
  head: [] as SheetHeadType[],
  body: [] as any[],
});

const exportFile = () => {
  const ws = utils.json_to_sheet(bodyComputed.value);
  // 替换第一行的数据
  if (ws['!ref']) { // 确保工作表有有效的范围
    const range = utils.decode_range(ws['!ref']); // 获取当前范围
    const firstRow = range.s.r; // 第一行的索引

    // 假设我们想要替换第一行的所有值
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = utils.encode_cell({r: firstRow, c: col});
      ws[cellAddress] = { v: `${headComputed.value[col].label}`, t: 's' }; // 使用 `替换值` + 列索引作为示例
    }
  }
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");
  writeFileXLSX(wb, "SheetData.xlsx");
}

// 表头数据监听
const headComputed = computed((): SheetHeadType[] => {
  return props.head;
});

// 表格数据监听
const bodyComputed = computed((): any[] => {
  return props.body;
});

// 初始化页面
const initPage = () => {
  dataAbout.head = props.head;
  dataAbout.body = props.body;
}

onMounted(() => {
  initPage();
});
</script>
<style scoped lang="less">
.sheet-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;

  .table-container {
    max-height: 50vh;
    overflow: auto;
    padding-bottom: 5px;
  }
}
</style>