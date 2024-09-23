<template>
  <div class='echarts-linkage-container'>
    <div class="main-container">
      <div v-for="(item, index) in dataAbout.data" :key="item.id + '-' + index" class="echarts-container" :style="{'background-color': computedBackgroundColor}">
        <div :id="item.id" class="h-100% w-100%"></div>
        <Drag v-if="useMergedLegend" :data="dragDataComputed(index)" :colors="echartsColors" :id="item.id"
          :group="item.id" :theme="theme" @update="(data) => update(data, index)"
          @delete-item="(data, number) => deleteItem(data, number, index)" />
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
import { XAXIS_ID } from "@/models/echarts-linkage-model/staticTemplates"
import { FileUtil } from "@/utils/index";
import type { ExposedMethods, OneDataType, SeriesIdDataType, DataAboutType, SeriesTagType, DropEchartType, GraphicLocationInfoType, ListenerGrapicLocationType } from './types/index';
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
  currentMaxShowYCount: 0, // 当前显示的echarts中最大Y轴数量
}) as DataAboutType;

// 计算每个echarts的父级容器颜色
const computedBackgroundColor = computed(() => {
  if (props.background) return props.background;
  if (props.theme === 'dark') return '#100C2A';
  return 'transparent';
});

// 拖拽传入的数据
const dragDataComputed = (number: number) => {
  const res: Array<DragItemDataProps> = [];
  const originData = JSON.parse(JSON.stringify(dataAbout.data[number].data));
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

// 删除数据项
const deleteItem = async (data: Array<any>, number: number, echartsIndex: number) => {
  console.groupCollapsed('deleteItem', data, number, echartsIndex);
  dataAbout.data[echartsIndex].data.splice(number, 1);
  dataAbout.data[echartsIndex].isDeleteItem = true;
  update(data, echartsIndex);
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
const getEchartsLikageModel = (data: SeriesOptionType[]) => {
  const echartsLinkageModel = new EchartsLinkageModel({
    seriesOptionArray: data,
    segment: props.segment,
    echartsColors: (!props.echartsColors || props?.echartsColors.length < 1) ? null : props.echartsColors,
    minMarkLine: 1,
    maxMarkLine: 5,
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
  dataAbout.data.push({ id, markLineArray, data: dataAll });
  judgeOverEchartsMaxCountHandle();
  setStyleProperty();
  await nextTick();
  initEcharts();
};
// 组装数据
const setOneData = (name: string, type: 'line' | 'bar', seriesData: number[][], customData: string, markLineArray: number[]): OneDataType => {
  return { name, type, seriesData, seriesDataCache: seriesData, customData, markLineArray, dataType: 'pulse' };
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
  const seriesData = { name: oneDataType.name, type: oneDataType.type, seriesData: oneDataType.seriesData, seriesDataCache: oneDataType.seriesData, customData: oneDataType.customData, dataType: oneDataType.dataType || 'pulse' };
  if (dataAbout.data[index].data.length > 0 && dataAbout.data[index].data[0].seriesData.length === 0) { // 空数据，直接赋值
    dataAbout.data[index].data[0] = seriesData
  } else {
    dataAbout.data[index].data.push(seriesData);
  }
  await nextTick();
  initEcharts();
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
const judgeEchartInstance = (id: string) => {
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
    console.log('maxShowYCount', lastMaxShowYCount);
    console.log('currentShowYCount', currentShowYCount);
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
  } else { // 实例不存在
    needHandle = true;
    myChart = echarts.init(element, props.theme);
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

/**
 * @description 初始化单个echarts
 * @param dataArray 数据数组
 * @param groupName 组名
 * @returns EChartsType
 */
const initOneEcharts = (dataArray: SeriesIdDataType, groupName: string) => {
  console.groupCollapsed('initOneEcharts', dataArray.id);
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
      seriesDataCache: item.seriesData,
      xAxisName: item.xAxisName,
      yAxisName: item.yAxisName,
      yAxisShow: item.yAxisShow,
      seriesShow: item.seriesShow,
      seriesYAxisIndex: item.seriesYAxisIndex,
      dataType: item.dataType || 'pulse',
    });
  });
  const echartsLinkageModel = getEchartsLikageModel(seriesData);
  // 添加自定义标记线
  dataArray.markLineArray && echartsLinkageModel.addCustomSeriesMarkLine(dataArray.markLineArray);
  console.log(dataArray.data);
  // 各种处理
  echartsLinkageModel.setToolBoxClickEvent((e: any) => deleteEchart(dataArray.id))
    .setSaveAsImageClickEvent((e: any) => saveAsImage(e, dataArray.id))
    .setCustomSeriesMarkLine()
    .setLanguage(props.language.toLocaleLowerCase() === 'zh-cn' ? 'zh-cn' : 'en') // 设置语言
  props.gridAlign && echartsLinkageModel.setGridLeftAlign(computerMaxShowYCount()) // 设置多echarts图表是否对齐
  echartsLinkageModel.setBackgroundColor('transparent') // 在echarts中设置透明，在父级设置背景色
  const option: EChartsOption = echartsLinkageModel.getResultOption();
  console.log("option", option);
  myChart.setOption(option);
  // 图形设置
  props.useGraphicLocation
    && dataArray.data[0].seriesData.length > 0
    && (dataArray.graphics = echartsLinkageModel.setGraphic(myChart, dataArray.graphics, (params: GraphicLocationInfoType) => graphicDragLinkage(params)));
  // 联动
  myChart.group = groupName;
  myChart.resize();
  console.groupEnd();
  return myChart;
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
  emitGraphicLocation();
  dataAbout.restoreClickBool = false;
  dataAbout.currentMaxShowYCount = computerMaxShowYCount(); // 记录当前显示的echarts中y轴数量的最大值
  props.isLinkage && echarts.connect(groupName); // 联动
}


let animating = false;
/**
 * @description 图形移动联动, 使用requestAnimationFrame优化性能
 * @param params 图形位置信息
 */
const graphicDragLinkage = (params: GraphicLocationInfoType) => {
  if (animating) return;
  animating = true;
  requestAnimationFrame(() => {
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      if (!props.isLinkage && (item.id !== params.graphicId)) return; // 非联动状态，只处理当前实例的图形
      // 注意：这里必须根据id重新获取最新的echarts实例，否则会导致后续实例渲染出现问题
      const element: HTMLElement = document.getElementById(item.id) as HTMLElement;
      let myChart: EChartsType = echarts.getInstanceByDom(element) as EChartsType;
      let notDragGraphic: GraphicLocationInfoType = {} as any;
      item.graphics && item.graphics.forEach((graphic: GraphicLocationInfoType) => {
        if (graphic.graphicId === params.graphicId) {
          graphic.positionX = params.positionX;
          graphic.xAxisSeq = params.xAxisSeq;
          graphic.xAxisX = params.xAxisX;
        } else {
          notDragGraphic = graphic;
          notDragGraphic.xAxisSeq = myChart.convertFromPixel({ xAxisId: XAXIS_ID }, notDragGraphic.positionX);
          notDragGraphic.xAxisX = item.data[0].seriesData[notDragGraphic.xAxisSeq - 1][0];
        }
      });
      myChart.setOption({
        graphic: [
          {
            id: params.graphicId,
            type: 'rect',
            position: [params.positionX, 0],
            info: params.xAxisX,
            textContent: {
              type: 'text',
              style: {
                text: params.xAxisX,
              }
            },
          },
          {
            id: notDragGraphic.graphicId,
            type: 'rect',
            position: [notDragGraphic.positionX, 0],
            info: notDragGraphic.xAxisX,
            textContent: {
              type: 'text',
              style: {
                text: notDragGraphic.xAxisX,
              }
            },
          }
        ],
      });
    });
    emitGraphicLocation();
    animating = false;
  });
};

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
  e.preventDefault();
  const id = (e.target as HTMLElement).parentElement!.offsetParent!.id;
  emit('drop-echart', { id } as DropEchartType);
}

// 监听拖拽事件
const initLisener = () => {
  const echartsLinkageContainer: HTMLElement = document.querySelector('.echarts-linkage-container') as HTMLElement;
  echartsLinkageContainer.addEventListener('dragover', dragoverEchart);
  echartsLinkageContainer.addEventListener('drop', dropEchart);
  // echartsLinkageContainer.addEventListener('resize', (e) => {
  //   console.log('resize', e);
  // });
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
const getAllDistinctSeriesTagInfo = (): Array<SeriesTagType> => {
  const res: Array<SeriesTagType> = [];
  dataAbout.data.forEach((echart: SeriesIdDataType) => {
    echart.data.forEach((series: OneDataType) => {
      const isExist = res.some(item => item.name === series.name && JSON.stringify(item.customData) === JSON.stringify(series.customData));
      series.name && !isExist && res.push({
        name: series.name,
        customData: series.customData,
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

//TODO: 待完善，更新单个echarts
const updateOneEchart = (id: string, data: { [key: string]: Array<number[]> }) => {

}

// 传入所有显示子项数据，更新所有echarts --- 导出
const updateAllEcharts = async (newAllSeriesdata: Array<SeriesTagType>) => {
  dataAbout.data.forEach((echart: SeriesIdDataType) => {
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
        top: 5px;
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