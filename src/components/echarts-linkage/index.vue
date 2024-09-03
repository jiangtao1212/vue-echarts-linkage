<template>
  <div class='echarts-linkage-container'>
    <div class="main-container">
      <div v-for="item in dataAbout.data" :key="item.id" :id="item.id" class="echarts-container"></div>
    </div>
  </div>
</template>

<script setup lang='ts'>
import { ref, reactive, onMounted, nextTick, computed, watch } from 'vue';
import 'element-plus/es/components/message/style/css';
import { ElMessage } from 'element-plus';
import * as echarts from "echarts";
import { type EChartsOption, type EChartsType, type LineSeriesOption, type BarSeriesOption } from "echarts";
import { useDebounceFn } from "@vueuse/core";
import { EchartsLinkageModel, type EchartsLinkageModelType, type SeriesOptionType } from "@/models/index";
import type { ExposedMethods, OneDataType, seriesIdDataType, DataAboutType } from 'echartsLinkageType';
import type { PropsType } from './types/index';

// 定义 props
const props = withDefaults(defineProps<PropsType>(), {
  cols: 1,
  echartsMaxCount: 7,
});

// 自定义验证函数
const validateCols = (value: number) => {
  if (value <= 0 || !Number.isInteger(value)) {
    throw new Error('cols 必须是一个正整数');
  }
  return true;
};

// 验证 props
validateCols(props.cols);

// 定义数据
const dataAbout = reactive({
  groupName: 'group1', // 组名
  maxEchartsIdSeq: 0, // 最大序号
  data: [] as Array<seriesIdDataType>, // 所有echarts数据
  currentHandleChartId: '', // 当前操作的echart图表id
  restoreClickBool: false, // 监听restore是否触发点击
}) as DataAboutType;

/**
 * @description 获取 EchartsLinkageModel 类实例
 * @param data 系列数据
 * @returns EchartsLinkageModel 实例
 */
const getEchartsLikageModel = (data: SeriesOptionType[]) => {
  const echartsLinkageModel = new EchartsLinkageModel({
    seriesOptionArray: data,
    segment: 50,
    minMarkLine: 1,
    maxMarkLine: 5,
  } as EchartsLinkageModelType);
  return echartsLinkageModel;
}

/**
 * @description 设置样式属性, 样式变量
 * 样式变量 --count: echarts图表数量
 * 样式变量 --rows: echarts图表行数
 * 样式变量 --item-width: echarts图表宽度
 */
const setStyleProperty = () => {
  const cols = props.cols; // 列数, 控制每行的图表数量,默认为1列
  const element = document.querySelector('.main-container') as HTMLElement;
  const count = dataAbout.data.length;
  const rows = Math.ceil(count / cols);
  element.style.setProperty('--count', count.toString());
  element.style.setProperty('--rows', rows.toString());
  const gap = 10;
  if (cols === 1) { // 单列，宽度为100%
    element.style.setProperty('--item-width', '100%');
  } else { // 多列---大于1列
    if (count === 1) { // 只有1个图表，宽度为100%
      element.style.setProperty('--item-width', '100%');
    } else { // 多于1个图表
      const currentCount = count < cols ? count : cols;
      element.style.setProperty('--item-width', `calc((100% - ${gap} * ${currentCount - 1} * 1px) / ${currentCount})`);
    }
  }
}

/**
 * @description 新增echart, id最大序号自增操作 --- 导出
 */
const addEchart = async (oneDataType: OneDataType) => {
  const echartsMaxCount = props.echartsMaxCount;
  if (dataAbout.data.length >= echartsMaxCount) {
    ElMessage.warning(`最多只能添加${echartsMaxCount}个echarts！`);
    return;
  }
  dataAbout.maxEchartsIdSeq++;
  const id = 'echart' + dataAbout.maxEchartsIdSeq;
  dataAbout.data.push(
    {
      id,
      markLineArray: oneDataType.markLineArray,
      data: [{ name: oneDataType.name, type: oneDataType.type, seriesData: oneDataType.seriesData }],
    });
  setStyleProperty();
  await nextTick();
  initEcharts();
};

/**
 * @description 根据索引删除echarts
 * @param index 索引
 */
const deleteEchart = async (id: string) => {
  const index = dataAbout.data.findIndex((item) => item.id === id);
  dataAbout.data.splice(index, 1);
  setStyleProperty();
  await nextTick();
  initEcharts();
}

/**
 * @description 新增echarts系列
 * @param id echarts id
 * @param seriesOption 
 */
const addEchartSeries = async (id: string, oneDataType: OneDataType) => {
  if (dataAbout.data.length < 1) {
    ElMessage.warning('请先添加1个echart图表！');
    return;
  }
  dataAbout.currentHandleChartId = id;
  const index = dataAbout.data.findIndex((item) => item.id === id);
  dataAbout.data[index].data.push({ name: oneDataType.name, type: oneDataType.type, seriesData: oneDataType.seriesData });
  await nextTick();
  initEcharts();
}

// 监听，赋值最大的id序号
const getMaxId = () => {
  let max = 0;
  dataAbout.data.forEach((item) => {
    const id = parseInt(item.id.substring(6));
    max = id > max ? id : max;
  });
  dataAbout.maxEchartsIdSeq = max;
};

/**
 * @description 判断当前echart实例是否存在，并且当前实例不在操作，则返回实例和是否需要操作
 * @param id echarts id
 * @returns {myChart: EChartsType, needHandle: boolean}
 */
const judgeEchartInstance = (id: string) => {
  const element: HTMLElement = document.getElementById(id) as HTMLElement;
  let myChart: EChartsType = echarts.getInstanceByDom(element) as EChartsType;
  let needHandle = false;
  if (myChart) { // 实例存在
    needHandle = dataAbout.currentHandleChartId === id ? true : false; // 判断当前实例是否在操作
  } else { // 实例不存在
    needHandle = true;
    myChart = echarts.init(element);
    // 监听 restore 事件
    myChart.on('restore', () => {
      Promise.resolve().then(() => debouncedFn());
    });
  }
  if (dataAbout.restoreClickBool) { // 监听 restore 按钮是否触发点击
    needHandle = true;
  }
  return { myChart, needHandle };
}

// 监听 restore 事件，使用防抖函数
const debouncedFn = useDebounceFn(() => {
  console.log('restore');
  dataAbout.restoreClickBool = true;
  initEcharts();
}, 500);

/**
 * @description 初始化单个echarts
 * @param dataArray 数据数组
 * @param groupName 组名
 * @returns EChartsType
 */
const initOneEcharts = (dataArray: seriesIdDataType, groupName: string) => {
  const { myChart, needHandle } = judgeEchartInstance(dataArray.id);
  if (!needHandle) { // 不需要操作
    myChart.resize();
    return myChart;
  }
  const seriesData: SeriesOptionType[] = [];
  dataArray.data.forEach((item) => {
    seriesData.push({
      type: item.type,
      name: item.name,
      seriesData: item.seriesData,
    });
  });
  const echartsLinkageModel = getEchartsLikageModel(seriesData);
  // 添加自定义标记线
  dataArray.markLineArray && echartsLinkageModel.addCustomSeriesMarkLine(dataArray.markLineArray);
  console.log(dataArray.data);
  const option: EChartsOption = echartsLinkageModel.setToolBoxClickEvent((e: any) => deleteEchart(dataArray.id)).setCustomSeriesMarkLine().getResultOption();
  myChart.setOption(option);
  myChart.group = groupName;
  myChart.resize();
  return myChart;
}

// 初始化echarts
const initEcharts = () => {
  // 基于准备好的dom，初始化echarts图表
  const groupName: string = dataAbout.groupName;
  echarts.dispose(groupName);
  dataAbout.data.forEach((item, index) => {
    initOneEcharts(item, groupName);
  });
  dataAbout.restoreClickBool = false;
  echarts.connect(groupName);
}

// 获取数据总数 --- 导出
const getDataLength = () => {
  return dataAbout.data.length;
}

// 获取最大的id序号 --- 导出
const getMaxEchartsIdSeq = () => {
  return dataAbout.maxEchartsIdSeq;
}

// 子组件暴露变量和方法
const exposedMethods: ExposedMethods = {
  addEchart,
  addEchartSeries,
  deleteEchart,
  getDataLength,
  getMaxEchartsIdSeq,
};
defineExpose(exposedMethods);

// 监听dataAbout.data的变化，重新计算maxEchartsIdSeq
watch(() => dataAbout.data.length, () => {
  getMaxId();
});

onMounted(() => {
  initEcharts();
});

</script>
<style scoped lang='less'>
@import '@/assets/styles/mixin.less';

.echarts-linkage-container {
  min-height: 80vh;
  max-height: 100vh;
  height: 100%;
  width: 100%;
  overflow: auto;
  padding: 10px 0;

  .main-container {
    height: 100%;
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: var(--gap);
    --gap: 10px;
    --count: 0;
    --rows: 0;
    --item-width: 100%;

    .echarts-container {
      height: calc((100% - var(--gap) * (var(--rows) - 1)) / var(--rows));
      width: var(--item-width);
      border: 1px solid #ccc;
      border-radius: 10px;
    }
  }
}

/* 隐藏滚动条 */
::-webkit-scrollbar {
  display: none;
}

/* 确保内容可滚动 */
.scrollable {
  overflow-y: scroll;
  /* 对于垂直滚动 */
}
</style>