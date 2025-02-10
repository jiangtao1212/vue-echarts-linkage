<template>
  <div class='echarts-linkage-container'>
    <!-- 主容器 -->
    <div class="main-container" :class="{ 'hide-scroll': isEchartsHeightChange }">
      <div v-for="(item, index) in dataAbout.data" :key="item.id + '-' + index" class="echarts-container"
        :style="{ 'background-color': computedBackgroundColor(item), '--drag-top': dataAbout.drag.top + 'px' }">
        <div :id="item.id" class="h-100% w-100%"></div>
        <Drag v-if="useMergedLegend" :data="dragDataComputed(index)" :colors="echartsColors" :id="item.id"
          :group="item.id" :theme="item.theme" :item-font-size="dataAbout.drag.fontSize"
          @is-dragging="(isDragging) => dataAbout.drag.isDragging = isDragging"
          @update="(data) => dragUpdateHandle(data, index)"
          @delete-item="(data, number) => deleteItem(data, number, index)"
          @delete-item-column="(data, numbers) => deleteItemColumn(data, numbers, index)"
          @delete-items-all="deleteItemsAll(index)" />
      </div>
    </div>

    <!-- 数据视窗 -->
    <el-dialog v-model="dialogVisible" title="数据视图">
      <MySheet :head="sheetAbout.head" :body="sheetAbout.body" />
    </el-dialog>
  </div>
</template>

<script setup lang='ts'>
import { ref, reactive, onMounted, nextTick, computed, watch, onBeforeUnmount, onBeforeMount } from 'vue';
import 'element-plus/es/components/message/style/css';
import { ElMessage, formatter } from 'element-plus';
import * as echarts from "echarts";
import { type EChartsOption, type EChartsType, type LineSeriesOption, type BarSeriesOption, type ToolboxComponentOption } from "echarts";
import { useDebounceFn, useThrottleFn } from "@vueuse/core";
import { EchartsLinkageModel, setMergedOptionTemplate, type EchartsLinkageModelType, type SeriesOptionType } from "@/models/index";
import { XAXIS_ID, THEME, optionTemplate } from "@/models/echarts-linkage-model/staticTemplates"
import { FileUtil } from "@/utils/index";
import type {
  ExposedMethods, OneDataType, SeriesIdDataType, DataAboutType, SeriesTagType,
  DropEchartType, DeleteEchartType, GraphicLocationInfoType, ListenerGrapicLocationType,
  VisualMapSeriesType, SeriesLinkType, LinkDataType, SeriesDataType, MarkLineDataType, SegementType,
  AppointEchartsTagType, ListenerExcelViewType, excelViewType, excelViewHeadType, ThemeType
} from './types/index';
import Drag from "@/components/drag/index.vue";
import { type DragItemDataProps } from "@/components/drag/type/index";
import MySheet from "@/components/sheet/index.vue";
import { type SheetHeadType } from '@/components/sheet/type/index';
import { ObjUtil } from "@/utils/index";
import Extension from './extension';

/**
 * @description 组件props类型
 * @property {number} [cols=1] - 列数
 * @property {number} [echartsMaxCount=7] - Echarts最大数量
 * @property {number} [emptyEchartCount] - 初始化空白echarts数量
 * @property {string[]} [echartsColors] - echarts颜色数组
 * @property {SegementType} [segment] - 标线分段数 
 * @property {string} [language='zh-cn'] - 语言
 * @property {boolean} [gridAlign=false] - 多echarts图表是否对齐
 * @property {string} [theme='light'] - 主题
 * @property {string} [background] - 背景色
 * @property {boolean} [isLinkage=true] - 是否联动, 默认为true
 * @property {boolean} [useMergedLegend=true] - 是否使用合并图例
 * @property {boolean} [useGraphicLocation=true] - 是否使用图形定位
 * @property {boolean} [isEchartsHeightChange=true] - 是否根据数量，改变echarts的高度，默认true改变
 * @property {number} [echartsHeightFixedCount=3] - echarts高度固定数量，默认为3
 * @property {object} [extraOption] - 额外的echarts配置项，主要是grid、toolbox、xAxis等属性的合并；合并默认option，该优先级更高, 相同属性值进行合并, 不同属性值直接赋值
 */
export type PropsType = {
  cols?: number;
  echartsMaxCount?: number;
  emptyEchartCount?: number;
  echartsColors?: string[];
  segment?: SegementType;
  language?: 'zh-cn' | 'en-us';
  gridAlign?: boolean, // 多echarts图表是否对齐
  theme?: 'light' | 'dark', // 主题
  background?: string, // 背景色
  isLinkage?: boolean, // 是否联动
  useMergedLegend?: boolean, // 是否使用合并图例
  useGraphicLocation?: boolean, // 是否使用图形定位
  isEchartsHeightChange?: boolean, // 是否根据数量，改变echarts的高度
  echartsHeightFixedCount?: number, // echarts高度固定数量
  extraOption?: { [key: string]: any }, // 额外的echarts配置项，主要是grid、toolbox、xAxis等属性的合并
  groups?: Array<Array<number>>, // 分组属性，二维数组：第一维表示分组，第二维表示该分组下的chart序号（序号从1开始）
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
  useGraphicLocation: false, // 默认不使用图形定位
  isEchartsHeightChange: true, // 默认改变echarts的高度
  echartsHeightFixedCount: 3, // echarts高度固定数量
});

const dialogVisible = ref(false);
// 验证 props
ObjUtil.validateCols(props.cols, 'cols 必须是一个正整数');
// 递归合并自定义option
setMergedOptionTemplate(props.extraOption);
const emit = defineEmits(['drop-echart', 'listener-graphic-location', 'delete-echart', 'listener-excel-view']);
// 定义相关数据
const dataAbout = reactive({
  groupsName: [], // 组名数组
  groupDefault: '', // 默认组名
  maxEchartsIdSeq: 0, // 最大序号
  data: [] as Array<SeriesIdDataType>, // 所有echarts数据
  currentHandleChartIds: [''], // 当前操作的echart图表id集合
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

// 定义子画面中表格数据
const sheetAbout = reactive({
  head: [] as Array<SheetHeadType>, // 表头数据
  body: [] as Array<any>, // 表格数据
});

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

/**
 * @description 拖拽更新操作
 * @param data 拖拽后的数据
 * @param echartsIndex echarts索引，从0开始 
 */
const dragUpdateHandle = async (data: Array<any>, echartsIndex: number) => {

  // 组装yAxisShowData --- 各个Y轴的显示状态
  function packageYAxisShowData(data: Array<any>): boolean[] {
    const yAxisShowData = data.map(item => item.value.length > 0 && item.value.some((item: any) => item.isShow === true)); // 只有当有数据时，并且有一个数据项的isShow为true时才显示图例
    // dataAbout.yAxisShowData = yAxisShowData;
    // console.log('legendShowData', dataAbout.yAxisShowData);
    console.log('yAxisShowData', yAxisShowData);
    return yAxisShowData;
  }

  // 组装seriesOpacityData --- 各个series的透明度
  function packageSeriesOpacityData(data: Array<any>): boolean[] {
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
  function packageSeriesyAxisIndexData(data: Array<any>): number[] {
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

  console.groupCollapsed('update');
  console.log('data', data);
  const max = Math.max(...data.map(item => item.value.length));
  const yAxisShowData = packageYAxisShowData(data);
  const seriesOpacityData = packageSeriesOpacityData(data);
  const seriesyAxisIndexData = packageSeriesyAxisIndexData(data);
  dataAbout.currentHandleChartIds = [dataAbout.data[echartsIndex].id];
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
  dragUpdateHandle(data, echartsIndex);
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
  dragUpdateHandle(data, echartsIndex);
  await nextTick();
  dataAbout.data[echartsIndex].isDeleteItem = false;
  console.groupEnd();
}

/**
 * @description 删除所有数据项
 * @param echartsIndex echarts索引，从0开始 
 */
const deleteItemsAll = async (echartsIndex: number) => {
  console.groupCollapsed('deleteItemsAll', echartsIndex);
  dataAbout.data[echartsIndex].data = [];
  dataAbout.data[echartsIndex].isDeleteItem = true;
  initEcharts();
  await nextTick();
  dataAbout.data[echartsIndex].isDeleteItem = false;
  console.groupEnd();
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

// 判断和组装首尾连接数据
const judgeAndPackageLinkData = (oneDataType?: OneDataType | OneDataType[]) => {
  if (!oneDataType) return oneDataType;
  if (Array.isArray(oneDataType)) {
    return oneDataType.map((item: OneDataType) => handleMultipleLinkData(item));
  } else {
    return handleMultipleLinkData(oneDataType);
  }
}

/**
 * @description 新增echart, id最大序号自增操作 --- 导出
 */
const addEchart = async (oneDataType?: OneDataType | OneDataType[]) => {
  oneDataType = judgeAndPackageLinkData(oneDataType);
  dataAbout.maxEchartsIdSeq++;
  const id = 'echart' + dataAbout.maxEchartsIdSeq;
  let dataAll: OneDataType[] = []; // 所有数据
  if (!oneDataType) {
    // 1.空数据，默认新增一个line
    oneDataType = setOneData('', 'line', [], '', []) as OneDataType;
    dataAll = [{ ...oneDataType }];
  } else if (Array.isArray(oneDataType)) {
    // 2.新增多个echarts，数组
    const data: OneDataType[] = [];
    oneDataType.forEach((item: OneDataType) => {
      data.push({ ...item });
    });
    dataAll = data;
  } else {
    // 3.新增单个echarts，如果没有seriesData，则默认新增一个line
    if (!oneDataType.seriesData || oneDataType.seriesData.length < 1) {
      oneDataType = setOneData(oneDataType.name, 'line', [], oneDataType.customData, []);
    }
    dataAll = [{ ...oneDataType }];
  }
  const { theme, graphics } = addEchartJudgeLinkage();
  const obj = { id, data: dataAll, theme, graphics };
  dataAbout.data.push(obj);
  judgeOverEchartsMaxCountHandle();
  Extension.setStyleProperty(props, dataAbout.data.length);
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
 * @description 根据索引删除echarts，发送给父组件
 * @param index 索引
 */
const deleteEchart = async (id: string) => {
  const index = dataAbout.data.findIndex((item: SeriesIdDataType) => item.id === id);
  dataAbout.data.splice(index, 1);
  Extension.setStyleProperty(props, dataAbout.data.length);
  allUpdateHandleCommon();
  await nextTick();
  emit('delete-echart', { id, remainCount: dataAbout.data.length } as DeleteEchartType);
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
    isExist = echart.data.some((item: OneDataType) => item.name === oneData.name && JSON.stringify(item.customData) === JSON.stringify(oneData.customData));
    return isExist;
  }
  oneDataType = judgeAndPackageLinkData(oneDataType) as OneDataType;
  if (dataAbout.data.length < 1) {
    ElMessage.warning('请先添加1个echart图表！');
    return;
  }
  dataAbout.currentHandleChartIds = [id];
  const index = dataAbout.data.findIndex((item: SeriesIdDataType) => item.id === id);
  if (judgeSeriesExist(dataAbout.data[index], oneDataType)) {
    ElMessage.warning('该子项已存在，请选择其他子项！');
    return;
  }
  //注意：这里有两种空数据情况
  // 情况1是初始化了3个空echarts，每个echarts数据数组中有一个数据对象，除了type属性基本上都是空数据
  // 情况2是初始化了3个空echarts，每个echarts数据数组中有一个数据对象，有name等数据，只是seriesData数据为空
  if (dataAbout.data[index].data.length > 0 && dataAbout.data[index].data[0].name === '') {
    // 情况1，直接赋值
    dataAbout.data[index].data[0] = oneDataType;
  } else {
    // 情况2，新增数据; 其他为正常新增
    dataAbout.data[index].data.push(oneDataType);
  }
  await nextTick();
  initEcharts();
  await nextTick();
  dataAbout.currentHandleChartIds = [''];
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
const judgeEchartInstance = (dataEcharts: SeriesIdDataType) => {
  const id = dataEcharts.id;
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
      if (currentData.data.length === 0) {
        // 如果数据全被删除，则新增一个空数据进行占位
        currentData.data = [setOneData('', 'line', [], '', []) as OneDataType];
      }
      needHandle = true;
    } else { // 实例存在且不是删除子项item操作，判断是否需要更新
      dataAbout.currentHandleChartIds.includes(id) && (needHandle = true); // 判断当前实例是否在操作
      // 当前还未渲染
      currentShowYCount < lastMaxShowYCount && (needHandle = true); // 当前小于上次渲染后的最大值，则需要更新
      currentShowYCount < currentMaxShowYCount && (needHandle = true); // 当前小于实时数据中的最大值，则需要更新 
      currentData.data.length === 0 && (needHandle = false); // 空数据，不需要渲染
    }
    if ((dataAbout.isAllUpdate || (dataAbout.currentHandleChartIds.includes(id) && dataEcharts.data.length === 1))
      && dataEcharts.data[0].visualMapSeries) {
      // 在初始化时，新增了一个空数据进行占位，当后续有数据时，需要先销毁实例，然后重新初始化实例
      // 注：这里有两种情况，首先第一个数据中visualMapSeries必须存在
      // 情况1：整体更新时，传入了视觉映射数据，则需要重新渲染实例
      // 情况2：拖入数据时，传入了视觉映射数据，如果当前echarts实例中只有一条数据，则需要重新渲染实例
      myChart.dispose();
      myChart = echarts.init(element, dataEcharts.theme); // 切换主题时，需要重新初始化实例
    }
    if (dataAbout.isSwitchingTheme) {
      // 切换主题时，需要先销毁实例，然后重新初始化实例（注意这里必须要dispose实例，clear实例不能清除主题样式）
      const currentTheme = dataEcharts.theme;
      if (props.isLinkage || (!props.isLinkage && dataAbout.currentHandleChartIds.includes(id))) {
        // 联动模式下，处理所有图表；非联动模式下，只处理当前实例的图表
        myChart.dispose();
        myChart = echarts.init(element, currentTheme); // 切换主题时，需要重新初始化实例
      }
    }
    // 移除监听 restore 事件
    myChart.off('restore');
    // 监听 restore 事件
    myChart.on('restore', () => {
      // myChart.resize(); // 直接使用resize，会有问题：只能显示第一个series，其他series不能出现
      // 这里必须要使用异步，否则会出现死循环
      Promise.resolve().then(() => {
        dataAbout.restoreClickBool = true;
        initEcharts();
      });
    });
  } else { // 实例不存在
    needHandle = true;
    myChart = echarts.init(element, dataEcharts.theme);
  }

  // 监听 restore 按钮是否触发点击 ---> 原因：解决点击restore按钮后，只有最后一个图表显示，其他图表不显示的问题
  dataAbout.restoreClickBool && (needHandle = true);
  // 监听是否全部更新操作 --- 原因：解决点击restore按钮后，只有最后一次操作的图表数据更新，其他图表实例没有变化被过滤掉导致数据不更新的问题
  dataAbout.isAllUpdate && (needHandle = true);
  console.log('needHandle', needHandle);
  console.groupEnd();
  return { myChart, needHandle };
}

/**
 * @description 根据option数据，做一些其他地方的额外处理
 * @param option echarts option
 */
const extraHandleByOption = (option: EChartsOption) => {
  /* 根据option中toolbox的feature数量，给拖拽组件设置右偏移量 --- start */
  const toolbox = option.toolbox as ToolboxComponentOption;
  let size = 0;
  const feature = toolbox.feature;
  if (!feature) return;
  for (const key in feature) {
    if (!feature.hasOwnProperty(key)) continue;
    if (!(feature[key]?.show)) continue;
    size = key === 'dataZoom' ? size + 2 : size + 1;  // dataZoom是两个图标
  }
  const element = document.querySelector('.main-container') as HTMLElement;
  element.style.setProperty('--toolbox-size', size.toString());
  /* 根据option中toolbox的feature数量，给拖拽组件设置右偏移量 --- end */
}

// 容器大小变化全部更新操作，使用防抖函数，只处理最后一次操作
const containerResizeFn = useDebounceFn(() => {
  allUpdateHandleCommon();
}, 300);

/**
 * @description 初始化单个echarts
 * @param dataArray 数据数组
 * @returns EChartsType
 */
const initOneEcharts = (dataArray: SeriesIdDataType) => {
  console.groupCollapsed('initOneEcharts', dataArray.id);
  const { myChart, needHandle } = judgeEchartInstance(dataArray);
  if (!needHandle) { // 不需要操作
    myChart.resize();
    return myChart;
  }
  const seriesAllData: SeriesOptionType[] = [];
  dataArray.data.forEach((item: OneDataType) => {
    item.seriesData.forEach((point: Array<number | string>) => point[0] += ''); // 解决数据类型问题，将数字类型转为字符串类型
    seriesAllData.push({
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
      seriesLinkMode: item.seriesLink?.isLinkMode,
    });
  });
  const echartsLinkageModel = getEchartsLikageModel(seriesAllData, dataArray.theme);
  console.log('数据', dataArray.data);
  // 各种处理
  echartsLinkageModel.setMyDeleteButton((e: any) => deleteEchart(dataArray.id))
    .setSaveAsImageClickEvent((e: any) => saveAsImage(e, dataArray.id))
    .setMyThemeButtonClickEvent((e: any) => switchEchartsTheme(e, dataArray.id))
    .setMyExcelViewClickEvent((e: any) => setExcelView(e, dataArray.id))
    .setCustomSeriesMarkLine(dataArray.data)
    .setLanguage(props.language.toLocaleLowerCase() === 'zh-cn' ? 'zh-cn' : 'en') // 设置语言
    .setFontSizeAndMoreAuto(computerEchartsHeight(), props.useGraphicLocation) // 设置字体大小等自适应
  props.gridAlign && echartsLinkageModel.setGridLeftAlign(computerMaxShowYCount()) // 设置多echarts图表是否对齐
  echartsLinkageModel.setBackgroundColor('transparent') // 在echarts中设置透明，在父级设置背景色
  const option: EChartsOption = echartsLinkageModel.getResultOption();
  myChart.setOption(option);
  extraHandleByOption(option); // 获取option数据，用于其他一些额外操作
  // const xAxisData = JSON.parse(JSON.stringify(echartsLinkageModel.getXAxisData()));
  dataArray.xAxisdata = echartsLinkageModel.getXAxisData() as string[];
  myChart.on('datazoom', (params: any) => datazoomEvent(dataArray.graphics, dataArray.id, (dataArray.xAxisdata as string[]), params));
  console.log('option', option);
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
const computerEchartsHeight = () => {
  const height = Extension.computerEchartsHeight(props, dataAbout.data.length);
  // console.log('height', height);
  setDragPosition(height);
  return height;
}

/**
 * @description 根据echarts实例容器的高度，设置拖拽legend图例的位置和字体大小
 * @param height echarts高度
 */
const setDragPosition = (height: number) => {
  const { top, fontSize } = Extension.setDragPosition(height);
  dataAbout.drag.top = top;
  dataAbout.drag.fontSize = fontSize;
}

// 初始化空白echarts
const initEmptyEcharts = (count: number) => {
  if (!count || count < 1) return;
  for (let i = 0; i < count; i++) {
    addEchart();
  }
}

// 初始化echarts
const initEcharts = async () => {
  // 基于准备好的dom，初始化echarts图表
  disposeEcharts(); // 清除之前的分组实例
  const usedGroupNames: string[] = []; // 已使用的组名
  dataAbout.data.forEach((item: SeriesIdDataType, index: number) => {
    const myChart = initOneEcharts(item);
    // 给echarts实例分组，并且记录已使用的组名
    const groupName = Extension.getGroupNameByChartSeq(index, props.groups, dataAbout.groupsName);
    myChart.group = groupName;
    !usedGroupNames.includes(groupName) && usedGroupNames.push(groupName);
  });
  props.useGraphicLocation && emitGraphicLocation(); // 初始化时发送图形位置信息
  dataAbout.restoreClickBool = false;
  dataAbout.currentMaxShowYCount = computerMaxShowYCount(); // 记录当前显示的echarts中y轴数量的最大值
  props.isLinkage && echartsConnect(usedGroupNames); // 联动
}

// 初始化组名数据
const initGroupData = () => {
  dataAbout.groupsName = Extension.initGroupData(props.groups);
  dataAbout.groupDefault = Extension.GROUP_DEFAULT;
}

// echarts分组连接
const echartsConnect = (usedGroupNames: string[]) => {
  usedGroupNames.forEach((groupName: string) => {
    echarts.connect(groupName);
  });
}

// echarts解除分组连接
const echartsDisConnect = (usedGroupNames: string[]) => {
  usedGroupNames.forEach((groupName: string) => {
    echarts.disconnect(groupName);
  });
}

// 清除echarts分组实例
const disposeEcharts = () => {
  dataAbout.data.forEach((item: SeriesIdDataType) => {
    const element: HTMLElement = document.getElementById(item.id) as HTMLElement;
    const echartsInstance = echarts.getInstanceByDom(element) as EChartsType;
    if (echartsInstance) {
      // 实例存在，则释放实例
      echartsInstance.dispose();
    }
  });
}

/**
 * @description 监听datazoom事件，计算当前实例的图形位置信息，赋值给其他实例，并且触发更新
 * 联动模式下：datazoom事件会在所有图表中触发，所以这里只计算第一个实例的图形，然后赋值给其他实例
 * 非联动模式下：只处理当前实例的图形
 * @param graphicLocation 图形位置信息
 * @param currentEchartsId 当前实例id
 * @param xAxisData x轴数组数据
 */
const datazoomEvent = (graphicLocation: GraphicLocationInfoType[] | undefined, currentEchartsId: string, xAxisData: string[], params: any) => {
  // console.log('datazoomEvent', graphicLocation, currentEchartsId, xAxisData);
  // console.log('datazoomEvent', params.batch[0].startValue, params.batch[0].endValue); // 这里可以获取当前实例的datazoom范围
  if (props.isLinkage && (dataAbout.data[0].id !== currentEchartsId)) return; // 联动模式下，只处理计算第一个实例的图形
  if (animating || !graphicLocation) return; // 防止动画过程中重复触发
  animating = true;
  requestAnimationFrame(() => {
    // 联动模式下，datazoom事件会在所有图表中触发，所以这里只计算第一个实例的图形，然后赋值给其他实例
    const element: HTMLElement = document.getElementById(currentEchartsId) as HTMLElement;
    let myChart: EChartsType = echarts.getInstanceByDom(element) as EChartsType;
    const datazoomGraphic = Extension.computerDatazoomGraphic(myChart, graphicLocation, xAxisData);
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
          const seq = notDragGraphic.xAxisSeq;
          notDragGraphic.xAxisX = item.data[0].seriesData[seq][0].toString();
        }
      });
      setOptionGraphic(myChart, [graphicLocation, notDragGraphic]);
    });
    emitGraphicLocation();
    animating = false;
  });
};

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

// 将初始化标识设置为false
const setInitFlag = async () => {
  await nextTick();
  initFlag = false;
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
        seriesData: JSON.parse(JSON.stringify(series.seriesData)), // 暴露缓存数据，原因是外部可能还会使用缓存数据进行渲染
      })
    });
  });
  return res;
}

// 获取所有echarts实例或者某个echarts实例各个系列的标签信息，默认返回所有echarts实例的标签信息 --- 导出
const getAllSeriesTagInfo = (echartsId: string = 'all'): Array<AppointEchartsTagType> => {
  const res: Array<{ id: string, series: Array<SeriesTagType> }> = [];
  dataAbout.data.forEach((echart: SeriesIdDataType) => {
    if (echartsId !== 'all' && echartsId !== echart.id) return; // 不是指定实例，跳过
    const oneEchartInfo: { id: string, series: Array<SeriesTagType> } = { id: echart.id, series: [] };
    echart.data.forEach((series: OneDataType) => {
      oneEchartInfo.series.push({
        name: series.name,
        customData: series.customData,
        dataType: series.dataType,
        seriesData: JSON.parse(JSON.stringify(series.seriesData)),
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
  Extension.setStyleProperty(props, dataAbout.data.length);
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

/**
 * 导出
 * @description 更新单个echarts的visualMap数据，自定义每个series中不同报警区间，默认报警色为红色；如果未指定seriesName则更新指定echarts的所有series的visualMap数据
 * @param id echarts实例id
 * @param visualMapData 视觉映射数据
 */
const updateOneEchartsVisualMapSeries = async (id: string, visualMapData: VisualMapSeriesType[] | VisualMapSeriesType) => {

  // 定义一个内部函数，更新单个系列的visualMap数据
  function updateOneSeries(echart: SeriesIdDataType, visualMapSeries: VisualMapSeriesType) {
    const seriesName = visualMapSeries.seriesName;
    echart.data.forEach((series: OneDataType) => {
      if (series.dataType === 'switch') return; // 跳过开关量
      if (seriesName) {
        // 指定系列名称，更新所指定的系列
        if (series.name === seriesName) {
          series.visualMapSeries && (series.visualMapSeries = visualMapSeries);
        }
      } else {
        // 未指定系列名称，更新所有系列
        series.visualMapSeries && (series.visualMapSeries = visualMapSeries);
      }
    });
  }

  const echart: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
  if (Array.isArray(visualMapData)) {
    // 传入多个系列数据
    if (visualMapData.length === 0) return;
    visualMapData.forEach((item: VisualMapSeriesType) => updateOneSeries(echart, item));
  } else {
    // 传入单个系列数据
    if (Object.keys(visualMapData).length === 0) return;
    updateOneSeries(echart, visualMapData);
  }
  dataAbout.currentHandleChartIds = [id];
  await nextTick();
  initEcharts();
}

// 判断标签是否一致，需要考虑customData
const judgeTagIsSame = (tag1: SeriesTagType, tag2: OneDataType) => {
  return tag1.name === tag2.name && JSON.stringify(tag1.customData) === JSON.stringify(tag2.customData);
}

/**
 * @description 更新单个图表数据的公共方法
 * @param echart 单个echarts图表数据
 * @param updateSeries 单个echarts图表的更新数据集合 
 * @param isLink 首尾相连模式，true：首尾相连，false：非首尾相连
 */
const updateOneEchartCommon = (echart: SeriesIdDataType, updateSeries: Array<SeriesTagType>, isLink: boolean) => {
  if (isLink) {
    // 首尾相连模式
    echart.data.forEach((series: OneDataType, index: number) => {
      const seriesTag: SeriesTagType = updateSeries.filter(item => judgeTagIsSame(item, series))[0];
      if (!seriesTag) return; // 未找到匹配的标签，跳过
      let linkData: LinkDataType[] = JSON.parse(JSON.stringify(seriesTag.seriesLink?.linkData as LinkDataType[]));
      if (linkData.length === 0) {
        // 无关联数据，置空直接返回
        series.seriesData = [];
        series.markLineArray = [];
        return;
      } else {
        const preLength = linkData.length;
        // 处理关联数据linkData中data存在空数据的情况
        linkData = linkData.filter(item => item.data.length > 0); // 过滤掉空数据
        const nextLength = linkData.length;
        if (nextLength === 0) {
          // 如果全是空数据，将seriesData置空，并返回
          series.seriesData = [];
          series.markLineArray = [];
          return;
        }
      }
      const { packageData, markLineData } = linkToSeries(linkData);
      series.seriesData = packageData;
      series.markLineArray = packageMarkLineOnLink(seriesTag.seriesLink!.linkData, linkData, markLineData);
      seriesTag.visualMapSeries && (series.visualMapSeries = seriesTag.visualMapSeries);
    });
  } else {
    // 非首尾相连模式
    echart.data.forEach((series: OneDataType, index: number) => {
      const seriesTag: SeriesTagType = updateSeries.filter(item => judgeTagIsSame(item, series))[0];
      if (!seriesTag) return; // 未找到匹配的标签，跳过
      const newSeriesData = seriesTag.seriesData;
      newSeriesData && (series.seriesData = newSeriesData);
      seriesTag.visualMapSeries && (series.visualMapSeries = seriesTag.visualMapSeries);
    });
  }
}

// 更新单个或者多个echarts图表 //todo: 需要测试
const updateOneOrMoreEcharts = async (updateData: AppointEchartsTagType | Array<AppointEchartsTagType>) => {
  if (Array.isArray(updateData)) {
    // 数组，更新多个echarts图表
    dataAbout.currentHandleChartIds = [];
    updateData.forEach((item: AppointEchartsTagType) => {
      dataAbout.data.forEach((echart: SeriesIdDataType) => {
        if (item.id !== echart.id) return;
        dataAbout.currentHandleChartIds.push(echart.id);
        const isLink = item.series.some((item: SeriesTagType) => item.seriesLink?.isLinkMode);
        updateOneEchartCommon(echart, item.series, isLink);
      })
    });
  } else {
    const echart = dataAbout.data.filter((item: SeriesIdDataType) => item.id === updateData.id)[0];
    const isLink = updateData.series.some((item: SeriesTagType) => item.seriesLink?.isLinkMode);
    updateOneEchartCommon(echart, updateData.series, isLink);
    dataAbout.currentHandleChartIds = [updateData.id];
  }
  try {
    await nextTick();
    await initEcharts();;
    return true;
  } catch (e: any) {
    console.log(e);
    return false;
  }
}

// 传入所有显示子项数据，更新所有echarts --- 导出
const updateAllEcharts = async (newAllSeriesdata: Array<SeriesTagType>) => {
  const isLink = newAllSeriesdata.some((item: SeriesTagType) => item.seriesLink?.isLinkMode); // 是否是首尾相连模式
  dataAbout.data.forEach((echart: SeriesIdDataType) => {
    updateOneEchartCommon(echart, newAllSeriesdata, isLink);
  });
  try {
    await allUpdateHandleCommon();
    return true;
  } catch (e: any) {
    console.log(e);
    return false;
  }
}

// 简单更新echarts数据，只更新seriesData --- 导出
const updateSimpleEcharts = async (newAllSeriesdata: Array<SeriesTagType>) => {
  // 判断是否更新当前echarts实例的series
  function judgeUpdateSeries(echart: SeriesIdDataType, echartsInstance: echarts.ECharts) {
    // 1.判断实例是否存在
    if (!echartsInstance) return false; // 实例不存在，直接返回false
    // 2.遍历所有系列，判断是否有交集
    const haveIntersection = echart.data.some((series: OneDataType) => {
      const seriesTag: SeriesTagType = newAllSeriesdata.filter(item => judgeTagIsSame(item, series))[0];
      if (!seriesTag) return false; // 未找到匹配的标签，跳过
      return true;
    });
    if (!haveIntersection) return false; // 无交集，直接返回false
    return true;
  }

  const isLink = newAllSeriesdata.some((item: SeriesTagType) => item.seriesLink?.isLinkMode); // 是否是首尾相连模式
  dataAbout.data.forEach((echart: SeriesIdDataType) => {
    updateOneEchartCommon(echart, newAllSeriesdata, isLink);
  });
  try {
    await nextTick();
    let updateCount = 0;
    dataAbout.data.forEach((echart: SeriesIdDataType) => {
      const element: HTMLElement = document.getElementById(echart.id) as HTMLElement;
      const echartsInstance = echarts.getInstanceByDom(element) as EChartsType;
      const isUpdate = judgeUpdateSeries(echart, echartsInstance);
      if (!isUpdate) return; // 无需更新，直接返回
      // 赋值给实例，并且触发更新 -- 注意：这里的X轴数据需要转换为字符串，否则会导致echarts渲染异常
      const xAxisData = echart.data[0].seriesData.map(item => item[0] + '');
      const seriesData = echart.data.map((series: OneDataType) => ({data: series.seriesData.map(item => [item[0] + '', item[1]])}));
      // console.log('updateSimpleEcharts', echart.id, xAxisData, seriesData);
      echartsInstance.setOption({
        xAxis: [{
          data: xAxisData,
        }],
        series: seriesData,
      });
      updateCount++;
    });
    console.log('updateSimpleEcharts数量：', updateCount);
    return true;
  } catch (e: any) {
    console.log(e);
    return false;
  }
}

/**
 * @description 全部更新处理的公共方法
 */
const allUpdateHandleCommon = async () => {
  await nextTick(); // 作用：防止在调用方法之前修改了dataAbout.data，而dataAbout.data是响应式的，又会导致画面重新渲染
  dataAbout.isAllUpdate = true; // 标记全部更新
  initEcharts();
  await nextTick();
  computerEchartsHeight();
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
        series.seriesData.length > LIMIT_COUNT && series.seriesData.shift() && (limitFlag = true); // 限制最大数据量，超出则删除最前面的数据
      });
    });
    let startIndex = 0; // 删除的索引位置，长度分析时是1，其他是0
    echart.xAxisdata?.push(...addXs);
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

// 处理前后关联数据，多条关联数据进行首尾相连操作 --- 导出
const handleMultipleLinkData = (primaryData: OneDataType) => {
  let linkData: LinkDataType[] = []; // 处理后的数据
  if (!primaryData.seriesLink?.isLinkMode) {
    // 非首尾相连模式，直接返回
    return primaryData;
  } else if (primaryData.seriesLink.linkData.length === 0) {
    // 首尾相连模式, 但是没有关联数据，置空后直接返回
    primaryData.seriesData = [];
    primaryData.markLineArray = [];
    return primaryData;
  } else {
    // 处理关联数据linkData中data存在空数据的情况
    linkData = primaryData.seriesLink.linkData.filter(item => item.data.length > 0); // 过滤掉空数据 
    if (linkData.length === 0) {
      // 如果全是空数据，将seriesData置空，并返回
      primaryData.seriesData = [];
      primaryData.markLineArray = [];
      return primaryData;
    }
  }
  const { packageData, markLineData } = linkToSeries(linkData);
  primaryData.seriesData = packageData;
  primaryData.markLineArray = packageMarkLineOnLink(primaryData.seriesLink.linkData, linkData, markLineData);
  primaryData.seriesLink.isLinkMode = true;
  return primaryData;
}

/**
 * @description 在多卷关联模式下，组装MarkLine数据
 * @param linkDataPre 原始seriesLink下的linkData数据
 * @param linkDataPost 处理筛选后的seriesLink下的linkData数据 
 * @param markLineData 标记线数据 
 */
const packageMarkLineOnLink = (linkDataPre: LinkDataType[], linkDataPost: LinkDataType[], markLineData: Array<any>) => {
  console.log('packageMarkLineOnLink', linkDataPre, linkDataPost, markLineData);
  if (linkDataPre.length === 1 && linkDataPost.length === 1) {
    // 首尾相连模式下，只有一个关联数据时，并且这个关联数据中内部的data不为空，则不显示markLine
    markLineData = [];
  }
  return markLineData;
}

// 首尾相连数据转series数据
const linkToSeries = (linkData: LinkDataType[]) => {
  const primaryData = JSON.parse(JSON.stringify(linkData)); // 深拷贝数据，避免修改原数据导致相互关联
  let arrays: Array<SeriesDataType> = []; // 三维数组，所有连接线的数据
  const markLineData: Array<any> = []; // 标记线数据
  primaryData.forEach((item: LinkDataType, index: number) => {
    const label = item.label || 'X' + index.toString().padStart(3, '0');
    item.data.forEach((data: Array<number | string>) => data[0] = label + '--' + data[0]);
    // packageData = packageData.concat(item.data);
    arrays.push(item.data);
    markLineData.push({
      xAxis: item.data[item.data.length - 1][0],
      label: { show: item.label ? true : false, position: 'insideMiddleTop', formatter: item.label }
    });
  });
  let packageData: SeriesDataType = arrays.reduce((acc, curr) => acc.concat(curr), []);
  return { packageData, markLineData };
}

// 下载包含所有echarts实例的图片 --- 导出
const downloadAllEchartsImg = () => {
  if (!props.isEchartsHeightChange && dataAbout.data.length > props.echartsHeightFixedCount) {
    // 高度固定模式时，当echarts数量大于固定数量出现滚动条时，需要调整容器高度和宽度以适应打印
    FileUtil.htmlElementToImage('.main-container', 'echarts-linkage.png', (element: HTMLElement) => {
      element.style.setProperty('--height', element.scrollHeight + 'px'); // 将滚动条高度加到高度上
      element.style.width = element.clientWidth - 10 + 'px'; // 减去滚动条宽度
      element.classList.add('hide-scroll'); // 隐藏滚动条
    }, (element: HTMLElement) => {
      // 下载完成后，恢复样式
      element.style.setProperty('--height', '100%');
      element.style.width = element.clientWidth + 10 + 'px';
      element.classList.remove('hide-scroll');
    });
    return;
  }
  FileUtil.htmlElementToImage('.main-container', 'echarts-linkage.png');
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

// 切换所有echarts图表主题 --- 导出
const changeAllEchartsTheme = (theme: ThemeType) => {
  dataAbout.data.forEach((item: SeriesIdDataType) => item.theme = theme);
  allUpdateHandleCommon();
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
    dataAbout.currentHandleChartIds = [id];
    await nextTick();
    initEcharts();
  }
  await nextTick();
  dataAbout.isSwitchingTheme = false;
}

// echarts上的excel 视窗事件
const setExcelView = (e: any, id: string) => {
  // excel数据视图点击事件发送给外部，外部处理之后的回调函数
  function excelViewCallback(excelView: excelViewType) {
    console.groupCollapsed('excelViewCallback');
    console.time('excelViewCallback');
    dialogVisible.value = true;
    const headXname = excelView.headXname;
    const preAdd = excelView.preAdd;
    const postAdd = excelView.postAdd;
    preAdd && Extension.isAutoPropertyTypeConsistent(preAdd, 'value'); // 检查前置数据value属性类型是否一致
    postAdd && Extension.isAutoPropertyTypeConsistent(postAdd, 'value'); // 检查后置数据value属性类型是否一致
    let head: SheetHeadType[] = []; // 表头
    let body: Array<any> = []; // 表体
    const itemNameArray = data.data.map((item: OneDataType, index: number): SheetHeadType => ({ 'label': item.name, 'prop': 'prop' + index }));
    head = [...itemNameArray];
    if (params.seriesLink) { // 考虑到尽管是多卷关联模式，但有些系列只有name，并没有数据，因此需要用params.seriesLink进行判断
      // --多卷关联--
      // 1.新增两列表头数据，一个是卷号列（关联的label），一个是X轴列
      const primaryKey = 'primary'; // 数据主键
      const mainProp = 'auto'; // 主数据列
      head.unshift(...[{ 'label': '自定义', 'prop': mainProp }, { 'label': headXname, 'prop': 'xProp' }]); // 表头，多卷关联时，最前面增加卷号列和X轴列
      // 2.第一次组装body数据
      const res = packageExcelViewBody(head, data, primaryKey, (item: string) => ({ [primaryKey]: item, 'auto': item.split('--')[0], 'xProp': item.split('--')[1] }))
      // 3.处理传入的前置数据
      if (preAdd && preAdd!.length > 0) {
        // 3.1 提取前置数据，并且加入到表头数据中
        const preAddHead = preAdd.map((item: excelViewHeadType, index: number) => {
          if (item.isPrimaryKey) {
            return { 'label': item.name, 'prop': mainProp }
          } else {
            return { 'label': item.name, 'prop': 'preAdd' + index }
          }
        });
        res.head.shift(); // 先删除第一列, 是为了保持和传入的顺序一致，这样外部就可以自定义列的顺序了
        res.head.unshift(...preAddHead); // 表头前面增加自定义列
        // 3.2 提取主数据数组和其他数据数组
        let mainDataArray: (string | number)[] = []; // 主数据数组
        let otherDataArray: Array<{ value: any, prop: string }> = []; // 其他数据数组
        preAdd.forEach((item: excelViewHeadType, index: number) => {
          if (Array.isArray(item.value)) {
            if (item.isPrimaryKey) {
              mainDataArray = item.value;
            } else {
              otherDataArray.push({ value: item.value, 'prop': 'preAdd' + index })
            }
          } else {
            if (item.isPrimaryKey) {
              mainDataArray.push(item.value);
            } else {
              otherDataArray.push({ value: [item.value], 'prop': 'preAdd' + index })
            }
          }
        });
        // 3.3 组装数据，用于后续给body添加属性数据 { main1: { other1: value, other2: value }, main2: { other1: value, other2: value }
        const packageData: { [key: string]: { [prop: string]: any } } = {};
        mainDataArray.forEach((item: any, index: number) => {
          const key = item + ''; // 防止key为数字时报错
          packageData[key] = {} as any;
          otherDataArray.forEach((item1: any) => {
            packageData[key][item1.prop] = item1.value[index];
          });
        });
        // console.log('packageData', packageData);
        // 3.4 遍历body，给对象添加其他属性数据
        res.body.forEach((item: any) => {
          const mainKey = item[mainProp];
          const addDataObj = packageData[mainKey];
          if (!addDataObj) return;
          for (const key in addDataObj) {
            if (Object.prototype.hasOwnProperty.call(addDataObj, key)) {
              item[key] = addDataObj[key];
            }
          }
        });
      }
      // 4.处理传入的后置数据
      head = res.head;
      body = res.body;
    } else {
      // --非多卷关联--
      const primaryKey = 'xProp'; // 数据主键
      head.unshift(...[{ 'label': headXname, 'prop': 'xProp' }]); // 表头前面增加X轴列
      const res = packageExcelViewBody(head, data, primaryKey, (item: string) => ({ [primaryKey]: item }));
      if (preAdd && preAdd!.length > 0) {
        res.head.unshift(...preAdd.map((item: excelViewHeadType, index: number) => ({ 'label': item.name, 'prop': 'preAdd' + index }))); // 表头前面增加自定义列
        res.body.forEach((item: any) => {
          preAdd.forEach((item1: excelViewHeadType, index: number) => {
            item['preAdd' + index] = item1.value;
          });
        });
      }
      if (postAdd && postAdd!.length > 0) {
        res.head.push(...postAdd.map((item: excelViewHeadType, index: number) => ({ 'label': item.name, 'prop': 'postAdd' + index }))); // 表头后面增加自定义列
        res.body.forEach((item: any) => {
          postAdd.forEach((item1: excelViewHeadType, index: number) => {
            item['postAdd' + index] = item1.value;
          });
        });
      }
      head = res.head;
      body = res.body;
    }
    console.log('head', head);
    console.log('body', body);
    sheetAbout.head = head;
    sheetAbout.body = body;
    console.log('计算结束---开启子画面');
    console.timeEnd('excelViewCallback');
    console.groupEnd();
  }

  // 组装body数据, primaryKey为数据主键
  function packageExcelViewBody(head: SheetHeadType[], data: SeriesIdDataType, primaryKey: string, callBack: Function) {
    const body = data.xAxisdata?.map((item: string, index: number) => callBack(item)) || [];
    const headProps = head.map(item => item.prop);
    const series = data.data.map((item: OneDataType) => {
      const key = head.find(item1 => item1.label === item.name)?.prop;
      return { 'prop': key, 'value': item.seriesData };
    });
    body.forEach((item: any, index: number) => {
      series.forEach((item1: any) => {
        item[item1.prop] = item1.value[index][1];
      });
    });
    return { head, body };
  }

  // console.log('setExcelView', id);
  const data: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
  // 筛选出多卷关联的系列数据，然后取第一个发送给外部
  const seriesData = data.data.filter((item: OneDataType) => item.seriesLink?.isLinkMode && item.seriesLink!.linkData.length > 0);
  const params: ListenerExcelViewType = { id: id, callback: excelViewCallback };
  if (seriesData.length > 0) {
    params.seriesLink = JSON.parse(JSON.stringify(seriesData[0].seriesLink)); // 深拷贝数据，避免修改原数据导致相互关联
    params.seriesLink?.linkData.forEach((item: LinkDataType) => item.data = []); // 将关联的series数据置空，减少数据量
  }
  emit('listener-excel-view', params);
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
  updateOneOrMoreEcharts,
  updateAllEcharts,
  updateSimpleEcharts,
  clearAllEchartsData,
  replaceAllEchartsData,
  downloadAllEchartsImg,
  realTimeUpdate,
  updateOneEchartsVisualMapSeries,
  handleMultipleLinkData,
  changeAllEchartsTheme,
};
defineExpose(exposedMethods);

// 监听dataAbout.data的变化，重新计算maxEchartsIdSeq
watch(() => dataAbout.data.length, () => {
  getMaxId();
});

onBeforeMount(() => {
  initGroupData();
});

onMounted(() => {
  initLisener();
  props.emptyEchartCount && initEmptyEcharts(props.emptyEchartCount);
  setInitFlag();
});

onBeforeUnmount(() => {
  removeLisener();
  disposeEcharts();
});
</script>

<style scoped lang='less'>
@import '@/assets/styles/mixin.less';
@import '@/assets/styles/common.less';

.echarts-linkage-container {
  min-height: 20vh;
  max-height: 100vh;
  height: 100%;
  width: 100%;
  --padding: 10px;
  padding: var(--padding) var(--padding) 0;

  .main-container {
    /* --height用于打印时修改高度 */
    --height: 100%;
    height: var(--height);
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    padding-bottom: var(--padding);
    .flex-row(center);
    flex-wrap: wrap;
    align-content: flex-start;
    gap: var(--gap);
    --gap: 10px;
    --count: 0;
    --rows: 0;
    --item-width: 100%;
    /* --main-container-height用于缓存main-container的高度 */
    --main-container-height: 100%;
    --toolbox-size: 6;

    .echarts-container {
      height: calc((var(--main-container-height) - var(--gap) * (var(--rows) - 1)) / var(--rows));
      width: var(--item-width);
      .border-radius(10px, #ccc);
      position: relative;

      .drag-container {
        position: absolute;
        top: var(--drag-top);
        right: calc(var(--toolbox-size) * 25px);
        padding: 2px;
        z-index: 20;
      }
    }
  }
}

/* 隐藏滚动条 */
.main-container.hide-scroll::-webkit-scrollbar {
  display: none;
}

/* 确保内容可滚动 */
.scrollable {
  overflow-y: scroll;
  /* 对于垂直滚动 */
}
</style>