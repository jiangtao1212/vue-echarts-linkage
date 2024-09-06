<template>
  <div class='echarts-linkage-container'>
    <div class="main-container">
      <div v-for="item in dataAbout.data" :key="item.id" :id="item.id" class="echarts-container"></div>
    </div>
  </div>
</template>

<script setup lang='ts'>
import { ref, reactive, onMounted, nextTick, computed, watch, onBeforeUnmount } from 'vue';
import 'element-plus/es/components/message/style/css';
import { ElMessage } from 'element-plus';
import * as echarts from "echarts";
import { type EChartsOption, type EChartsType, type LineSeriesOption, type BarSeriesOption } from "echarts";
import { useDebounceFn } from "@vueuse/core";
import { EchartsLinkageModel, type EchartsLinkageModelType, type SeriesOptionType } from "@/models/index";
import type { ExposedMethods, OneDataType, seriesIdDataType, DataAboutType, seriesTagType, dropEchartType } from './types/index';

/**
 * @description 组件props类型
 * @property {number} [cols=1] - 列数
 * @property {number} [echartsMaxCount=7] - Echarts最大数量
 * @property {number} [emptyEchartCount] - 初始化空白echarts数量
 */
export type PropsType = {
  cols?: number;
  echartsMaxCount?: number;
  emptyEchartCount?: number;
}

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

const emit = defineEmits(['drop-echart']);

// 定义数据
const dataAbout = reactive({
  groupName: 'group1', // 组名
  maxEchartsIdSeq: 0, // 最大序号
  data: [] as Array<seriesIdDataType>, // 所有echarts数据
  currentHandleChartId: '', // 当前操作的echart图表id
  restoreClickBool: false, // 监听restore是否触发点击
  isAllUpdate: false, // 是否全部更新
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
const addEchart = async (oneDataType?: OneDataType | OneDataType[]) => {
  const echartsMaxCount = props.echartsMaxCount;
  if (dataAbout.data.length >= echartsMaxCount) {
    ElMessage.warning(`最多只能添加${echartsMaxCount}个echarts！`);
    return;
  }
  dataAbout.maxEchartsIdSeq++;
  const id = 'echart' + dataAbout.maxEchartsIdSeq;
  if (!oneDataType) {
    oneDataType = {
      name: '',
      type: 'line',
      seriesData: [],
    }
    dataAbout.data.push({
      id,
      markLineArray: oneDataType.markLineArray,
      data: [{ name: oneDataType.name, type: oneDataType.type, seriesData: oneDataType.seriesData }],
    });
  } else if (Array.isArray(oneDataType)) {
    const data: OneDataType[] = [];
    oneDataType.forEach((item: OneDataType) => {
      data.push({ name: item.name, type: item.type, seriesData: item.seriesData });
    });
    dataAbout.data.push({
      id,
      markLineArray: oneDataType[0].markLineArray,
      data: data,
    });
  } else {
    if (!oneDataType.seriesData || oneDataType.seriesData.length < 1) {
      oneDataType = {
        name: oneDataType.name,
        type: 'line',
        seriesData: [],
      }
    }
    dataAbout.data.push({
      id,
      markLineArray: oneDataType.markLineArray,
      data: [{ name: oneDataType.name, type: oneDataType.type, seriesData: oneDataType.seriesData }],
    });
  }
  setStyleProperty();
  await nextTick();
  initEcharts();
};

/**
 * @description 根据索引删除echarts
 * @param index 索引
 */
const deleteEchart = async (id: string) => {
  const index = dataAbout.data.findIndex((item: seriesIdDataType) => item.id === id);
  dataAbout.data.splice(index, 1);
  setStyleProperty();
  await nextTick();
  initEcharts();
}

/**
 * @description 新增echarts系列
 * @param id echarts id
 * @param oneDataType 
 */
const addEchartSeries = async (id: string, oneDataType: OneDataType) => {

  // 判断series是否已存在，存在则不新增
  const judgeSeriesExist = (echart: seriesIdDataType, oneData: OneDataType) => {
    let isExist = false;
    isExist = echart.data.some((item: OneDataType) => item.name === oneData.name && JSON.parse(JSON.stringify(item.customData)) === JSON.parse(JSON.stringify(oneData.customData)));
    return isExist;
  }

  if (dataAbout.data.length < 1) {
    ElMessage.warning('请先添加1个echart图表！');
    return;
  }
  dataAbout.currentHandleChartId = id;
  const index = dataAbout.data.findIndex((item: seriesIdDataType) => item.id === id);
  if (judgeSeriesExist(dataAbout.data[index], oneDataType)) {
    ElMessage.warning('该子项已存在，请选择其他子项！');
    return;
  }
  if (dataAbout.data[index].data[0].seriesData.length === 0) { // 空数据，直接赋值
    dataAbout.data[index].data[0] = { name: oneDataType.name, type: oneDataType.type, seriesData: oneDataType.seriesData };
  } else {
    dataAbout.data[index].data.push({ name: oneDataType.name, type: oneDataType.type, seriesData: oneDataType.seriesData });
  }
  await nextTick();
  initEcharts();
}

// 监听，赋值最大的id序号
const getMaxId = () => {
  let max = 0;
  dataAbout.data.forEach((item: seriesIdDataType) => {
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
    // 监听legend图例点击事件
    addChartLegendSelectChangedEvent(myChart);
  }
  // 监听 restore 按钮是否触发点击 ---> 原因：解决点击restore按钮后，只有最后一个图表显示，其他图表不显示的问题
  dataAbout.restoreClickBool && (needHandle = true);
  // 监听是否全部更新操作 --- 原因：解决点击restore按钮后，只有最后一次操作的图表数据更新，其他图表实例没有变化被过滤掉导致数据不更新的问题
  dataAbout.isAllUpdate && (needHandle = true);
  return { myChart, needHandle };
}

// 新增echarts的图例点击监听事件 //todo: 待完善
const addChartLegendSelectChangedEvent = (myChart: EChartsType) => {
  myChart.on('legendselectchanged', function (params: any) {

    const name = params.name; // 图例名称
    const selected = params.selected;
    const names = Object.keys(selected);
    if (names.length > 0 && names.includes(name)) {
      console.log(myChart);
      const id = myChart.id;
      // const connectedCharts = echarts.getMap().get(groupName);
      console.log(params);
      console.log(dataAbout.data);
      dataAbout.data.forEach((echart: seriesIdDataType, index: number) => {
        const isEqual = echart.data.map((series: OneDataType) => series.name).every((item, index) => item === names[index]);
        // if (isEqual) {
        //   const 

        // }
      });
    }
  });
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
  dataArray.data.forEach((item: OneDataType) => {
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

// 初始化空白echarts
const initEmptyEcharts = () => {
  if (!props.emptyEchartCount) return;
  for (let i = 0; i < props.emptyEchartCount; i++) {
    addEchart();
  }
}

// 初始化echarts
const initEcharts = () => {
  // 基于准备好的dom，初始化echarts图表
  const groupName: string = dataAbout.groupName;
  echarts.dispose(groupName);
  dataAbout.data.forEach((item: seriesIdDataType, index: number) => {
    initOneEcharts(item, groupName);
  });
  dataAbout.restoreClickBool = false;
  echarts.connect(groupName);
}

// 拖拽移动事件
const dragoverEchart = (e: DragEvent) => {
  e.preventDefault();
}

// 接收拖拽事件
const dropEchart = (e: DragEvent) => {
  e.preventDefault();
  const id = (e.target as HTMLElement).parentElement!.offsetParent!.id;
  emit('drop-echart', { id } as dropEchartType);
}

// 监听拖拽事件
const initLisener = () => {
  const echartsLinkageContainer: HTMLElement = document.querySelector('.echarts-linkage-container') as HTMLElement;
  echartsLinkageContainer.addEventListener('dragover', dragoverEchart);
  echartsLinkageContainer.addEventListener('drop', dropEchart);
}

// 移除拖动事件监听
const removeLisener = () => {
  const echartsLinkageContainer: HTMLElement = document.querySelector('.echarts-linkage-container') as HTMLElement;
  echartsLinkageContainer.removeEventListener('dragover', dragoverEchart);
  echartsLinkageContainer.removeEventListener('drop', dropEchart);
}

// 获取数据总数 --- 导出
const getDataLength = (): number => {
  return dataAbout.data.length;
}

// 获取所有不重复系列的标签信息 --- 导出
const getAllDistinctSeriesTagInfo = (): Array<seriesTagType> => {
  const res: Array<seriesTagType> = [];
  dataAbout.data.forEach((echart: seriesIdDataType) => {
    echart.data.forEach((series: OneDataType) => {
      series.name && res.push({
        name: series.name,
        customData: series.customData,
        seriesData: [],
      })
    });
  });
  return res;
}

//todo: 待完善，更新单个echarts
const updateOneEchart = (id: string, data: { [key: string]: Array<number[]> }) => {

}

// 传入所有显示子项数据，更新所有echarts
const updateAllEcharts = async (newAllSeriesdata: Array<seriesTagType>) => {
  console.log(newAllSeriesdata);
  dataAbout.data.forEach((echart: seriesIdDataType) => {
    echart.data.forEach((series: OneDataType, index: number) => {
      const newSeriesData = newAllSeriesdata.filter(item => item.name === series.name && JSON.stringify(item.customData) === JSON.stringify(series.customData))[0] && (series.seriesData = newAllSeriesdata.filter(item => item.name === series.name && JSON.stringify(item.customData) === JSON.stringify(series.customData))[0].seriesData);
      newSeriesData && (series.seriesData = newSeriesData);
    });
  });
  dataAbout.isAllUpdate = true; // 标记全部更新
  initEcharts();
  await nextTick();
  dataAbout.isAllUpdate = false; // 标记全部更新完成
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
  getAllDistinctSeriesTagInfo,
  updateAllEcharts,
};
defineExpose(exposedMethods);

// 监听dataAbout.data的变化，重新计算maxEchartsIdSeq
watch(() => dataAbout.data.length, () => {
  getMaxId();
});

onMounted(() => {
  initLisener();
  initEmptyEcharts();
});

onBeforeUnmount(() => {
  removeLisener();
  echarts.dispose(dataAbout.groupName);
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