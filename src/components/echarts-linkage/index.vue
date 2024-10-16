<template>
  <div class='echarts-linkage-container'>
    <div class="main-container">
      <div v-for="(item, index) in dataAbout.data" :key="item.id + '-' + index" class="echarts-container"
        :style="{ 'background-color': computedBackgroundColor(item), '--drag-top': dataAbout.drag.top + 'px' }">
        <div :id="item.id" class="h-100% w-100%"></div>
        <Drag v-if="useMergedLegend" :data="dragDataComputed(index)" :colors="echartsColors" :id="item.id"
          :group="item.id" :theme="item.theme" :item-font-size="dataAbout.drag.fontSize"
          @is-dragging="(isDragging) => dataAbout.drag.isDragging = isDragging" @update="(data) => update(data, index)"
          @delete-item="(data, number) => deleteItem(data, number, index)"
          @delete-item-column="(data, numbers) => deleteItemColumn(data, numbers, index)"
          @delete-items-all="deleteItemsAll(index)" />
      </div>
    </div>
  </div>
</template>

<script setup lang='ts'>
import { ref, reactive, onMounted, nextTick, computed, watch, onBeforeUnmount } from 'vue';
import 'element-plus/es/components/message/style/css';
import { ElMessage } from 'element-plus';
import * as echarts from "echarts";
import { type EChartsOption, type EChartsType, type LineSeriesOption, type BarSeriesOption } from "echarts";
import { useDebounceFn, useThrottleFn } from "@vueuse/core";
import { EchartsLinkageModel, type EchartsLinkageModelType, type SeriesOptionType } from "@/models/index";
import { XAXIS_ID, THEME } from "@/models/echarts-linkage-model/staticTemplates"
import { FileUtil } from "@/utils/index";
import type { ExposedMethods, OneDataType, SeriesIdDataType, DataAboutType, SeriesTagType, DropEchartType, GraphicLocationInfoType, ListenerGrapicLocationType, VisualMapSeriesType } from './types/index';
import Drag from "@/components/drag/index.vue";
import { type DragItemDataProps } from "@/components/drag/type/index";

/**
 * @description 组件props类型
 * @property {number} [cols=1] - 列数
 * @property {number} [echartsMaxCount=7] - Echarts最大数量
 * @property {number} [emptyEchartCount] - 初始化空白echarts数量
 * @property {string[]} [echartsColors] - echarts颜色数组
 * @property {number} [segment=5] - 标线分段数
 * @property {string} [language='zh-cn'] - 语言
 * @property {boolean} [gridAlign=false] - 多echarts图表是否对齐
 * @property {string} [theme='light'] - 主题
 * @property {string} [background] - 背景色
 * @property {boolean} [isLinkage=true] - 是否联动, 默认为true
 */
export type PropsType = {
  cols?: number;
  echartsMaxCount?: number;
  emptyEchartCount?: number;
  echartsColors?: string[];
  segment?: number;
  language?: 'zh-cn' | 'en-us';
  gridAlign?: boolean, // 多echarts图表是否对齐
  theme?: 'light' | 'dark', // 主题
  background?: string, // 背景色
  isLinkage?: boolean, // 是否联动
  useMergedLegend?: boolean, // 是否使用合并图例
  useGraphicLocation?: boolean, // 是否使用图形定位
}

// 定义 props
const props = withDefaults(defineProps<PropsType>(), {
  cols: 1,
  echartsMaxCount: 7,
  language: 'zh-cn',
  gridAlign: false,
  theme: 'light',
  isLinkage: true, // 默认联动
  useMergedLegend: true, // 默认使用合并图例
  useGraphicLocation: true, // 默认使用图形定位
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

const emit = defineEmits(['drop-echart', 'listener-graphic-location']);

// 定义数据
const dataAbout = reactive({
  groupName: 'group1', // 组名
  maxEchartsIdSeq: 0, // 最大序号
  data: [] as Array<SeriesIdDataType>, // 所有echarts数据
  currentHandleChartId: '', // 当前操作的echart图表id
  restoreClickBool: false, // 监听restore是否触发点击
  isAllUpdate: false, // 是否全部更新
  isSwitchingTheme: false, // 是否正在切换主题
  currentMaxShowYCount: 0, // 当前显示的echarts中最大Y轴数量
  drag: {
    top: 5, // 拖拽legend图例距离顶部距离
    fontSize: 12, // 拖拽legend图例字体大小
    isDragging: false, // 是否拖拽中
  }
}) as DataAboutType;

// 计算每个echarts的父级容器颜色
const computedBackgroundColor = (data: SeriesIdDataType) => {
  const echartsId = data.id;
  const echartsTheme = data.theme;
  let res = '';
  // 如果是联动状态，切换主题时，需要同时切换所有图表的主题
  if (dataAbout.isSwitchingTheme) {
    // 切换主题时，优先级最高
    if (echartsTheme === 'dark') {
      res = THEME.DARK.BACKGROUND_COLOR;
    } else {
      res = THEME.LIGHT.BACKGROUND_COLOR;
    }
  } else {
    if (props.background) {
      res = props.background;
    } else {
      if (echartsTheme === 'dark') {
        res = THEME.DARK.BACKGROUND_COLOR
      } else {
        res = THEME.LIGHT.BACKGROUND_COLOR;
      }
    }
  }
  return res;
};

// 拖拽传入的数据
const dragDataComputed = (number: number) => {
  const res: Array<DragItemDataProps> = [];
  const originData = JSON.parse(JSON.stringify(dataAbout.data[number].data));
  // 初始化空白echarts时，有占位数据，但name为空，legend不显示
  if (originData.length > 0 && originData[0].name === '') return res;
  originData.forEach((item: OneDataType) => {
    // switch开关类型不可以拖拽
    res.push({ name: item.name, isDrag: item.dataType === 'switch' ? false : true });
  });
  return res;
};

// 拖拽更新数据
const update = async (data: Array<any>, echartsIndex: number) => {
  console.groupCollapsed('update');
  console.log('data', data);
  const max = Math.max(...data.map(item => item.value.length));
  const yAxisShowData = packageYAxisShowData(data);
  const seriesOpacityData = packageSeriesOpacityData(data);
  const seriesyAxisIndexData = packageSeriesyAxisIndexData(data);
  dataAbout.currentHandleChartId = dataAbout.data[echartsIndex].id;
  dataAbout.data[echartsIndex].data.forEach((item: OneDataType, index: number) => {
    item.yAxisShow = yAxisShowData[index];
    item.seriesShow = seriesOpacityData[index];
    item.seriesYAxisIndex = seriesyAxisIndexData[index];
  });
  console.log('dataAbout.data', dataAbout.data);
  console.groupEnd();
  initEcharts();
}

/**
 * @description 删除数据项
 * @param data 删除后重新组装的数据 
 * @param deleteItemsIndex 删除的项序号（其实是索引，从0开始） 
 * @param echartsIndex echarts索引，从0开始 
 */
const deleteItem = async (data: Array<any>, deleteItemsIndex: number, echartsIndex: number) => {
  console.groupCollapsed('deleteItem', data, deleteItemsIndex, echartsIndex);
  dataAbout.data[echartsIndex].data.splice(deleteItemsIndex, 1);
  dataAbout.data[echartsIndex].isDeleteItem = true;
  update(data, echartsIndex);
  await nextTick();
  dataAbout.data[echartsIndex].isDeleteItem = false;
  console.groupEnd();
}

/**
 * @description 删除数据项所在的列
 * @param data 删除后重新组装的数据 
 * @param number 删除的项序号数组（其实是索引，从0开始） 
 * @param echartsIndex echarts索引，从0开始 
 */
const deleteItemColumn = async (data: Array<any>, deleteItemsIndexArray: number[], echartsIndex: number) => {
  console.groupCollapsed('deleteItemColumn', data, deleteItemsIndexArray, echartsIndex);
  dataAbout.data[echartsIndex].data = dataAbout.data[echartsIndex].data.filter((_, index) => !deleteItemsIndexArray.includes(index));
  console.log('dataAbout.data', dataAbout.data[echartsIndex]);
  dataAbout.data[echartsIndex].isDeleteItem = true;
  update(data, echartsIndex);
  await nextTick();
  dataAbout.data[echartsIndex].isDeleteItem = false;
  console.groupEnd();
}

const deleteItemsAll = async (echartsIndex: number) => {
  console.groupCollapsed('deleteItemsAll', echartsIndex);
  dataAbout.data[echartsIndex].data = [];
  dataAbout.data[echartsIndex].isDeleteItem = true;
  initEcharts();
  await nextTick();
  dataAbout.data[echartsIndex].isDeleteItem = false;
  console.groupEnd();
}

// 组装yAxisShowData --- 各个Y轴的显示状态
const packageYAxisShowData = (data: Array<any>): boolean[] => {
  const yAxisShowData = data.map(item => item.value.length > 0 && item.value.some((item: any) => item.isShow === true)); // 只有当有数据时，并且有一个数据项的isShow为true时才显示图例
  // dataAbout.yAxisShowData = yAxisShowData;
  // console.log('legendShowData', dataAbout.yAxisShowData);
  console.log('yAxisShowData', yAxisShowData);
  return yAxisShowData;
}

// 组装seriesOpacityData --- 各个series的透明度
const packageSeriesOpacityData = (data: Array<any>): boolean[] => {
  const seriesOpacityData = new Array(data.length).fill(0);
  data.forEach((item, index) => {
    item.value.forEach((subItem: any, subIndex: number) => {
      seriesOpacityData[+subItem.id - 1] = subItem.isShow;
    });
  });
  // dataAbout.seriesOpacityData = seriesOpacityData;
  // console.log('seriesOpacityData', dataAbout.seriesOpacityData);
  console.log('seriesOpacityData', seriesOpacityData);
  return seriesOpacityData;
}

// 组装seriesyAxisIndexData --- 各个series的yAxisIndex，用于关联Y轴
const packageSeriesyAxisIndexData = (data: Array<any>): number[] => {
  const seriesyAxisIndexData = new Array(data.length).fill(0);
  data.forEach((item, index) => {
    item.value.forEach((subItem: any, subIndex: number) => {
      seriesyAxisIndexData[+subItem.id - 1] = index;
    });
  });
  // dataAbout.seriesyAxisIndexData = seriesyAxisIndexData;
  // console.log('seriesyAxisIndexData', dataAbout.seriesyAxisIndexData);
  console.log('seriesyAxisIndexData', seriesyAxisIndexData);
  return seriesyAxisIndexData;
}

/**
 * @description 获取 EchartsLinkageModel 类实例
 * @param data 系列数据
 * @returns EchartsLinkageModel 实例
 */
const getEchartsLikageModel = (data: SeriesOptionType[], theme: 'light' | 'dark') => {
  const echartsLinkageModel = new EchartsLinkageModel({
    seriesOptionArray: data,
    theme,
    segment: props.segment,
    echartsColors: (!props.echartsColors || props?.echartsColors.length < 1) ? null : props.echartsColors,
    useMergedLegend: props.useMergedLegend,
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
  element.style.setProperty('--gap', '10px');
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
  dataAbout.maxEchartsIdSeq++;
  const id = 'echart' + dataAbout.maxEchartsIdSeq;
  let markLineArray: number[] = []; // 标线数组
  let dataAll: OneDataType[] = []; // 所有数据
  if (!oneDataType) {
    // 1.空数据，默认新增一个line
    oneDataType = setOneData('', 'line', [], '', []) as OneDataType;
    markLineArray = [];
    dataAll = [{ ...oneDataType }];
  } else if (Array.isArray(oneDataType)) {
    // 2.新增多个echarts，数组
    const data: OneDataType[] = [];
    oneDataType.forEach((item: OneDataType) => {
      data.push({ ...item });
    });
    markLineArray = oneDataType[0].markLineArray || [], //todo: 标线数组暂时只取第一个，待优化
      dataAll = data;
  } else {
    // 3.新增单个echarts，如果没有seriesData，则默认新增一个line
    if (!oneDataType.seriesData || oneDataType.seriesData.length < 1) {
      oneDataType = setOneData(oneDataType.name, 'line', [], oneDataType.customData, []);
    }
    markLineArray = oneDataType.markLineArray || [],
      dataAll = [{ ...oneDataType }];
  }
  const { theme, graphics } = addEchartJudgeLinkage();
  const obj = { id, markLineArray, data: dataAll, theme, graphics };
  dataAbout.data.push(obj);
  judgeOverEchartsMaxCountHandle();
  setStyleProperty();
  allUpdateHandleCommon();
};
// 组装数据
const setOneData = (name: string, type: 'line' | 'bar', seriesData: number[][], customData: string, markLineArray: number[]): OneDataType => {
  return { name, type, seriesData, seriesDataCache: seriesData, customData, markLineArray, dataType: 'pulse', visualMapSeries: undefined };
}
// 新增echart，判断是否联动，如果联动并且已经有echart存在的情况，需要考虑新增echart的图形位置和主题
const addEchartJudgeLinkage = () => {
  let theme = props.theme;
  let graphics: GraphicLocationInfoType[] | undefined;
  if (props.isLinkage && dataAbout.data.length > 0) {
    theme = dataAbout.data[0].theme;
    if (props.useGraphicLocation) {
      graphics = dataAbout.data[0].graphics as GraphicLocationInfoType[];
    }
  }
  return { theme, graphics };
}

/**
 * @description 判断是否超出最大图表数量限制，超出则提示并删除最大数量之外的图表
 */
const judgeOverEchartsMaxCountHandle = () => {
  // 判断是否超出最大图表数量限制
  // 1.未超出，则返回
  if (dataAbout.data.length <= props.echartsMaxCount) return;
  // 2.超出，则提示并删除最大数量之外的图表
  ElMessage.warning(`最多只能添加${props.echartsMaxCount}个echarts，超出限定数量的不进行加载！`);
  dataAbout.data.splice(props.echartsMaxCount);
}

/**
 * @description 根据索引删除echarts
 * @param index 索引
 */
const deleteEchart = async (id: string) => {
  const index = dataAbout.data.findIndex((item: SeriesIdDataType) => item.id === id);
  dataAbout.data.splice(index, 1);
  setStyleProperty();
  allUpdateHandleCommon();
}

/**
 * @description 新增echarts系列
 * @param id echarts id
 * @param oneDataType 
 */
const addEchartSeries = async (id: string, oneDataType: OneDataType) => {

  // 判断series是否已存在，存在则不新增
  const judgeSeriesExist = (echart: SeriesIdDataType, oneData: OneDataType) => {
    let isExist = false;
    isExist = echart.data.some((item: OneDataType) => item.name === oneData.name && JSON.parse(JSON.stringify(item.customData)) === JSON.parse(JSON.stringify(oneData.customData)));
    return isExist;
  }

  if (dataAbout.data.length < 1) {
    ElMessage.warning('请先添加1个echart图表！');
    return;
  }
  dataAbout.currentHandleChartId = id;
  const index = dataAbout.data.findIndex((item: SeriesIdDataType) => item.id === id);
  if (judgeSeriesExist(dataAbout.data[index], oneDataType)) {
    ElMessage.warning('该子项已存在，请选择其他子项！');
    return;
  }
  const seriesData: OneDataType = {
    name: oneDataType.name,
    type: oneDataType.type,
    seriesData: oneDataType.seriesData,
    seriesDataCache: oneDataType.seriesData,
    customData: oneDataType.customData,
    dataType: oneDataType.dataType || 'pulse',
    visualMapSeries: oneDataType.visualMapSeries,
    yAxisName: oneDataType.yAxisName || '',
    xAxisName: oneDataType.xAxisName || '',
  };
  console.log('seriesData', dataAbout.data[index]);
  //注意：这里有两种空数据情况
  // 情况1是初始化了3个空echarts，每个echarts数据数组中有一个数据对象，除了type属性基本上都是空数据
  // 情况2是初始化了3个空echarts，每个echarts数据数组中有一个数据对象，有name等数据，只是seriesData数据为空
  if (dataAbout.data[index].data.length > 0 && dataAbout.data[index].data[0].name === '') {
    // 情况1，直接赋值
    dataAbout.data[index].data[0] = seriesData;
  } else {
    // 情况2，新增数据; 其他为正常新增
    dataAbout.data[index].data.push(seriesData);
  }
  await nextTick();
  initEcharts();
  await nextTick();
  dataAbout.currentHandleChartId = '';
}

// 监听，赋值最大的id序号
const getMaxId = () => {
  let max = 0;
  dataAbout.data.forEach((item: SeriesIdDataType) => {
    const id = parseInt(item.id.substring(6));
    max = id > max ? id : max;
  });
  dataAbout.maxEchartsIdSeq = max;
};

// 计算当前显示的echarts中y轴数量的最大值
const computerMaxShowYCount = () => {
  const showYCountArray: Array<number> = [];
  dataAbout.data.forEach((item: SeriesIdDataType) => {
    const data = item.data;
    let showYCount = 0;
    data.forEach((item: OneDataType) => {
      showYCount += judgeShowYAxisCommon(item);
    });
    showYCountArray.push(showYCount);
  });
  const max = Math.max(...showYCountArray);
  return max;
}
// 判断是否显示Y轴的通用方法
const judgeShowYAxisCommon = (data: OneDataType) => {
  return data.yAxisShow === false || data.dataType === 'switch' ? 0 : 1
}

/**
 * @description 判断当前echart实例是否存在，并且当前实例不在操作，则返回实例和是否需要操作
 * @param id echarts id
 * @returns {myChart: EChartsType, needHandle: boolean}
 */
const judgeEchartInstance = (id: string, dataEcharts: SeriesIdDataType) => {
  console.groupCollapsed('judgeEchartInstance', id);
  const element: HTMLElement = document.getElementById(id) as HTMLElement;
  let myChart: EChartsType = echarts.getInstanceByDom(element) as EChartsType;
  let needHandle = false;
  if (myChart) { // 实例存在
    // 比较当前echarts是否小于所有echarts中y轴数量的最大值，如果小于则需要更新
    const lastMaxShowYCount: number = dataAbout.currentMaxShowYCount; // 计算当前显示的echarts中y轴数量的最大值
    const currentMaxShowYCount: number = computerMaxShowYCount(); // 计算当前实时数据中y轴数量的最大值，还未渲染
    const currentData: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
    const currentShowYCount: number = currentData.data.reduce((pre: number, cur: OneDataType) => pre + judgeShowYAxisCommon(cur), 0);
    // console.log('maxShowYCount', lastMaxShowYCount);
    // console.log('currentShowYCount', currentShowYCount);
    // 实例存在且是删除子项item操作，需要先clear实例, 然后判断根据当前数据是否需要渲染
    if (currentData.isDeleteItem) {
      myChart.clear();
      currentData.data.length > 0 && (needHandle = true); // 非空数据，需要渲染
    } else { // 实例存在且不是删除子项item操作，判断是否需要更新
      dataAbout.currentHandleChartId === id && (needHandle = true); // 判断当前实例是否在操作
      // 当前还未渲染
      currentShowYCount < lastMaxShowYCount && (needHandle = true); // 当前小于上次渲染后的最大值，则需要更新
      currentShowYCount < currentMaxShowYCount && (needHandle = true); // 当前小于实时数据中的最大值，则需要更新 
      currentData.data.length === 0 && (needHandle = false); // 空数据，不需要渲染
    }
    if (dataEcharts.id === dataAbout.currentHandleChartId 
      && dataEcharts.data.length === 1 
      && dataEcharts.data[0].visualMapSeries 
      && dataEcharts.data[0].visualMapSeries.pieces.length === 1) {
      // 在初始化时，新增了一个空数据进行占位，当后续有数据时，需要先销毁实例，然后重新初始化实例
      myChart.dispose();
      myChart = echarts.init(element); // 切换主题时，需要重新初始化实例
    }
    if (dataAbout.isSwitchingTheme) {
      // 切换主题时，需要先销毁实例，然后重新初始化实例（注意这里必须要dispose实例，clear实例不能清除主题样式）
      const currentTheme = dataEcharts.theme;
      if (props.isLinkage || (!props.isLinkage && (dataEcharts.id === dataAbout.currentHandleChartId))) {
        // 联动模式下，处理所有图表；非联动模式下，只处理当前实例的图表
        myChart.dispose();
        myChart = echarts.init(element, currentTheme); // 切换主题时，需要重新初始化实例
      }
    }
  } else { // 实例不存在
    needHandle = true;
    myChart = echarts.init(element, dataEcharts.theme);
    // 监听 restore 事件
    myChart.on('restore', () => {
      Promise.resolve().then(() => debouncedFn());
    });
  }

  // 监听 restore 按钮是否触发点击 ---> 原因：解决点击restore按钮后，只有最后一个图表显示，其他图表不显示的问题
  dataAbout.restoreClickBool && (needHandle = true);
  // 监听是否全部更新操作 --- 原因：解决点击restore按钮后，只有最后一次操作的图表数据更新，其他图表实例没有变化被过滤掉导致数据不更新的问题
  dataAbout.isAllUpdate && (needHandle = true);
  console.log('needHandle', needHandle);
  console.groupEnd();
  return { myChart, needHandle };
}

// 监听 restore 事件，使用防抖函数
const debouncedFn = useDebounceFn(() => {
  console.log('restore');
  dataAbout.restoreClickBool = true;
  initEcharts();
}, 500);

// 容器大小变化全部更新操作，使用防抖函数，只处理最后一次操作
const containerResizeFn = useDebounceFn(() => {
  allUpdateHandleCommon();
}, 300);

/**
 * @description 初始化单个echarts
 * @param dataArray 数据数组
 * @param groupName 组名
 * @returns EChartsType
 */
const initOneEcharts = (dataArray: SeriesIdDataType, groupName: string) => {
  console.groupCollapsed('initOneEcharts', dataArray.id);
  const { myChart, needHandle } = judgeEchartInstance(dataArray.id, dataArray);
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
      seriesDataCache: item.seriesData,
      xAxisName: item.xAxisName,
      yAxisName: item.yAxisName,
      yAxisShow: item.yAxisShow,
      seriesShow: item.seriesShow,
      seriesYAxisIndex: item.seriesYAxisIndex,
      dataType: item.dataType || 'pulse',
      visualMapSeries: item.visualMapSeries,
    });
  });
  const echartsLinkageModel = getEchartsLikageModel(seriesData, dataArray.theme);
  // 添加自定义标记线
  dataArray.markLineArray && echartsLinkageModel.addCustomSeriesMarkLine(dataArray.markLineArray);
  console.log('数据', dataArray.data);
  // 各种处理
  echartsLinkageModel.setMyDeleteButton((e: any) => deleteEchart(dataArray.id))
    .setSaveAsImageClickEvent((e: any) => saveAsImage(e, dataArray.id))
    .setMyThemeButtonClickEvent((e: any) => switchEchartsTheme(e, dataArray.id))
    .setCustomSeriesMarkLine()
    .setLanguage(props.language.toLocaleLowerCase() === 'zh-cn' ? 'zh-cn' : 'en') // 设置语言
    .setFontSizeAndMoreAuto(comsputerEchartsHeight(), props.useGraphicLocation) // 设置字体大小等自适应
  props.gridAlign && echartsLinkageModel.setGridLeftAlign(computerMaxShowYCount()) // 设置多echarts图表是否对齐
  echartsLinkageModel.setBackgroundColor('transparent') // 在echarts中设置透明，在父级设置背景色
  const option: EChartsOption = echartsLinkageModel.getResultOption();
  myChart.setOption(option);
  // const xAxisData = JSON.parse(JSON.stringify(echartsLinkageModel.getXAxisData()));
  dataArray.xAxisdata = echartsLinkageModel.getXAxisData() as string[];
  myChart.on('datazoom', () => datazoomEvent(dataArray.graphics, dataArray.id, (dataArray.xAxisdata as string[])));
  console.log('option', option);
  // 联动
  myChart.group = groupName;
  myChart.resize();
  // 图形设置，必须在myChart.resize()之后，否则会导致图形位置不正确
  props.useGraphicLocation
    && dataArray.data[0].seriesData.length > 0
    && (dataArray.graphics = echartsLinkageModel.setGraphic(myChart, dataArray.graphics, (params: GraphicLocationInfoType) => graphicDragLinkage(params, dataArray.id)));
  console.groupEnd();
  return myChart;
}

/**
 * @description 计算echarts高度
 * @returns number
 */
const comsputerEchartsHeight = () => {
  const element: HTMLElement = document.querySelector('.main-container') as HTMLElement;
  const gap = element.style.getPropertyValue('--gap');
  const count = dataAbout.data.length;
  const height = Math.floor((element.offsetHeight - (count - 1) * parseInt(gap.substring(0, gap.length - 2))) / count);
  // console.log('height', height);
  setDragPosition(height);
  return height;
}

/**
 * @description 根据echarts实例容器的高度，设置拖拽legend图例的位置和字体大小
 * @param height echarts高度
 */
const setDragPosition = (height: number) => {
  if (height <= 200) {
    dataAbout.drag.top = -2;
    dataAbout.drag.fontSize = 11;
  } else {
    dataAbout.drag.top = 5;
    dataAbout.drag.fontSize = 12;
  }
}

// 初始化空白echarts
const initEmptyEcharts = (count: number) => {
  if (!count || count < 1) return;
  for (let i = 0; i < count; i++) {
    addEchart();
  }
}

// 初始化echarts
const initEcharts = () => {
  // 基于准备好的dom，初始化echarts图表
  const groupName: string = dataAbout.groupName;
  echarts.dispose(groupName);
  dataAbout.data.forEach((item: SeriesIdDataType, index: number) => {
    initOneEcharts(item, groupName);
  });
  props.useGraphicLocation && emitGraphicLocation(); // 初始化时发送图形位置信息
  dataAbout.restoreClickBool = false;
  dataAbout.currentMaxShowYCount = computerMaxShowYCount(); // 记录当前显示的echarts中y轴数量的最大值
  props.isLinkage && echarts.connect(groupName); // 联动
}

/**
 * @description 根据position实时计算graphic的坐标信息
 * @param myChart echarts实例
 * @param graphics 图形元素数组  
 * @returns 
 */
const computerDatazoomGraphic = (myChart: any, graphics: Array<GraphicLocationInfoType>, xAxisData: string[]): Array<GraphicLocationInfoType> => {
  const positionX1 = graphics[0].positionX;
  const positionX2 = graphics[1].positionX;
  const xAxisSeq1 = myChart.convertFromPixel({ xAxisId: XAXIS_ID }, positionX1);
  const xAxisSeq2 = myChart.convertFromPixel({ xAxisId: XAXIS_ID }, positionX2);
  const xAxisX1 = xAxisData[xAxisSeq1];
  const xAxisX2 = xAxisData[xAxisSeq2];
  return [
    { graphicId: graphics[0].graphicId, positionX: positionX1, xAxisSeq: xAxisSeq1, xAxisX: xAxisX1 },
    { graphicId: graphics[1].graphicId, positionX: positionX2, xAxisSeq: xAxisSeq2, xAxisX: xAxisX2 }
  ]
}

/**
 * @description 监听datazoom事件，计算当前实例的图形位置信息，赋值给其他实例，并且触发更新
 * 联动模式下：datazoom事件会在所有图表中触发，所以这里只计算第一个实例的图形，然后赋值给其他实例
 * 非联动模式下：只处理当前实例的图形
 * @param graphicLocation 图形位置信息
 * @param currentEchartsId 当前实例id
 * @param xAxisData x轴数组数据
 */
const datazoomEvent = (graphicLocation: GraphicLocationInfoType[] | undefined, currentEchartsId: string, xAxisData: string[]) => {
  // console.log('datazoomEvent', graphicLocation, currentEchartsId, xAxisData);
  if (props.isLinkage && (dataAbout.data[0].id !== currentEchartsId)) return; // 联动模式下，只处理计算第一个实例的图形
  if (animating || !graphicLocation) return; // 防止动画过程中重复触发
  animating = true;
  requestAnimationFrame(() => {
    // 联动模式下，datazoom事件会在所有图表中触发，所以这里只计算第一个实例的图形，然后赋值给其他实例
    const element: HTMLElement = document.getElementById(currentEchartsId) as HTMLElement;
    let myChart: EChartsType = echarts.getInstanceByDom(element) as EChartsType;
    const datazoomGraphic = computerDatazoomGraphic(myChart, graphicLocation, xAxisData);
    // 赋值给所有实例，并且触发更新
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      if (!props.isLinkage && (item.id !== currentEchartsId)) return; // 非联动状态，只处理当前实例的图形
      item.graphics = datazoomGraphic;
      const element: HTMLElement = document.getElementById(item.id) as HTMLElement;
      let myChart: EChartsType = echarts.getInstanceByDom(element) as EChartsType;
      setOptionGraphic(myChart, datazoomGraphic);
    });
    emitGraphicLocation();
    animating = false;
  });
}


let animating = false;
/**
 * @description 图形移动联动, 使用requestAnimationFrame优化性能
 * @param params 图形位置信息
 * @param currentEchartsId 当前实例id
 */
const graphicDragLinkage = (graphicLocation: GraphicLocationInfoType, currentEchartsId: string) => {
  if (animating) return;
  animating = true;
  requestAnimationFrame(() => {
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      // console.log('graphicDragLinkage', item.id, graphicLocation.graphicId);
      if (!props.isLinkage && (item.id !== currentEchartsId)) return; // 非联动状态，只处理当前实例的图形
      // 注意：这里必须根据id重新获取最新的echarts实例，否则会导致后续实例渲染出现问题
      const element: HTMLElement = document.getElementById(item.id) as HTMLElement;
      let myChart: EChartsType = echarts.getInstanceByDom(element) as EChartsType;
      let notDragGraphic: GraphicLocationInfoType = {} as any;
      item.graphics && item.graphics.forEach((graphic: GraphicLocationInfoType) => {
        if (graphic.graphicId === graphicLocation.graphicId) {
          graphic.positionX = graphicLocation.positionX;
          graphic.xAxisSeq = graphicLocation.xAxisSeq;
          graphic.xAxisX = graphicLocation.xAxisX;
        } else {
          notDragGraphic = graphic;
          notDragGraphic.xAxisSeq = myChart.convertFromPixel({ xAxisId: XAXIS_ID }, notDragGraphic.positionX);
          // 如果x轴最前面被加上了空值，这里的序号则需要减去1
          const seq = judgeLengthAnalysisOrNot(item.xAxisdata, item.data[0].seriesData) ? notDragGraphic.xAxisSeq - 1 : notDragGraphic.xAxisSeq;
          notDragGraphic.xAxisX = item.data[0].seriesData[seq][0].toString();
        }
      });
      setOptionGraphic(myChart, [graphicLocation, notDragGraphic]);
    });
    emitGraphicLocation();
    animating = false;
  });
};

// 判断是否为长度分析图表，长度分析图表X轴最前面被加上了空值，所以长度比series中数据多1
const judgeLengthAnalysisOrNot = (xAxisdata: string[] | undefined, seriesData: (number | string)[][], diff: number = 1) => {
  return xAxisdata?.length === (seriesData.length + diff);
}

/**
 * @description 渲染图形
 * @param myChart echarts实例
 * @param graphics 图形元素数组
 */
const setOptionGraphic = (myChart: EChartsType, graphics: GraphicLocationInfoType[]) => {
  myChart.setOption({
    graphic: [
      {
        id: graphics[0].graphicId,
        type: 'rect', // 这里必须要添加图形类型，否则打包后发布新版本再引入会报错
        position: [graphics[0].positionX, 0],
        info: graphics[0].xAxisX,
        textContent: {
          type: 'text',
          style: {
            text: graphics[0].xAxisX,
          }
        },
      },
      {
        id: graphics[1].graphicId,
        type: 'rect',
        position: [graphics[1].positionX, 0],
        info: graphics[1].xAxisX,
        textContent: {
          type: 'text',
          style: {
            text: graphics[1].xAxisX,
          }
        },
      }
    ],
  });
}

// 组装所有图形数据，发送给父组件（1.初始化时调，2.移动图形时调用）
const emitGraphicLocation = () => {
  const graphicLocation: ListenerGrapicLocationType = [];
  dataAbout.data.forEach((item: SeriesIdDataType) => {
    graphicLocation.push({ id: item.id, graphics: item.graphics ? JSON.parse(JSON.stringify(item.graphics)) : [] });
  });
  emit('listener-graphic-location', graphicLocation);
}

// 拖拽移动事件
const dragoverEchart = (e: DragEvent) => {
  e.preventDefault();
}

// 接收拖拽事件
const dropEchart = (e: any) => {
  if (e.target.localName !== 'canvas') return; // 防止拖拽组件在操作时触发echarts的drop事件
  if (dataAbout.drag.isDragging) return; // 防止拖拽legend图例时触发echarts的drop事件
  e.preventDefault();
  const id = (e.target as HTMLElement).parentElement!.offsetParent!.id;
  emit('drop-echart', { id } as DropEchartType);
}

let resizeObserver: ResizeObserver; // 元素尺寸变化观察器
let initFlag = true; // 初始化标识
// 监听事件
const initLisener = () => {
  // 监听拖拽事件
  const echartsLinkageContainer: HTMLElement = document.querySelector('.echarts-linkage-container') as HTMLElement;
  echartsLinkageContainer.addEventListener('dragover', dragoverEchart);
  echartsLinkageContainer.addEventListener('drop', dropEchart);

  // 创建 ResizeObserver 实例
  resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      // console.log('main-container 高度变化:', entry.contentRect.height);
      if (initFlag) {
        // 初始化时，有一次触发，不进行操作，将初始状态标记为false 
        initFlag = false;
      } else {
        // 非初始化时，高度变化，才重新更新所有echarts。
        containerResizeFn();
      }
    }
  });
  // 开始观察 mainContainer
  resizeObserver.observe(echartsLinkageContainer);
}

// 移除事件监听
const removeLisener = () => {
  const echartsLinkageContainer: HTMLElement = document.querySelector('.echarts-linkage-container') as HTMLElement;
  // 移除拖动事件监听
  echartsLinkageContainer.removeEventListener('dragover', dragoverEchart);
  echartsLinkageContainer.removeEventListener('drop', dropEchart);

  // 停止观察 mainContainer
  resizeObserver.unobserve(echartsLinkageContainer); // 在销毁前停止观察
}

// 获取数据总数 --- 导出
const getDataLength = (): number => {
  return dataAbout.data.length;
}

// 获取所有不重复系列的标签信息 --- 导出
const getAllDistinctSeriesTagInfo = (): Array<SeriesTagType> => {
  const res: Array<SeriesTagType> = [];
  dataAbout.data.forEach((echart: SeriesIdDataType) => {
    echart.data.forEach((series: OneDataType) => {
      const isExist = res.some(item => item.name === series.name && JSON.stringify(item.customData) === JSON.stringify(series.customData));
      series.name && !isExist && res.push({
        name: series.name,
        customData: series.customData,
        dataType: series.dataType,
        seriesData: [],
      })
    });
  });
  return res;
}

// 获取所有echarts实例各个系列的标签信息 --- 导出
const getAllSeriesTagInfo = (): Array<{ id: string, series: Array<SeriesTagType> }> => {
  const res: Array<{ id: string, series: Array<SeriesTagType> }> = [];
  dataAbout.data.forEach((echart: SeriesIdDataType) => {
    const oneEchartInfo: { id: string, series: Array<SeriesTagType> } = { id: echart.id, series: [] };
    echart.data.forEach((series: OneDataType) => {
      oneEchartInfo.series.push({
        name: series.name,
        customData: series.customData,
        seriesData: [],
      })
    });
    res.push(oneEchartInfo);
  });
  return res;
}

/**
 * @description 清空所有echarts数据 --- 导出 
 * @param mode 'clear' | 'delete'， 清空 | 删除，说明：当mode为'clear'时，清除数据保留当前空白echarts实例，当mode为'delete'时，删除当前实例
 */
const clearAllEchartsData = async (mode: 'clear' | 'delete' = 'clear') => {
  const count = dataAbout.data.length;
  dataAbout.data = [];
  dataAbout.maxEchartsIdSeq = 0;
  setStyleProperty();
  await nextTick();
  initEcharts();
  await nextTick();
  mode === 'clear' && initEmptyEcharts(count);
}

// 替换所有echarts，内部为先清除再添加，保证新旧echarts图表数量和数据不存在关联性 --- 导出
const replaceAllEchartsData = async (newDataArray: Array<OneDataType[]>) => {
  const date1 = new Date().getTime();
  console.log("replaceAllEchartsData start", date1);
  await clearAllEchartsData('delete');
  newDataArray.forEach((item: OneDataType[]) => {
    addEchart(item);
  });
}

// 更新单个echarts的visualMap数据 --- 导出
const updateOneEchartVisualMapSeries = (id: string, data: VisualMapSeriesType[] | VisualMapSeriesType) => {
  const echart: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
  //todo: 待完善，更新单个echarts的visualMap数据

}

// 传入所有显示子项数据，更新所有echarts --- 导出
const updateAllEcharts = (newAllSeriesdata: Array<SeriesTagType>) => {
  dataAbout.data.forEach((echart: SeriesIdDataType) => {
    echart.data.forEach((series: OneDataType, index: number) => {
      const newSeriesData = newAllSeriesdata.filter(item => item.name === series.name && JSON.stringify(item.customData) === JSON.stringify(series.customData))[0] && (series.seriesData = newAllSeriesdata.filter(item => item.name === series.name && JSON.stringify(item.customData) === JSON.stringify(series.customData))[0].seriesData);
      newSeriesData && (series.seriesData = newSeriesData);
    });
  });
  allUpdateHandleCommon();
}

/**
 * @description 全部更新处理的公共方法
 */
const allUpdateHandleCommon = async () => {
  await nextTick(); // 作用：防止在调用方法之前修改了dataAbout.data，而dataAbout.data是响应式的，又会导致画面重新渲染
  dataAbout.isAllUpdate = true; // 标记全部更新
  initEcharts();
  await nextTick();
  comsputerEchartsHeight();
  dataAbout.isAllUpdate = false; // 标记全部更新完成
}

// 获取最大的id序号 --- 导出
const getMaxEchartsIdSeq = () => {
  return dataAbout.maxEchartsIdSeq;
}

// 新增实时数据更新 --- 导出
const realTimeUpdate = (allRealTimeData: Array<SeriesTagType>, limitCount = 50) => {
  const LIMIT_COUNT = limitCount; // 限制最大数据量
  dataAbout.data.forEach((echart: SeriesIdDataType) => {
    let addXs: Array<string> = []; // 记录当前x轴新增数据
    let limitFlag = false; // 记录是否超过最大数据量
    echart.data.forEach((series: OneDataType, index: number) => {
      const realTimeData: SeriesTagType | undefined = allRealTimeData.filter(item => judgeTagIsSame(item, series))[0];
      if (!realTimeData) return;
      realTimeData.seriesData.forEach(element => {
        const xValue = element[0].toString();
        const yValue = element[1];
        index === 0 && (addXs.push(xValue));
        series.seriesData.push([xValue, yValue]);
        series.seriesData.length > LIMIT_COUNT && series.seriesData.shift() && (limitFlag = true); // 限制最大数据量为100
      });
    });
    let startIndex = 0; // 删除的索引位置，长度分析时是1，其他是0
    echart.xAxisdata?.push(...addXs);
    if (limitFlag && judgeLengthAnalysisOrNot(echart.xAxisdata, echart.data[0].seriesData, 1 + addXs.length)) {
      startIndex = 1;
    }
    // 限制x轴最大数据量
    limitFlag && echart.xAxisdata?.length && echart.xAxisdata?.splice(startIndex, addXs.length);
  });
  if ((dataAbout.data[0].xAxisdata || []).length === allRealTimeData[0].seriesData.length) {
    // 只有第一次实时更新时，才会初始化echarts的所有配置
    allUpdateHandleCommon();
    return;
  }
  console.log('realTimeUpdate', dataAbout.data);
  requestAnimationFrame(() => {
    // 赋值给所有实例，并且触发更新
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      if (!item.data || item.data.length === 0) return; // 防止空白echarts实例
      const element: HTMLElement = document.getElementById(item.id) as HTMLElement;
      let myChart: EChartsType = echarts.getInstanceByDom(element) as EChartsType;
      const series = item.data.map((series: OneDataType) => {
        return {
          data: series.seriesData,
        }
      });
      myChart.setOption({
        xAxis: [{
          data: item.xAxisdata,
        }],
        series: series,
      });
    });
    animating = false;
  });
}

// 判断标签是否一致，需要考虑customData
const judgeTagIsSame = (tag1: SeriesTagType, tag2: SeriesTagType) => {
  return tag1.name === tag2.name && JSON.stringify(tag1.customData) === JSON.stringify(tag2.customData);
}

// 下载包含所有echarts的图片 --- 导出
const downloadAllEchartsImg = () => {
  const extraHeight = 10 * 2 + 10 * (dataAbout.data.length - 1); // 需要加上下padding的10px(10 * 2)，以及gap的和(10 * (count -1))
  FileUtil.htmlElementToImage('.echarts-linkage-container', 'echarts-linkage.png', extraHeight);
}

// echarts上的按钮保存图片事件
const saveAsImage = (e: any, id: string) => {
  console.log('saveAsImage', id);
  if (props.isLinkage) {
    // 联动时，保存图片时包含所有图表
    downloadAllEchartsImg();
  } else {
    // 非联动时，保存图片时只保存当前图表
    const parentElement: HTMLElement = document.getElementById(id)?.parentElement as HTMLElement;
    console.log('parentElement', parentElement);
    FileUtil.htmlElementToImage(parentElement, `echarts-linkage-${id}.png`);
  }
}

// echarts上的主题切换事件
const switchEchartsTheme = async (e: any, id: string) => {
  console.log('switchEchartsTheme', id);
  const data: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
  const theme = data.theme === 'light' ? 'dark' : 'light';
  console.log('data', data);
  dataAbout.isSwitchingTheme = true;
  if (props.isLinkage) {
    // 如果是联动状态，切换主题时，需要同时切换所有图表的主题
    dataAbout.data.forEach((item: SeriesIdDataType) => item.theme = theme);
    allUpdateHandleCommon();
  } else {
    // 非联动状态，切换主题时，只切换当前图表的主题
    const index = dataAbout.data.findIndex((item: SeriesIdDataType) => item.id === id);
    dataAbout.data[index].theme = theme;
    dataAbout.currentHandleChartId = id;
    await nextTick();
    initEcharts();
  }
  await nextTick();
  dataAbout.isSwitchingTheme = false;
}

// 子组件暴露变量和方法
const exposedMethods: ExposedMethods = {
  addEchart,
  addEchartSeries,
  deleteEchart,
  getDataLength,
  getMaxEchartsIdSeq,
  getAllDistinctSeriesTagInfo,
  getAllSeriesTagInfo,
  updateAllEcharts,
  clearAllEchartsData,
  replaceAllEchartsData,
  downloadAllEchartsImg,
  realTimeUpdate,
};
defineExpose(exposedMethods);

// 监听dataAbout.data的变化，重新计算maxEchartsIdSeq
watch(() => dataAbout.data.length, () => {
  getMaxId();
});

onMounted(() => {
  initLisener();
  props.emptyEchartCount && initEmptyEcharts(props.emptyEchartCount);
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
      position: relative;

      .drag-container {
        position: absolute;
        top: var(--drag-top);
        right: 150px;
        padding: 2px;
        z-index: 20;
      }
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