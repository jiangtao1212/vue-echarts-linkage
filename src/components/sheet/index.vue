<template>
  <div class='sheet-container'>
    <div ref="tableRef" class="table-container" :data-body="bodyComputed" v-infinite-scroll="loadMore" :infinite-scroll-disabled="scrollDisabled">
      <table class="border-collapse table-auto w-full" border="1">
        <thead>
          <tr>
            <th v-for="col in headComputed">
              <el-input v-model="col.label"></el-input>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in dataAbout.showBody" :key="idx">
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
import infiniteScroll from 'vue3-infinite-scroll-better';

// 注册指令
defineOptions({
  directives: {
    infiniteScroll,
  },
});

const tableRef = ref(null); // 表格元素
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

// 数据相关
const dataAbout = reactive({
  head: [] as SheetHeadType[],
  body: [] as any[],
  showBody: [] as any[],
});

// 加载更多数据
const loadMore = () => {
  const addNum = 50; // 每次加载的行数
  const start = dataAbout.showBody.length;
  dataAbout.showBody.push(...dataAbout.body.slice(start, start + addNum)); // 补充数据
}

// 导出excel文件
const exportFile = () => {
  // 这个需要根据head中的顺序来对body中的对象数据属性进行排序，避免在后续转换为excel时出现顺序问题
  let data: any[] = [];
  dataAbout.body.forEach((item) => {
    let obj: any = {};
    dataAbout.head.forEach((head) => { obj[head.prop] = item[head.prop]; });
    data.push(obj);
  });
  const ws = utils.json_to_sheet(data);
  // 替换第一行的数据
  if (ws['!ref']) { // 确保工作表有有效的范围
    const range = utils.decode_range(ws['!ref']); // 获取当前范围
    const firstRow = range.s.r; // 第一行的索引
    // 假设我们想要替换第一行的所有值
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = utils.encode_cell({ r: firstRow, c: col });
      ws[cellAddress] = { v: `${headComputed.value[col].label}`, t: 's' }; // 使用 `替换值` + 列索引作为示例
    }
  }
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");
  writeFileXLSX(wb, "SheetData.xlsx");
}

// 监听滚动条是否到底部
const scrollDisabled = computed(() => {
  return dataAbout.showBody.length >= dataAbout.body.length;
});

// 表头数据监听
const headComputed = computed((): SheetHeadType[] => {
  dataAbout.head = props.head;
  return props.head;
});

// 表格数据监听
const bodyComputed = computed((): any[] => {
  dataAbout.body = props.body;
  dataAbout.showBody = props.body.slice(0, 50); // 限制显示的行数
  return props.body;
});

// 初始化页面
const initPage = () => {
  console.log("initPage--------------");
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