<template>
  <div class='echarts-linkage-container'>
    <!-- 主容器 -->
    <div class="main-container" :class="{ 'hide-scroll': isEchartsHeightChange }">
      <div v-for="(item, index) in dataAbout.data" :key="item.id + '-' + index" class="echarts-container"
        :style="{ 'background-color': computedBackgroundColor(item), '--drag-top': dataAbout.drag.top + 'px' }">
        <!-- 图表容器 -->
        <div :id="item.id" class="h-100% w-100%"></div>
        <!-- 拖拽组件 -->
        <Drag v-if="useMergedLegend" :data="dragDataComputed(index)" :colors="echartsColors" :id="item.id"
          :group="item.id" :theme="item.theme" :item-font-size="dataAbout.drag.fontSize"
          @is-dragging="(isDragging) => dataAbout.drag.isDragging = isDragging"
          @update="(data) => dragUpdateHandle(data, index)"
          @delete-item="(data, number) => deleteItem(data, number, index)"
          @delete-item-column="(data, numbers) => deleteItemColumn(data, numbers, index)"
          @delete-items-all="deleteItemsAll(index)" />
        <!-- 自定义内容，不允许拖拽 -->
        <div class="custom-content" draggable="false" :id="item.id + '-custom-content'"></div>
      </div>
    </div>

    <!-- 数据视图子画面 -->
    <el-dialog v-model="sheetDialogVisible" title="数据视图">
      <MySheet :head="sheetAbout.head" :body="sheetAbout.body" />
    </el-dialog>
    <!-- Y轴区间设置子画面 -->
    <el-dialog v-model="yAxisLimitDialogVisible" title="Y轴区间设置" :width="yAxisLimitDialogWidth" draggable @closed="yAxisLimitDialogCancelHandle">
      <MyYAxisLimit :yAxisLimits="yAxisLimitsAbout" :dialogVisible="yAxisLimitDialogVisible"
        @cancel="yAxisLimitDialogCancelHandle" @confirm="yAxisLimitDialogConfirmHandle" />
    </el-dialog>
  </div>
</template>

<script setup lang='ts'>
import { ref, reactive, onMounted, nextTick, watch, onBeforeUnmount, onBeforeMount } from 'vue';
import 'element-plus/es/components/message/style/css';
import { ElMessage } from 'element-plus';
import echarts from "@/models/my-echarts/index";
import type { EChartsOption, ToolboxComponentOption, GridComponentOption, TooltipFormatterCallback, TooltipFormatterCallbackParams } from "@/models/my-echarts/index";
import { useDebounceFn } from "@vueuse/core";
import { EchartsLinkageModel, setMergedOptionTemplate } from "@/models/echarts-linkage-model/index";
import type { EchartsLinkageModelType, OmittedEchartsLinkageModelType, SeriesOptionType } from "@/models/echarts-linkage-model/type";
import { FileUtil } from "@/utils/index";
import type {
  ExposedMethods, OneDataType, SeriesIdDataType, DataAboutType, SeriesTagType,
  DropEchartType, DeleteEchartType, GraphicLocationInfoType, VisualMapSeriesType, LinkDataType,
  SeriesDataType, SegementType, AppointEchartsTagType, ListenerExcelViewType, excelViewType, ThemeType,
  ExtraTooltipDataItemType, SeriesClassType, EnlargeShrinkType, CustomContentHtmlType, LanguageType
} from './types/index';
import {
  SERIES_TYPE_DEFAULT, SERIES_TYPE_SWITCH,
  SERIES_CLASS_TYPE_DEFAULT, 
  THEME_DEFAULT, LANGUAGE_DEFAULT,
  THEME_DARK, THEME_LIGHT, THEME_COLOR,
  LANGUAGE_ZH_CN, LANGUAGE_EN_US,
  MODE_ENLARGE, MODE_SHRINK,
  USE_GRAPHIC_GROUP_DEFAULT
 } from './common';
import Drag from "@/components/drag/index.vue";
import { type DragItemType, type DragListDataType } from "@/components/drag/type/index";
import MySheet from "@/components/sheet/index.vue";
import MyYAxisLimit from "@/components/yAxisLimit/index.vue";
import { type SheetHeadType } from '@/components/sheet/type/index';
import type { YAxisLimitType } from '@/components/yAxisLimit/type';
import { setYAxisLimitsCache } from "@/components/yAxisLimit/store";
import { ObjUtil } from "@/utils/index";
import Extension from './extension';
import HandleGraph from './handleGraph';
import HandleEnlargeShrink from './handleEnlargeShrink';
import HandleExcel from './handleExcel';
import { ChartUtils } from '@/utils/chartUtils';
import { deepClone, shallowClone } from '@/utils/cloneUtils';

/**
 * @description 组件props类型
 * @property {number} [cols=1] - 列数
 * @property {number} [echartsMaxCount=7] - Echarts最大数量
 * @property {number} [emptyEchartCount] - 初始化空白echarts数量
 * @property {string[]} [echartsColors] - echarts颜色数组
 * @property {SegementType} [segment] - 标线分段数 
 * @property {LanguageType} [language='zh-cn'] - 语言
 * @property {boolean} [gridAlign=false] - 多echarts图表是否对齐
 * @property {string} [theme='light'] - 主题
 * @property {string} [background] - 背景色
 * @property {boolean} [isLinkage=true] - 是否联动, 默认为true
 * @property {boolean} [useMergedLegend=true] - 是否使用合并图例
 * @property {boolean} [useGraphicLocation=true] - 是否使用图形定位
 * @property {'all' | Array<number>} [useGraphicGroup='all'] - 在useGraphicLocation为true使用图形的基础下，确定哪些图表显示图形，all代表所有图表都使用图形；数组表示指定序号的图表显示图形（序号从1开始）
 * @property {boolean} [isEchartsHeightChange=true] - 是否根据数量，改变echarts的高度，默认true改变
 * @property {number} [echartsHeightFixedCount=3] - echarts高度固定数量，默认为3
 * @property {object} [extraOption] - 额外的echarts配置项，主要是grid、toolbox、xAxis等属性的合并；合并默认option，该优先级更高, 相同属性值进行合并, 不同属性值直接赋值
 * @property {Array<Array<number>>} [groups] - 分组属性，二维数组：第一维表示分组，第二维表示该分组下的chart序号（序号从1开始）
 * @property {boolean} [useYAxisLimitsCache=false] - 是否使用Y轴区间缓存，默认false不使用，为true时，使用Y轴区间缓存，存储所有图表的Y轴区间数据到浏览器本地缓存中
 */
export type PropsType = {
  cols?: number;
  echartsMaxCount?: number;
  emptyEchartCount?: number;
  echartsColors?: string[];
  segment?: SegementType;
  language?: LanguageType;
  gridAlign?: boolean, // 多echarts图表是否对齐
  theme?: ThemeType, // 主题
  background?: string, // 背景色
  isLinkage?: boolean, // 是否联动
  useMergedLegend?: boolean, // 是否使用合并图例
  useGraphicLocation?: boolean, // 是否使用图形定位
  useGraphicGroup?: typeof USE_GRAPHIC_GROUP_DEFAULT | Array<number>, // 确定哪些图表显示图形，all代表所有图表都使用图形
  isGraphicZoom?: boolean, // 图形跟随echarts缩放，默认是false，为true时，效果是echarts缩放后，图形定位的横坐标值也跟着缩放修改
  isEchartsHeightChange?: boolean, // 是否根据数量，改变echarts的高度
  echartsHeightFixedCount?: number, // echarts高度固定数量
  extraOption?: { [key: string]: any }, // 额外的echarts配置项，主要是grid、toolbox、xAxis等属性的合并
  groups?: Array<Array<number>>, // 分组属性，二维数组：第一维表示分组，第二维表示该分组下的chart序号（序号从1开始）
  useYAxisLimitsCache?: boolean, // 使用Y轴区间缓存，默认false不使用，为true时，使用Y轴区间缓存，存储所有图表的Y轴区间数据到浏览器本地缓存中
}

// 定义 props
const props = withDefaults(defineProps<PropsType>(), {
  cols: 1,
  echartsMaxCount: 7,
  language: LANGUAGE_DEFAULT,
  gridAlign: false,
  theme: THEME_DEFAULT,
  isLinkage: true, // 默认联动
  useMergedLegend: true, // 默认使用合并图例
  useGraphicLocation: false, // 默认不使用图形定位
  useGraphicGroup: USE_GRAPHIC_GROUP_DEFAULT, // 默认所有图表都使用图形
  isGraphicZoom: false, // 默认图形不跟随echarts缩放从而修改横坐标值
  isEchartsHeightChange: true, // 默认改变echarts的高度
  echartsHeightFixedCount: 3, // echarts高度固定数量
  useYAxisLimitsCache: false, // 默认不使用Y轴区间缓存
});

const sheetDialogVisible = ref(false); // 数据视窗是否显示
const yAxisLimitDialogVisible = ref(false); // Y轴区间视窗是否显示
const yAxisLimitDialogWidth = ref<number | string>(500); // Y轴区间设置子画面宽度
// 验证 props
ObjUtil.validateCols(props.cols, 'cols 必须是一个正整数');
// 递归合并自定义option
setMergedOptionTemplate(props.extraOption);
const emit = defineEmits([HandleGraph.LISTENER_GRAPHIC_LOCATION, 'drop-echart', 'delete-echart', 'listener-excel-view']);
HandleGraph.setEmit(emit);

// 定义相关数据
const dataAbout = reactive({
  groupsName: [], // 组名数组
  groupDefault: '', // 默认组名
  usedGroupNames: [] as Array<string>, // 已使用的组名
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
  },
  currentHandleMode: 'normal', // 当前操作模式，normal：正常模式，all-replace：全部替换模式
}) as DataAboutType;

// 定义数据视窗子画面中表格相关数据
const sheetAbout = reactive({
  head: [] as Array<SheetHeadType>, // 表头数据
  body: [] as Array<any>, // 表格数据
});

// 定义Y轴区间设置子画面中相关数据
const yAxisLimitsAbout = ref<YAxisLimitType[]>([]);

// 计算每个echarts的父级容器颜色
const computedBackgroundColor = (data: SeriesIdDataType) => {
  // const echartsId = data.id;
  const echartsTheme = data.theme;
  let res = '';
  let light_bg = THEME_COLOR.LIGHT.BACKGROUND_COLOR;
  let dark_bg = THEME_COLOR.DARK.BACKGROUND_COLOR;
  if (props.background) {
    // 外部传入了背景色，根据初始化主题，赋给对应主题的背景色
    if (props.theme === THEME_LIGHT) {
      light_bg = props.background;
    } else if (props.theme === THEME_DARK) {
      dark_bg = props.background;
    }
  }
  // // 如果是联动状态，切换主题时，需要同时切换所有图表的主题
  // if (dataAbout.isSwitchingTheme) {
  //   // 切换主题时，优先级最高
  //   if (echartsTheme === THEME_DARK) {
  //     res = dark_bg;
  //   } else {
  //     res = light_bg;
  //   }
  // } else {
  //   if (echartsTheme === THEME_DARK) {
  //     res = dark_bg;
  //   } else {
  //     res = light_bg;
  //   }
  // }
  res = echartsTheme === THEME_DARK ? dark_bg : light_bg;
  return res;
};

// 拖拽传入的数据
const dragDataComputed = (number: number) => {
  const res: Array<DragItemType> = [];
  const originData = dataAbout.data[number].data;
  // 初始化空白echarts时，有占位数据，但name为空，legend不显示
  if (originData.length > 0 && originData[0].name === '') return res;
  originData.forEach((item: OneDataType, index: number) => {
    // 开关类型不可以拖拽
    if (item.dragItemOption) {
      item.dragItemOption.isDrag = item.dataType === SERIES_TYPE_SWITCH ? false : true;
      res.push(shallowClone(item.dragItemOption));
    } else {
      res.push({
        name: item.name,
        id: (index + 1).toString(),
        followId: (index + 1).toString(),
        isDrag: item.dataType === SERIES_TYPE_SWITCH ? false : true,
        isShow: true,
      });
    }
  });
  return res;
};

// 拖拽组件暴露的操作方法中，都需要调用这个方法，目的是将dataAbout.data[echartsIndex].data.dragItemOption值保持最新
const setDragItemOption = (dragListData: DragListDataType[], echartsIndex: number) => {
  dragListData.forEach((dragData) => {
    const key = dragData.key;
    dragData.value.forEach((item: DragItemType) => {
      item.followId = key;
    });
  });
  dataAbout.data[echartsIndex].data.forEach((item: OneDataType, index: number) => {
    dragListData.forEach((dragData) => {
      const dragItem = dragData.value.filter((item: DragItemType) => item.id === (index + 1).toString());
      if (dragItem?.length > 0) {
        item.dragItemOption = dragItem[0];
      }
    });
  });
}

/**
 * @description 拖拽更新操作
 * @param data 拖拽后的数据
 * @param echartsIndex echarts索引，从0开始 
 */
const dragUpdateHandle = async (data: Array<any>, echartsIndex: number) => {
  console.groupCollapsed('update');
  console.log('data', data);
  setDragItemOption(data, echartsIndex);
  // const max = Math.max(...data.map(item => item.value.length));
  const yAxisShowData = ChartUtils.packageYAxisShowData(data);
  const seriesOpacityData = ChartUtils.packageSeriesOpacityData(data);
  const seriesyAxisIndexData = ChartUtils.packageSeriesyAxisIndexData(data);
  dataAbout.currentHandleChartIds = [dataAbout.data[echartsIndex].id];
  dataAbout.data[echartsIndex].data.forEach((item: OneDataType, index: number) => {
    item.yAxisShow = yAxisShowData[index];
    item.seriesShow = seriesOpacityData[index];
    item.seriesYAxisIndex = seriesyAxisIndexData[index];
  });
  // console.log('dataAbout.data', dataAbout.data);
  console.groupEnd();
  await nextTick();
  if (dataAbout.currentHandleMode === 'all-replace') {
    debounceDragUpdateHandle();
    return;
  }
  initEcharts();
}

// 加一个防抖，目的是防止多个拖拽组件初始化时，数据变化频繁，导致echarts图表频繁更新
const debounceDragUpdateHandle = useDebounceFn(() => {
  dataAbout.currentHandleMode = 'normal';
  allUpdateHandleCommon();
}, 100);

/**
 * @description 删除数据项
 * @param data 删除后重新组装的数据 
 * @param deleteItemsIndex 删除的项序号（其实是索引，从0开始） 
 * @param echartsIndex echarts索引，从0开始 
 */
const deleteItem = async (data: Array<any>, deleteItemsIndex: number, echartsIndex: number) => {
  console.groupCollapsed('deleteItem', data, deleteItemsIndex, echartsIndex);
  const chart = dataAbout.data[echartsIndex];
  setDragItemOption(data, echartsIndex);
  // deleteYAxisLimitCommon(chart.id, chart.data[deleteItemsIndex].name);
  chart.data.splice(deleteItemsIndex, 1);
  chart.isDeleteItem = true;
  chart.data.length === 0 && HandleGraph.clearGraphicData(dataAbout, chart.id); // 如果删除后数据为空，则清除图形数据
  dragUpdateHandle(data, echartsIndex);
  await nextTick();
  chart.isDeleteItem = false;
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
  const chart = dataAbout.data[echartsIndex];
  setDragItemOption(data, echartsIndex);
  // deleteYAxisLimitCommon(chart.id, deleteItemsIndexArray.map(deleteItemsIndex => chart.data[deleteItemsIndex].name));
  chart.data = chart.data.filter((_, index) => !deleteItemsIndexArray.includes(index));
  console.log('dataAbout.data', chart);
  chart.isDeleteItem = true;
  chart.data.length === 0 && HandleGraph.clearGraphicData(dataAbout, chart.id); // 如果删除后数据为空，则清除图形数据
  dragUpdateHandle(data, echartsIndex);
  await nextTick();
  chart.isDeleteItem = false;
  console.groupEnd();
}

/**
 * @description 删除所有数据项
 * 1. data数据清空
 * 2. 状态置为删除状态
 * 3. 清除图形数据
 * 4. 重新初始化echarts
 * 5. 状态置为正常状态
 * @param echartsIndex echarts索引，从0开始 
 */
const deleteItemsAll = async (echartsIndex: number) => {
  console.groupCollapsed('deleteItemsAll', echartsIndex);
  const chart = dataAbout.data[echartsIndex];
  // deleteYAxisLimitCommon(chart.id, chart.data.map((item: OneDataType) => item.name));
  chart.data = [];
  chart.isDeleteItem = true;
  HandleGraph.clearGraphicData(dataAbout, chart.id);
  initEcharts();
  await nextTick();
  chart.isDeleteItem = false;
  console.groupEnd();
}

/**
 * @description 获取 EchartsLinkageModel 类实例
 * @param data 系列数据
 * @returns EchartsLinkageModel 实例
 */
const getEchartsLikageModel = (options: OmittedEchartsLinkageModelType) => {
  const myOptions: EchartsLinkageModelType = {
    segment: props.segment,
    echartsColors: (!props.echartsColors || props?.echartsColors.length < 1) ? undefined : props.echartsColors,
    useMergedLegend: props.useMergedLegend,
    // 初始化数据
    ...options,
  }
  const echartsLinkageModel = new EchartsLinkageModel(myOptions);
  return echartsLinkageModel;
}

/**
 * @description 初始化拖拽项
 * @param oneDataType 系列数据
 * @param id 拖拽项id
 * @returns 拖拽项
 */
const initDragItemOption = (oneDataType: OneDataType, id: string): DragItemType => {
  return {
    name: oneDataType.name,
    id: id,
    followId: id,
    isShow: true,
    isDrag: true,
  };
}

// 判断和组装首尾连接数据
const judgeAndPackageLinkData = (oneDataType?: OneDataType | OneDataType[], echartsData?: SeriesIdDataType) => {
  if (!oneDataType) return oneDataType;
  if (Array.isArray(oneDataType)) {
    return oneDataType.map((item: OneDataType, index: number) => {
      let res = handleMultipleLinkData(item);
      if (res.dragItemOption) return res;
      res.dragItemOption = initDragItemOption(item, (index + 1).toString());
      return res;
    });
  } else {
    let res = handleMultipleLinkData(oneDataType);
    // console.log('echartsData----------', res);
    if (res.dragItemOption) return res;
    if (echartsData && echartsData.data.length > 0 && echartsData.data[0].name === '') {
      // 初始化时有一个占位数据，name为空，legend不显示
      res.dragItemOption = initDragItemOption(oneDataType, '1');
    } else {
      const id = echartsData ? (echartsData.data.length + 1).toString() : '1';
      res.dragItemOption = initDragItemOption(oneDataType, id);
    }
    return res;
  }
}

/**
 * @description 新增echart, id最大序号自增操作 --- 导出
 */
const addEchart = async (oneDataType?: OneDataType | OneDataType[], isRender: boolean = true) => {
  oneDataType = judgeAndPackageLinkData(oneDataType);
  dataAbout.maxEchartsIdSeq++;
  const id = 'echart' + dataAbout.maxEchartsIdSeq;
  let dataAll: OneDataType[] = []; // 所有数据
  if (!oneDataType) {
    // 1.空数据，默认新增一个line
    dataAll = [setOneDataEmpty()];
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
      oneDataType = setOneData(oneDataType.name, SERIES_CLASS_TYPE_DEFAULT, [], oneDataType.customData, []);
    }
    dataAll = [{ ...oneDataType }];
  }

  const { theme, graphics } = addEchartJudgeLinkage();
  const obj = { id, data: dataAll, theme, graphics };
  dataAbout.data.push(obj);
  judgeOverEchartsMaxCountHandle();
  if (!isRender) return;
  Extension.setStyleProperty(props, dataAbout.data.length);
  allUpdateHandleCommon();
};

// 设置一个空数据，进行echarts初始化占位
const setOneDataEmpty = (): OneDataType => {
  return setOneData('', SERIES_CLASS_TYPE_DEFAULT, [], '', []) as OneDataType;
}
// 组装数据
const setOneData = (name: string, type: SeriesClassType, seriesData: number[][], customData: string, markLineArray: number[]): OneDataType => {
  return { name, type, seriesData, seriesDataCache: seriesData, customData, markLineArray, dataType: SERIES_TYPE_DEFAULT, visualMapSeries: undefined };
}
// 新增echart，判断是否联动，如果联动并且已经有echart存在的情况，需要考虑新增echart的图形位置和主题
const addEchartJudgeLinkage = () => {
  let theme = props.theme;
  let graphics: GraphicLocationInfoType[] | undefined;
  if (props.isLinkage && dataAbout.data.length > 0) {
    theme = dataAbout.data[0].theme;
    if (props.useGraphicLocation && dataAbout.data[0].data?.[0]?.name !== '') {
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
 * @param seriesDataAbout 一个系列数据对象
 */
const addEchartSeries = async (id: string, seriesDataAbout: OneDataType) => {

  // 判断series是否已存在，存在则不新增
  const judgeSeriesExist = (echart: SeriesIdDataType, oneData: OneDataType) => {
    let isExist = false;
    isExist = echart.data.some((item: OneDataType) => item.name === oneData.name && JSON.stringify(item.customData) === JSON.stringify(oneData.customData));
    return isExist;
  }
  const index = dataAbout.data.findIndex((item: SeriesIdDataType) => item.id === id);
  const chart = dataAbout.data[index];
  seriesDataAbout = judgeAndPackageLinkData(seriesDataAbout, chart) as OneDataType;
  if (dataAbout.data.length < 1) {
    ElMessage.warning('请先添加1个echart图表！');
    return;
  }
  dataAbout.currentHandleChartIds = [id];
  if (judgeSeriesExist(chart, seriesDataAbout)) {
    ElMessage.warning('该子项已存在，请选择其他子项！');
    return;
  }
  //注意：这里有两种空数据情况
  // 情况1是初始化了3个空echarts，每个echarts数据数组中有一个数据对象，除了type属性基本上都是空数据
  // 情况2是初始化了3个空echarts，每个echarts数据数组中有一个数据对象，有name等数据，只是seriesData数据为空
  if (chart.data.length > 0 && chart.data[0].name === '') {
    // 情况1，直接赋值
    chart.data[0] = seriesDataAbout;
  } else {
    // 情况2，新增数据; 其他为正常新增
    chart.data.push(seriesDataAbout);
  }
  await nextTick();
  initEcharts();
  await nextTick();
  dataAbout.currentHandleChartIds = [''];
}

// 初始化某个echarts中所有series
const initOneEchartAllSeries = async (id: string, oneDataArray: OneDataType[]) => {
  const echartsIndex = dataAbout.data.findIndex((item: SeriesIdDataType) => item.id === id);
  const chart = dataAbout.data[echartsIndex];
  if (oneDataArray.length === 0) {
    // 空数据，则新增一个空数据进行占位
    chart.data = [setOneDataEmpty()];
    return;
  }
  oneDataArray.forEach((item: OneDataType, index: number) => {
    if (!item.dragItemOption) {
      const id = (index + 1).toString();
      item.dragItemOption = initDragItemOption(item, id);
    }
    item = judgeAndPackageLinkData(item, dataAbout.data[index]) as OneDataType;
  });
  chart.data = oneDataArray;
  // 注：这里不需要渲染，因为drag组件中已经监听了data中dragItemOption数据的变化，会自动渲染
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
  return data.yAxisShow === false || data.dataType === SERIES_TYPE_SWITCH ? 0 : 1;
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
  let myChart: echarts.ECharts | undefined = echarts.getInstanceByDom(element);
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
        currentData.data = [setOneDataEmpty()];
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
      // && (dataEcharts.data.length > 0 && dataEcharts.data[0].visualMapSeries)) {
      && (dataEcharts.data.length > 0)) {
      // 在初始化时，新增了一个空数据进行占位，当后续有数据时，需要先销毁实例，然后重新初始化实例
      // 注：这里有两种情况，首先第一个数据中visualMapSeries必须存在
      // 情况1：整体更新时，传入了视觉映射数据，则需要重新渲染实例
      // 情况2：拖入数据时，传入了视觉映射数据，如果当前echarts实例中只有一条数据，则需要重新渲染实例
      // 情况3：视觉映射数据切换为非视觉映射数据时，也需要重新渲染实例
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
 * @param id 
 */
const extraHandleByOption = (option: EChartsOption, id: string) => {
  /* 根据option中toolbox的feature数量，给拖拽组件设置右偏移量 --- start */
  const toolbox = option.toolbox as ToolboxComponentOption;
  let size = 0;
  const feature = toolbox.feature;
  if (!feature) return;
  for (const key in feature) {
    if (!Reflect.has(feature, key)) continue;
    if (!(feature[key]?.show)) continue;
    size = key === 'dataZoom' ? size + 2 : size + 1;  // dataZoom是两个图标
  }
  const element = document.querySelector('.main-container') as HTMLElement;
  element.style.setProperty('--toolbox-size', size.toString());
  /* 根据option中toolbox的feature数量，给拖拽组件设置右偏移量 --- end */

  /* ---设置自定义内容容器的left位置，与grid保持一致--- */
  const gridLeft = (option?.grid as GridComponentOption).left;
  const cusElement = element.querySelector(`#${id}-custom-content`) as HTMLElement;
  cusElement.style.setProperty('--left', gridLeft + 'px');
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
const initOneEcharts = (dataArray: SeriesIdDataType, echartsIndex: number) => {
  console.groupCollapsed('initOneEcharts', dataArray.id);
  const { myChart, needHandle } = judgeEchartInstance(dataArray);
  if (!needHandle) { // 不需要操作
    myChart.resize();
    return myChart;
  }
  const seriesAllData: SeriesOptionType[] = [];
  dataArray.data.forEach((item: OneDataType) => {
    item.seriesData.forEach((point: Array<number | string>) => point[0] += ''); // 解决数据类型问题，将数字类型转为字符串类型
    const yAxisLimit = dataArray.yAxisLimits?.find((yAxisLimit: YAxisLimitType) => yAxisLimit.seriesName === item.name);
    if (yAxisLimit?.isYAxisLimitEnabled) {
      item.yAxisMin = Number(yAxisLimit!.yAxisMinLimit);
      item.yAxisMax = Number(yAxisLimit!.yAxisMaxLimit);
    } else {
      item.yAxisMin = undefined;
      item.yAxisMax = undefined;
    }
    seriesAllData.push({
      type: item.type,
      name: item.name,
      seriesData: item.seriesData,
      seriesDataCache: item.seriesData,
      xAxisName: item.xAxisName,
      yAxisName: item.yAxisName,
      yAxisShow: item.yAxisShow,
      yAxisMin: item.yAxisMin,
      yAxisMax: item.yAxisMax,
      yAxisAlignTicks: item.yAxisAlignTicks,
      seriesShow: item.seriesShow,
      seriesYAxisIndex: item.seriesYAxisIndex,
      dataType: item.dataType || SERIES_TYPE_DEFAULT,
      visualMapSeries: item.visualMapSeries,
      seriesLinkMode: item.seriesLink?.isLinkMode,
    });
  });
  const options: OmittedEchartsLinkageModelType = {
    seriesOptionArray: seriesAllData,
    theme: dataArray.theme,
    extraTooltip: dataArray.extraTooltip,
    enlargeShrink: dataArray.enlargeShrink,
    tooltipFormatter: dataArray.tooltipFormatter,
  }
  const echartsLinkageModel = getEchartsLikageModel(options);
  console.log('数据', dataArray.data);
  // 各种处理
  echartsLinkageModel.setMyDeleteButton(() => deleteEchart(dataArray.id))
    .setSaveAsImageClickEvent((e: any) => saveAsImage(e, dataArray.id))
    .setMyThemeButtonClickEvent((e: any) => switchEchartsTheme(e, dataArray.id))
    .setMyEnlargeShrinkButtonClickEvent((e: any) => switchEchartsEnlargeShrink(e, dataArray.id))
    .setMyExcelViewClickEvent((e: any) => setExcelView(e, dataArray.id))
    .setMyRectionLimitButtonClickEvent((e: any) => setRectionLimit(e, dataArray.id))
    .setCustomSeriesMarkLine(dataArray.data)
    .setLanguage(props.language === LANGUAGE_ZH_CN ? LANGUAGE_ZH_CN : LANGUAGE_EN_US) // 设置语言
    .setFontSizeAndMoreAuto(computerEchartsHeight(dataArray.enlargeShrink), props.useGraphicLocation) // 设置字体大小等自适应
    .setGridRightByXAxisName(myChart.getWidth())
  props.gridAlign && echartsLinkageModel.setGridLeftAlign(computerMaxShowYCount()) // 设置多echarts图表是否对齐
  echartsLinkageModel.setBackgroundColor('transparent') // 在echarts中设置透明，在父级设置背景色
  const option: EChartsOption = echartsLinkageModel.getResultOption();
  // console.log('option', option);
  // console.log('myChart', myChart);
  myChart.setOption(option);
  extraHandleByOption(option, dataArray.id); // 获取option数据，用于其他一些额外操作
  // const xAxisData = JSON.parse(JSON.stringify(echartsLinkageModel.getXAxisData()));
  dataArray.xAxisdata = echartsLinkageModel.getXAxisData() as string[];
  myChart.on('datazoom', (_params: any) => HandleGraph.datazoomEvent(dataArray.graphics, dataArray.id, (dataArray.xAxisdata as string[]), props, dataAbout));
  console.log('option', option);
  myChart.resize();
  // 图形设置，必须在myChart.resize()之后，否则会导致图形位置不正确
  props.useGraphicLocation
    && (props.useGraphicGroup === USE_GRAPHIC_GROUP_DEFAULT || props.useGraphicGroup.includes(echartsIndex + 1))
    && dataArray.data[0].seriesData.length > 0
    && (dataArray.graphics = echartsLinkageModel.setGraphic(myChart, dataArray.graphics,
      (params: GraphicLocationInfoType) => HandleGraph.graphicDragLinkage(params, dataArray.id, dataAbout, props)
    ));
  // 清除自定义内容
  clearCustomContentById(dataArray.id);
  console.groupEnd();
  return myChart;
}

/**
 * @description 计算echarts高度
 * @param count 图表数量
 * @returns number
 */
const computerEchartsHeight = (enlargeShrink?: EnlargeShrinkType | undefined) => {
  let height = Extension.computerEchartsHeight(props, dataAbout.data.length);
  // console.log('height', height);
  if (enlargeShrink === MODE_ENLARGE) {
    // 放大之后，计算echarts高度
    height = Extension.computerEchartsHeightByEnlarge(1);
  }
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
    if (i < count - 1) {
      addEchart(undefined, false);
    } else {
      addEchart();
    }
  }
}

// 初始化echarts
const initEcharts = async () => {
  // 基于准备好的dom，初始化echarts图表
  // disposeEcharts(); // 清除之前的分组实例
  dataAbout.usedGroupNames = []; // 已使用的组名
  dataAbout.data.forEach((item: SeriesIdDataType, index: number) => {
    item.yAxisLimits = packageYAxisLimits(item.data, item.yAxisLimits);
    const myChart = initOneEcharts(item, index);
    // 给echarts实例分组，并且记录已使用的组名
    const groupName = Extension.getGroupNameByChartSeq(index, props.groups, dataAbout.groupsName);
    myChart.group = groupName;
    !dataAbout.usedGroupNames.includes(groupName) && dataAbout.usedGroupNames.push(groupName);
  });
  props.useGraphicLocation && HandleGraph.emitGraphicLocation(dataAbout); // 初始化时发送图形位置信息
  dataAbout.restoreClickBool = false;
  dataAbout.currentMaxShowYCount = computerMaxShowYCount(); // 记录当前显示的echarts中y轴数量的最大值
  props.isLinkage && echartsConnect(); // 联动
}

// 初始化组名数据
const initGroupData = () => {
  dataAbout.groupsName = Extension.initGroupData(props.groups);
  dataAbout.groupDefault = Extension.GROUP_DEFAULT;
}

// echarts分组连接
const echartsConnect = () => {
  dataAbout.usedGroupNames.forEach((groupName: string) => {
    groupName && echarts.connect(groupName);
  });
}

// echarts解除分组连接
const echartsDisConnect = () => {
  dataAbout.usedGroupNames.forEach((groupName: string) => {
    echarts.disconnect(groupName);
  });
}

/**
 * @author jiangtao
 * @description 切换联动或分组
 */
const changeLinkageOrGroups = () => {
  echartsDisConnect();
  if (props.isLinkage && props.groups && props.groups.length > 0) {
    // 如果是联动状态，并且groups有值，重新初始化group
    initGroupData();
  }
  initEcharts();
}

/**
 * @author jiangtao
 * @param useGraphicLocation 是否使用图形位置
 */
const changeUseGraphicLocation = (useGraphicLocation: boolean) => {
  allUpdateHandleCommon();
}

// 清除echarts分组实例
const disposeEcharts = () => {
  dataAbout.data.forEach((item: SeriesIdDataType) => {
    const element: HTMLElement = document.getElementById(item.id) as HTMLElement;
    const echartsInstance = echarts.getInstanceByDom(element) as echarts.ECharts;
    if (echartsInstance) {
      // 实例存在，则释放实例
      echartsInstance.dispose();
    }
  });
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
    for (let _entry of entries) {
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
        type: series.type,
        customData: series.customData,
        dataType: series.dataType,
        seriesData: deepClone(series.seriesData), // 暴露缓存数据，原因是外部可能还会使用缓存数据进行渲染
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
        type: series.type,
        customData: series.customData,
        dataType: series.dataType,
        seriesData: deepClone(series.seriesData),
      })
    });
    res.push(oneEchartInfo);
  });
  return res;
}

// 获取所有echarts图表的拖拽子项配置(用于模版渲染) --- 导出
const getTemplateTagsOption = (): Array<Array<DragItemType>> => {
  // 将series数据包装成SeriesTagType类型
  function packageSeriesOption(series: OneDataType): SeriesTagType {
    return {
      name: series.name,
      type: series.type,
      customData: series.customData,
      dataType: series.dataType,
      seriesData: [],
      yAxisMin: series.yAxisMin,
      yAxisMax: series.yAxisMax,
    }
  }
  const res: Array<Array<DragItemType>> = [];
  dataAbout.data.forEach((echart: SeriesIdDataType, index: number) => {
    let oneEchartInfo: Array<DragItemType> = [];
    if (echart.data.length === 1 && echart.data[0].name === '') {
      // 空echarts，返回空数组
      oneEchartInfo = [];
    }
    echart.data.forEach((series: OneDataType) => {
      if (series.dragItemOption) {
        series.dragItemOption.seriesOption = packageSeriesOption(series);
        oneEchartInfo.push(series.dragItemOption);
      } else {
        if (!series.name) return; // 没有name，跳过
        oneEchartInfo.push({
          name: series.name,
          id: (index + 1).toString(),
          followId: (index + 1).toString(),
          isShow: true,
          isDrag: true,
          seriesOption: packageSeriesOption(series),
        });
      }
    });
    res.push(oneEchartInfo);
  });
  return deepClone(res);
}

/**
 * @description 清空所有echarts数据 --- 导出 
 * @param mode 'clear' | 'delete'， 清空 | 删除，说明：当mode为'clear'时，清除数据保留当前空白echarts实例，当mode为'delete'时，删除当前实例
 */
const clearAllEchartsData = async (mode: 'clear' | 'delete' = 'clear') => {
  if (mode === 'clear') {
    // 清空数据，保留当前空白echarts实例
    dataAbout.data.forEach(async (item: SeriesIdDataType) => {
      item.data = [];
      item.isDeleteItem = true;
    });
    await allUpdateHandleCommon();
  } else {
    // 删除所有实例
    dataAbout.data = [];
    dataAbout.maxEchartsIdSeq = 0;
    Extension.setStyleProperty(props, dataAbout.data.length);
    await initEcharts();
  }
}

// 替换所有echarts，模版更新 --- 导出
const replaceAllEchartsData = async (newDataArray: Array<OneDataType[]>) => {
  // 处理echarts实例数量变化
  async function handle(oldCount: number, newCount: number) {
    console.log('oldCount', oldCount, 'newCount', newCount);
    if (oldCount > newCount) {
      // 删除多余的echarts实例
      const spliceData = dataAbout.data.slice(newCount);
      spliceData.forEach(async (item: SeriesIdDataType) => {
        await deleteEchart(item.id);
      });
    } else if (oldCount < newCount) {
      // 添加新的echarts实例
      for (let i = oldCount; i < newCount; i++) {
        await addEchart();
      }
    }
  }
  await nextTick();
  console.time("replaceAllEchartsData time");
  // 1.切换为all-replace模式
  dataAbout.currentHandleMode = 'all-replace';
  // 2.清空所有echarts实例为空白Echarts
  await clearAllEchartsData();
  const oldCount = dataAbout.data.length;
  const newCount = newDataArray.length;
  // 3.处理echarts实例数量变化
  await handle(oldCount, newCount);
  // 4.清除所有echarts中的graphic数据，防止影响下一次的图形计算
  HandleGraph.clearAllGraphicData(dataAbout);
  // 5.各个Echarts实例添加新的series
  console.log('开始添加新的series');
  newDataArray.forEach(async (item: OneDataType[], index: number) => {
    const id = dataAbout.data[index].id;
    await initOneEchartAllSeries(id, item);
  });
  await nextTick();
  console.timeEnd("replaceAllEchartsData time");
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
      if (series.dataType === SERIES_TYPE_SWITCH) return; // 跳过开关量 
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
 * @param chart 单个chart图表数据
 * @param updateSeries 单个echarts图表的更新数据集合 
 * @param isLink 首尾相连模式，true：首尾相连，false：非首尾相连
 */
const updateOneEchartCommon = (chart: SeriesIdDataType, updateSeries: Array<SeriesTagType>, isLink: boolean) => {
  let isNeedHandle = false;
  if (isLink) {
    // 首尾相连模式
    chart.data.forEach((series: OneDataType) => {
      const seriesTag: SeriesTagType = updateSeries.filter(item => judgeTagIsSame(item, series))[0];
      if (!seriesTag) return; // 未找到匹配的标签，跳过
      let linkData: LinkDataType[] = deepClone(seriesTag.seriesLink?.linkData as LinkDataType[]);
      if (linkData.length === 0) {
        // 无关联数据，置空直接返回
        series.seriesData = [];
        series.markLineArray = [];
        return;
      } else {
        // const preLength = linkData.length;
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
      if (seriesTag.yAxisAlignTicks !== undefined) {
        series.yAxisAlignTicks = seriesTag.yAxisAlignTicks;
      }
      if (seriesTag.yAxisMin || seriesTag.yAxisMax) {
        // 如果外部传入的Y轴区间数据有值，则更新Y轴区间数据，外部传入的值优先级高于内部默认值
        series.yAxisMin = seriesTag.yAxisMin;
        series.yAxisMax = seriesTag.yAxisMax;
      }
      // visualMapSeries数据为空，tooltip中需要恢复默认显示
      !seriesTag.visualMapSeries && (isNeedHandle = true);
      series.visualMapSeries = seriesTag.visualMapSeries;
    });
  } else {
    // 非首尾相连模式
    chart.data.forEach((series: OneDataType) => {
      const seriesTag: SeriesTagType = updateSeries.filter(item => judgeTagIsSame(item, series))[0];
      if (!seriesTag) return; // 未找到匹配的标签，跳过
      seriesTag.seriesData && (series.seriesData = seriesTag.seriesData);
      if (seriesTag.yAxisAlignTicks !== undefined) {
        series.yAxisAlignTicks = seriesTag.yAxisAlignTicks;
      }
      if (seriesTag.yAxisMin || seriesTag.yAxisMax) {
        // 如果外部传入的Y轴区间数据有值，则更新Y轴区间数据，外部传入的值优先级高于内部默认值
        series.yAxisMin = seriesTag.yAxisMin;
        series.yAxisMax = seriesTag.yAxisMax;
      }
      // visualMapSeries数据为空，tooltip中需要恢复默认显示
      !seriesTag.visualMapSeries && (isNeedHandle = true);
      series.visualMapSeries = seriesTag.visualMapSeries;
    });
  }
  if (isNeedHandle) {
    // 需要重新渲染，因为visualMapSeries数据为空，tooltip中需要恢复默认显示
    !dataAbout.currentHandleChartIds.includes(chart.id) && (dataAbout.currentHandleChartIds.push(chart.id));
  }
}

// 更新单个或者多个echarts图表 // todo: 需要测试
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
      const echartsInstance = echarts.getInstanceByDom(element) as echarts.ECharts;
      const isUpdate = judgeUpdateSeries(echart, echartsInstance);
      if (!isUpdate) return; // 无需更新，直接返回
      // 赋值给实例，并且触发更新 -- 注意：这里的X轴数据需要转换为字符串，否则会导致echarts渲染异常
      const xAxisData = echart.data[0].seriesData.map(item => item[0] + '');
      const seriesData = echart.data.map((series: OneDataType) => ({ data: series.seriesData.map(item => [item[0] + '', item[1]]) }));
      // console.log('updateSimpleEcharts', echart.id, xAxisData, seriesData);
      echartsInstance.setOption({
        xAxis: [{
          data: xAxisData,
        }],
        series: seriesData,
      });
      updateCount++;
      // 当状态为使用图形时，则进行更新图形，否则不更新图形
      props.useGraphicLocation && HandleGraph.updateGraphic(echart.graphics, echart.id, xAxisData, dataAbout);
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

let animating = false;
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
  if (animating) return; // 防止动画过程中重复触发
  animating = true;
  requestAnimationFrame(() => {
    // 赋值给所有实例，并且触发更新
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      if (!item.data || item.data.length === 0) return; // 防止空白echarts实例
      const element: HTMLElement = document.getElementById(item.id) as HTMLElement;
      let myChart: echarts.ECharts = echarts.getInstanceByDom(element) as echarts.ECharts;
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
  const primaryData = deepClone(linkData); // 深拷贝数据，避免修改原数据导致相互关联
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
  const isAllThemeConsistent = dataAbout.data.every((item: SeriesIdDataType) => item.theme === theme);
  if (isAllThemeConsistent) return; // 所有图表主题与外部传入的主题一致，无需切换
  dataAbout.data.forEach((item: SeriesIdDataType) => item.theme = theme);
  allUpdateHandleCommon();
}

/**
 * @author jiangtao
 * @description 添加自定义tooltip formatter，如果id存在，则添加单个图表，否则添加所有图表 --- 导出
 * @param tooltipFormatterCallback tooltip formatter回调函数
 * @param id 图表id
 * @param isRender 是否重新渲染echarts, 默认false
 */
const addCustomTooltipFormatter = (tooltipFormatterCallback: TooltipFormatterCallback<TooltipFormatterCallbackParams>, id?: string, isRender = false) => {
  if (id) {
    // 添加单个图表的tooltip formatter
    const data: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
    if (data.tooltipFormatter) return; // 已设置tooltip formatter，直接返回
    data.tooltipFormatter = tooltipFormatterCallback;
  } else {
    // 设置所有图表的tooltip formatter
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      if (item.tooltipFormatter) return; // 已设置tooltip formatter，直接返回
      item.tooltipFormatter = tooltipFormatterCallback;
    });
  }
  isRender && containerResizeFn();
}

/**
 * @author jiangtao
 * @description 更新自定义tooltip formatter，如果id存在，则更新单个图表，否则更新所有图表 --- 导出
 * @param tooltipFormatterCallback tooltip formatter回调函数
 * @param id 图表id
 * @param isRender 是否重新渲染echarts, 默认false
 */
const updateCustomTooltipFormatter = (tooltipFormatterCallback: TooltipFormatterCallback<TooltipFormatterCallbackParams>, id?: string, isRender = false) => {
  if (id) {
    // 更新单个图表的tooltip formatter
    const data: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
    if (!data.tooltipFormatter) return; // 未设置tooltip formatter，直接返回
    data.tooltipFormatter = tooltipFormatterCallback;
  } else {
    // 更新所有图表的tooltip formatter
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      if (!item.tooltipFormatter) return; // 未设置tooltip formatter，直接返回
      item.tooltipFormatter = tooltipFormatterCallback;
    });
  }
  isRender && containerResizeFn();
}

/**
 * @author jiangtao
 * @description 清除自定义tooltip formatter，如果id存在，则清除单个图表，否则清除所有图表 --- 导出
 * @param id 图表id
 * @param isRender 是否重新渲染echarts, 默认true
 */
const clearCustomTooltipFormatter = (id?: string, isRender = true) => {
  dataAbout.currentHandleChartIds = [];
  if (id) {
    // 清除单个图表的tooltip formatter
    const data: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
    data.tooltipFormatter = undefined;
    dataAbout.currentHandleChartIds = [id];
  } else {
    // 清除所有图表的tooltip formatter
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      if (!item.tooltipFormatter) return;
      item.tooltipFormatter = undefined;
      dataAbout.currentHandleChartIds.push(item.id);
    });
  }
  isRender && containerResizeFn();
}

/**
 * @author jiangtao
 * @description 新增额外的tooltip数据，如果id存在，则添加单个图表，否则添加所有图表 --- 导出
 * @param extraTooltipData 额外的tooltip数据
 * @param id 图表id
 * @param isRender 是否重新渲染echarts, 默认false
 */
const addExtraTooltip = (extraTooltipData: Array<ExtraTooltipDataItemType>, id?: string, isRender = false) => {
  if (id) {
    // 添加单个图表的额外的tooltip数据
    const data: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
    if ((data.extraTooltip?.data || []).length > 0) return;
    data.extraTooltip = { show: true, data: extraTooltipData };
  } else {
    // 添加所有图表的额外的tooltip数据
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      if ((item.extraTooltip?.data || []).length > 0) return;
      item.extraTooltip = { show: true, data: extraTooltipData };
    });
  }
  isRender && containerResizeFn();
}

/**
 * @author jiangtao
 * @description 更新额外的tooltip数据，如果id存在，则更新单个图表，否则更新所有图表 --- 导出
 * @param extraTooltipData 额外的tooltip数据
 * @param id 图表id
 * @param isRender 是否重新渲染echarts, 默认false
 */
const updateExtraTooltip = (extraTooltipData: Array<ExtraTooltipDataItemType>, id?: string, isRender = false) => {
  if (id) {
    // 更新单个图表的额外的tooltip数据
    const data: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
    if (!data.extraTooltip) return;
    data.extraTooltip!.data = extraTooltipData;
  } else {
    // 更新所有图表的额外的tooltip数据
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      if (!item.extraTooltip) return;
      item.extraTooltip.data = extraTooltipData;
    });
  }
  isRender && containerResizeFn();
}

/**
 * @author jiangtao
 * @description 清除额外的tooltip数据，如果id存在，则清除单个图表，否则清除所有图表 --- 导出
 * @param id 图表id
 * @param isRender 是否重新渲染echarts, 默认true
 */
const clearExtraTooltip = (id?: string, isRender = true) => {
  dataAbout.currentHandleChartIds = [];
  if (id) {
    // 更新单个图表的额外的tooltip数据
    const data: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
    data.extraTooltip = undefined;
    dataAbout.currentHandleChartIds = [id];
  } else {
    // 更新所有图表的额外的tooltip数据
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      if (!item.extraTooltip) return;
      item.extraTooltip = undefined;
      dataAbout.currentHandleChartIds.push(item.id);
    });
  }
  isRender && containerResizeFn();
}

/**
 * @description 更新所有图表的自定义内容 --- 导出
 * @param htmls 自定义内容数组
 */
const updateAllCustomContent = (htmls: string[]) => {
  const elements = document.querySelectorAll('.main-container .custom-content');
  htmls.forEach((item, index) => {
    const element = elements[index];
    if (!element) return;
    // 元素中插入html
    element.innerHTML = item;
  });
}

/**
 * @author jiangtao
 * @description 更新单个或多个图表的自定义内容 --- 导出
 * @param params 自定义内容数组 或 单个自定义内容
 */
const updateCustomContentById = (params: CustomContentHtmlType[] | CustomContentHtmlType) => {
  if (Array.isArray(params)) {
    // 更新多个图表的自定义内容
    params.forEach((item) => {
      const element = document.querySelector(`.main-container #${item.id}-custom-content`);
      if (!element) return;
      // 元素中插入html
      element.innerHTML = item.html;
    });
  } else {
    // 更新单个图表的自定义内容
    const element = document.querySelector(`.main-container #${params.id}-custom-content`);
    if (!element) return;
    element.innerHTML = params.html;
  }
}

/**
 * @description 清除所有图表的自定义内容 --- 导出
 */
const clearAllCustomContent = () => {
  const elements = document.querySelectorAll('.main-container .custom-content');
  elements.forEach((element) => {
    if (!element) return;
    element.innerHTML = '';
  });
}

/**
 * @description 清除单个或多个图表的自定义内容 --- 导出
 * @param ids 图表id
 */
const clearCustomContentById = (ids: string[] | string) => {
  if (Array.isArray(ids)) {
    // 清除多个图表的自定义内容
    ids.forEach((id) => {
      const element = document.querySelector(`.main-container #${id}-custom-content`);
      if (!element) return;
      element.innerHTML = '';
    });
  } else {
    // 清除单个图表的自定义内容
    const element = document.querySelector(`.main-container #${ids}-custom-content`);
    if (!element) return;
    element.innerHTML = '';
  }
}

// echarts上的主题切换事件
const switchEchartsTheme = async (e: any, id: string) => {
  console.log('switchEchartsTheme', id);
  const data: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
  const theme = data.theme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
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

let scrollTop: number = 0;
/**
 * @description 切换echarts的放大缩小
 * @param e 
 * @param id echarts图表id
 */
const switchEchartsEnlargeShrink = async (e: any, id: string) => {

  /**
   * @description 设置其他echarts的显示状态
   * @param id 图表id
   * @param show 显示状态
   */
  function setOtherEchartsShow(id: string, show: boolean) {
    dataAbout.data.forEach((echart: SeriesIdDataType) => {
      if (echart.id === id) return;
      const element: HTMLElement = document.getElementById(echart.id) as HTMLElement;
      element.parentElement!.style.display = show ? 'block' : 'none';
    });
  }

  console.log('switchEchartsEnlargeShrink', id);
  const container = document.querySelector('.main-container') as HTMLElement;
  const elements = container?.querySelectorAll('.echarts-container') as NodeListOf<HTMLElement>;
  const index = dataAbout.data.findIndex((item: SeriesIdDataType) => item.id === id);
  const echart = dataAbout.data[index];
  const element = elements[index];
  if (!element) return;
  if (!HandleEnlargeShrink.getStatus(element)) {
    // 当前是正常状态，记录滚动条位置
    scrollTop = container.scrollTop;
  }
  let isNeedSetOtherEchartsShow = false; // 是否需要显示其他echarts
  HandleEnlargeShrink.handleEnlargeShrink(element, container, () => {
    // 放大操作
    echart.enlargeShrink = MODE_ENLARGE; // 撑满状态
    isNeedSetOtherEchartsShow = false; // 不需要显示其他echarts
  }, () => {
    // 恢复操作
    echart.enlargeShrink = MODE_SHRINK; // 恢复原状态
    isNeedSetOtherEchartsShow = true; // 需要显示其他echarts
  });
  dataAbout.currentHandleChartIds = [id];
  setOtherEchartsShow(id, isNeedSetOtherEchartsShow);
  if (isNeedSetOtherEchartsShow) container.scrollTop = scrollTop;
  await nextTick();
  initEcharts();
}

// echarts上的excel 视窗事件
const setExcelView = async (e: any, id: string) => {
  // console.log('setExcelView', id);
  const data: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
  // 筛选出多卷关联的系列数据，然后取第一个发送给外部
  const seriesData = data.data.filter((item: OneDataType) => item.seriesLink?.isLinkMode && item.seriesLink!.linkData.length > 0);
  const params: ListenerExcelViewType = { id: id };
  if (seriesData.length > 0) {
    params.seriesLink = deepClone(seriesData[0].seriesLink); // 深拷贝数据，避免修改原数据导致相互关联
    params.seriesLink?.linkData.forEach((item: LinkDataType) => item.data = []); // 将关联的series数据置空，减少数据量
  }
  let extraData: excelViewType | undefined = undefined;
  emit('listener-excel-view', params, (excelView: excelViewType) => { extraData = excelView; });
  await Promise.resolve();  // 切换至微任务队列
  // console.log('子组件异步执行后续逻辑');  // 确保在 emit 后执行
  sheetDialogVisible.value = true;
  const { head, body } = HandleExcel.handleExcel(data, extraData, params.seriesLink);
  sheetAbout.head = head;
  sheetAbout.body = body;
}

/**
 * @description 删除Y轴区间数据 --- 公共方法
 * @param id 图表id
 * @param seriesNames 系列名称
 * @returns 
 */
const deleteYAxisLimitCommon = (id: string, seriesNames: string[] | string) => {
  function deleteYAxisLimit(seriesName: string) {
    const yAxisLimitIndex = yAxisLimitsAbout.value.findIndex((item: YAxisLimitType) => item.seriesName === seriesName);
    if (yAxisLimitIndex !== -1) {
      yAxisLimitsAbout.value.splice(yAxisLimitIndex, 1);
    }
  }
  if (Array.isArray(seriesNames)) {
    seriesNames.forEach((seriesName: string) => {
      deleteYAxisLimit(seriesName);
    });
  } else {
    deleteYAxisLimit(seriesNames);
  }
  const chart: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
  chart.yAxisLimits = deepClone(yAxisLimitsAbout.value);
}

/**
 * @description 组装Y轴区间数据
 * @param seriesNames 系列名称
 * @param data Y轴区间数据
 * @returns Y轴区间数据
 */
const packageYAxisLimits = (seriesDataArray: OneDataType[], chartYAxisLimits?: YAxisLimitType[]): YAxisLimitType[] => {
  let result: YAxisLimitType[] = [];
  // series数据不存在时，直接
  if (seriesDataArray.length === 0) return chartYAxisLimits || [];
  // 存在则更新，不存在则新增
  seriesDataArray.forEach((series) => {
    if (series.name === '') return;
    const item = chartYAxisLimits?.find((item: YAxisLimitType) => item.seriesName === series.name);
    if (item) {
      // 存在，如果外部传入了Y轴区间数据，则更新Y轴区间数据；否则，复用原始的Y轴区间数据
      result.push({
        seriesName: series.name,
        isYAxisLimitEnabled: (series.yAxisMin || series.yAxisMax) ? true : item.isYAxisLimitEnabled,
        yAxisMinLimit: series.yAxisMin || item.yAxisMinLimit,
        yAxisMaxLimit: series.yAxisMax || item.yAxisMaxLimit,
      });
    } else {
      // 如果不存在，则新增一个Y轴区间数据，如果外部传入了Y轴区间数据，则启用，否则不启用
      result.push({
        seriesName: series.name,
        isYAxisLimitEnabled: (series.yAxisMin || series.yAxisMax) ? true : false,
        yAxisMinLimit: series.yAxisMin || 0,
        yAxisMaxLimit: series.yAxisMax || 0,
      });
    }
  });
  // 存储更新Y轴区间
  props.useYAxisLimitsCache && setYAxisLimitsCache(result);
  return result;
}

// echarts上的Y轴区间设置事件
const setRectionLimit = async (e: any, id: string) => {
  console.log('setRectionLimit', id);
  const chart: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
  if (chart.data.length === 0 || (chart.data.length === 1 && chart.data[0].name === '')) {
    ElMessage.warning('当前图表没有系列名称，无法设置Y轴区间');
    return;
  }
  yAxisLimitsAbout.value = chart.yAxisLimits || [];
  yAxisLimitDialogWidth.value = getYAxisLimitDialogWidth(yAxisLimitsAbout.value.length);
  yAxisLimitDialogVisible.value = true;
  dataAbout.currentHandleChartIds = [id]; // 设置当前操作的图表id，用于后续确认按钮点击事件中获取当前操作的图表id
}

/**
 * @description 通过系列数量设置子画面宽度
 * @param seriesCount 系列数量
 * @returns 子画面宽度(rem)
 */
const getYAxisLimitDialogWidth = (seriesCount: number) => {
  let res = 0;
  const initWidth = 20; // 初始宽度
  const oneWidth = 10; // 每个系列宽度
  const maxWidth = 60; // 最大宽度
  res = Math.min(initWidth + oneWidth * seriesCount, maxWidth);
  return res + 'rem';
}

// Y轴区间设置子画面中取消按钮点击事件
const yAxisLimitDialogCancelHandle = () => {
  console.log('yAxisLimitDialog 取消');
  yAxisLimitDialogVisible.value = false;
  dataAbout.currentHandleChartIds = [];
}

// Y轴区间设置子画面中确认按钮点击事件
const yAxisLimitDialogConfirmHandle = async (params: YAxisLimitType[]) => {
  console.log('yAxisLimitDialog 确认');
  yAxisLimitDialogVisible.value = false;
  const id = dataAbout.currentHandleChartIds[0];
  const chart: SeriesIdDataType = dataAbout.data.find((item: SeriesIdDataType) => item.id === id) as SeriesIdDataType;
  yAxisLimitsAbout.value = params;
  chart.yAxisLimits = params;
  chart.data.forEach(item => {
    const yAxisLimit = params.find(yAxisLimit => yAxisLimit.seriesName === item.name);
    if (yAxisLimit && yAxisLimit.isYAxisLimitEnabled) {
      item.yAxisMin = yAxisLimit.yAxisMinLimit;
      item.yAxisMax = yAxisLimit.yAxisMaxLimit;
    } else {
      item.yAxisMin = undefined;
      item.yAxisMax = undefined;
    }
  });
  // 存储更新Y轴区间
  props.useYAxisLimitsCache && setYAxisLimitsCache(params);
  await nextTick();
  initEcharts();
}

// 子组件暴露变量和方法
const exposedMethods: ExposedMethods = {
  initEcharts,
  addEchart,
  addEchartSeries,
  deleteEchart,
  getDataLength,
  getMaxEchartsIdSeq,
  getAllDistinctSeriesTagInfo,
  getAllSeriesTagInfo,
  getTemplateTagsOption,
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
  addCustomTooltipFormatter,
  updateCustomTooltipFormatter,
  clearCustomTooltipFormatter,
  addExtraTooltip,
  updateExtraTooltip,
  clearExtraTooltip,
  updateAllCustomContent,
  updateCustomContentById,
  clearAllCustomContent,
  clearCustomContentById,
};
defineExpose(exposedMethods);

// 监听dataAbout.data的变化，重新计算maxEchartsIdSeq
watch(() => dataAbout.data.length, () => {
  getMaxId();
});

// 监听theme的变化，重新设置所有Echarts实例的主题
watch(() => props.theme, (newThemeValue) => {
  changeAllEchartsTheme(newThemeValue);
});

// 监听groups分组的变化，重新初始化group
watch(() => props.groups, (groups) => {
  console.log("groups", groups);
  changeLinkageOrGroups();
});

// 监听isLinkage的变化，重新初始化echarts
watch(() => props.isLinkage, (isLinkage) => {
  console.log("isLinkage", isLinkage);
  changeLinkageOrGroups();
});

// 监听useGraphicLocation的变化（开启和关闭图形定位），重新初始化echarts
watch(() => props.useGraphicLocation, (useGraphicLocation) => {
  changeUseGraphicLocation(useGraphicLocation);
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
    position: relative;
    .flex-row(flex-start);
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

      .custom-content {
        --left: 45px;
        --offset: 10px;
        position: absolute;
        top: var(--drag-top);
        left: calc(var(--left) + var(--offset));
        width: fit-content;
        height: fit-content;
      }
    }
  }

  .clip-bg {
    background: inherit;
    clip-path: inset(0 0 0 0);
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