/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2025-01-20 16:02:22
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-01-21 09:25:54
 * @FilePath: \vue-echarts-linkage\src\components\echarts-linkage\extension.ts
 * @Description: 延伸的逻辑
 */
import { ObjUtil } from "@/utils/index";
import type { GraphicLocationInfoType } from './types/index';
import { XAXIS_ID } from "@/models/echarts-linkage-model/staticTemplates"

const ECHARTS_DEFAULT_COUNT = 3; // 默认的echarts实例数量
const GAP = 10; // 图表之间的间隔
const GROUP_DEFAULT = 'group-default'; // 默认分组名称

// 计算固定行数
const computedFixedRows = (isEchartsHeightChange: boolean, echartsHeightFixedCount: number): number | undefined => {
  if (isEchartsHeightChange) return; // 如果echarts的高度是可改变的，则直接返回
  let count = echartsHeightFixedCount;
  if (count <= 0) {
    // 如果没有echarts实例，则默认为3个，用来后续计算echarts容器的固定高度
    count = ECHARTS_DEFAULT_COUNT;
  }
  return count;
}

/**
 * @description 设置样式属性, 样式变量
 * @param {number} cols 列数, 控制每行的图表数量,默认为1列
 * @param {number} chartCount 图表数量
 * @param {boolean} isEchartsHeightChange echarts的高度是否可改变
 * @param {number} echartsHeightFixedCount echarts的固定高度数量
 * 样式变量 --count: echarts图表数量
 * 样式变量 --rows: echarts图表行数
 * 样式变量 --item-width: echarts图表宽度
 */
const setStyleProperty = (props: any,  chartCount: number) => {
  const { cols, isEchartsHeightChange, echartsHeightFixedCount } = props;
  const count = chartCount;
  const element = document.querySelector('.main-container') as HTMLElement;
  const rows = Math.ceil(count / cols);
  const fixedRows = computedFixedRows(isEchartsHeightChange, echartsHeightFixedCount); // 固定行数
  element.style.setProperty('--count', count.toString());
  element.style.setProperty('--rows', fixedRows ? fixedRows.toString() : rows.toString());
  element.style.setProperty('--gap', GAP + 'px');
  element.style.setProperty('--main-container-height', element.clientHeight - GAP + 'px');
  if (cols === 1) { // 单列，宽度为100%
    element.style.setProperty('--item-width', '100%');
  } else { // 多列---大于1列
    if (count === 1) { // 只有1个图表，宽度为100%
      element.style.setProperty('--item-width', '100%');
    } else { // 多于1个图表
      const currentCount = count < cols ? count : cols;
      element.style.setProperty('--item-width', `calc((100% - ${GAP} * ${currentCount - 1} * 1px) / ${currentCount})`);
    }
  }
}

/**
 * @description 计算echarts高度
 * @param isEchartsHeightChange echarts的高度是否可改变
 * @param echartsHeightFixedCount echarts高度固定数量
 * @param chartCount 图表数量
 * @returns number
 */
const computerEchartsHeight = (props: any,  chartCount: number) => {
  const { isEchartsHeightChange, echartsHeightFixedCount } = props;
  const element: HTMLElement = document.querySelector('.main-container') as HTMLElement;
  if (!element) return 0;
  const gap = GAP;
  const fixedRows = computedFixedRows(isEchartsHeightChange, echartsHeightFixedCount);
  const count = fixedRows || chartCount;
  const height = Math.floor((element.offsetHeight - (count - 1) * gap) / count);
  return height;
}

/**
 * @description 根据echarts实例容器的高度，设置拖拽legend图例的位置和字体大小
 * @param height echarts高度
 */
const setDragPosition = (height: number) => {
  let top = 5;
  let fontSize = 12;
  if (height <= 200) {
    top = -2;
    fontSize = 11;
  }
  return { top, fontSize };
}

/**
 * @description 初始化分组数据
 * @param groups 图表序号分组数组(序号从1开始) 
 * @returns string[] 组名数组
 */
const initGroupData = (groups: number[][] | undefined) => {
  let groupsName = [];
  if (!groups) {
    groupsName = [GROUP_DEFAULT];
  } else {
    const flatGroups = groups.flat();
    const seen = new Set(flatGroups);
    flatGroups.forEach((item: number) => {
      ObjUtil.validateCols(item, '分组序号必须是正整数');
    });
    if (seen.size !== flatGroups.length) {
      throw new Error('分组下序号不能重复');
    }
    groupsName = groups.map((item, index) => 'group' + (index + 1));
  }
  return groupsName;
}

/**
 * @description 根据图表序号获取分组名
 * @param chartSeq 图表序号 
 * @param groups 图表序号分组数组(序号从1开始)  
 * @param groupsName 组名数组 
 * @returns string 组名 
 */
const getGroupNameByChartSeq = (chartSeq: number, groups: number[][] | undefined, groupsName: string[]) => {
  let groupName = '';
  if (!groups) {
    // 外部未传入组名，则使用默认的组名
    groupName = GROUP_DEFAULT;
  } else {
    // 外部传入组名，则使用传入的组名
    const seq = chartSeq + 1;
    groups.forEach((item, index) => {
      if (item.includes(seq)) {
        groupName = groupsName[index];
      }
    });
    // 如果没有匹配到组名，则使用默认的组名
    groupName = groupName || GROUP_DEFAULT;
  }
  return groupName;
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

// 判定数组数据中某个属性的类型是否一致，如果不一致，则抛出异常
function isAutoPropertyTypeConsistent(arr: Array<any>, prop: string) {
  if (arr.length === 0) return true; // 空数组视为一致
  // 获取第一个对象的prop属性类型
  const firstType = typeof arr[0][prop];
  // 检查每个对象的prop属性类型是否与第一个一致
  const isConsistent = arr.every(item => typeof item[prop] === firstType);
  if (!isConsistent) {
    throw new Error(`数据视图的${prop}属性类型不一致，请保持一致!`);
  }
}


export default { 
  computedFixedRows, 
  setStyleProperty, 
  GAP, GROUP_DEFAULT, 
  computerEchartsHeight, 
  setDragPosition, 
  initGroupData, 
  getGroupNameByChartSeq,
  computerDatazoomGraphic,
  isAutoPropertyTypeConsistent,
};
