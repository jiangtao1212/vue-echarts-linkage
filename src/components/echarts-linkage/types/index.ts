/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-08-22 15:28:16
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-09-23 16:05:47
 * @FilePath: \vue-echarts-linkage\src\components\echartsLinkage\types\index.d.ts
 * @Description: 类型定义
 */

/**
 * @description: 组件暴露的接口类型
 * @param {Function} addEchart 添加echarts图表
 * @param {Function} addEchartSeries 添加echarts图表系列
 * @param {Function} deleteEchart 删除echarts图表
 * @param {Function} getDataLength 获取所有echarts图表数据长度
 * @param {Function} getMaxEchartsIdSeq 获取最大的echarts图表id序号
 * @param {Function} getAllDistinctSeriesTagInfo 获取所有系列的标签信息
 * @param {Function} getAllSeriesTagInfo 获取所有echarts图表的系列标签信息
 * @param {Function} updateAllEcharts 更新所有echarts图表
 * @param {Function} clearAllEchartsData 清空所有echarts图表数据
 * @param {Function} replaceAllEchartsData 替换所有echarts图表数据
 */
export interface ExposedMethods {
  addEchart: (data?: OneDataType | OneDataType[]) => void;
  addEchartSeries: (id: string, data: OneDataType) => void;
  deleteEchart: (id: string) => void;
  getDataLength: () => number;
  getMaxEchartsIdSeq: () => number;
  getAllDistinctSeriesTagInfo: () => Array<SeriesTagType>;
  getAllSeriesTagInfo: () => Array<{ id: string, series: Array<SeriesTagType> }>;
  updateAllEcharts: (newAllSeriesdata: Array<SeriesTagType>) => void;
  clearAllEchartsData: () => void;
  replaceAllEchartsData: (newAllSeriesdata: Array<OneDataType[]>) => void;
  downloadAllEchartsImg: () => void;
}

/**
 * @description: echarts图表中单个系列数据类型
 * @param {string} name 系列名称
 * @param {'line' | 'bar'} type 图表类型
 * @param {Array<number[]>} seriesData 系列数据
 * @param {Array<number[]>} seriesDataCache 缓存的系列数据
 * @param {string} xAxisName x轴名称
 * @param {string} yAxisName y轴名称
 * @param {Array<number>} markLineArray 标记线数据
 * @param {any} customData 自定义数据，可用于其他业务逻辑，如模版渲染
 * @param {boolean} yAxisShow 是否显示y轴
 * @param {boolean} seriesShow 是否显示系列
 * @param {number} seriesYAxisIndex 系列y轴索引
 * @param {'switch' | 'pulse'} dataType 数据类型：switch 开关量， pulse 脉冲量
 */
export type OneDataType = {
  name: string;
  type: 'line' | 'bar';
  seriesData: Array<number[]>;
  seriesDataCache?: Array<number[]>;
  xAxisName?: string;
  yAxisName?: string;
  markLineArray?: Array<number>;
  customData?: any;
  yAxisShow?: boolean;
  seriesShow?: boolean;
  seriesYAxisIndex?: number;
  dataType?: 'switch' | 'pulse';
}

/**
 * @description: 图形位置信息类型
 * @param {string} graphicId 图形id
 * @param {number} positionX 图形距离echarts容器左侧的距离
 * @param {number} xAxisSeq 图形元素x轴坐标序号：从0开始
 * @param {number} xAxisX 图形元素x轴坐标值：不定，可能是数值可能是时间等等
 */
export type GraphicLocationInfoType = { 
  graphicId: string, 
  positionX: number, 
  xAxisSeq: number, 
  xAxisX: number 
}

/**
 * @description: 单个echarts图表数据类型
 * @param {string} id 图表id
 * @param {Array<OneDataType>} data 图表数据
 * @param {Array<number>} markLineArray 标记线数据
 * @param {boolean} isDeleteItem 是否删除数据项状态
 * @param {Array<GraphicLocationType>} graphics 图形位置信息
 */
export type SeriesIdDataType = {
  id: string;
  data: Array<OneDataType>;
  markLineArray?: Array<number>;
  isDeleteItem?: boolean, // 是否删除数据项状态
  graphics?: Array<GraphicLocationInfoType>
}

/**
 * @description: ../index.vue文件中响应式数据所有相关数据类型
 * @param {string} groupName echarts所有关联图表组名
 * @param {number} maxEchartsIdSeq 最大的echarts图表id序号
 * @param {Array<seriesIdDataType>} data 所有echarts图表数据
 * @param {string} currentHandleChartId 当前操作的echarts图表id
 * @param {boolean} restoreClickBool 监听restore是否触发点击
 * @param {boolean} isAllUpdate 是否全部更新
 * @param {number} currentMaxShowYCount 当前最大显示y轴数量
 */
export type DataAboutType = {
  groupName: string;
  maxEchartsIdSeq: number;
  data: Array<SeriesIdDataType>;
  currentHandleChartId: string;
  restoreClickBool: boolean;
  isAllUpdate: boolean;
  currentMaxShowYCount: number;
}

/**
 * @description: 系列的标签信息类型
 * @param {Pick<OneDataType, 'name' | 'customData' |'seriesData'>} 单个系列数据类型中name、customData、seriesData字段
 * @param {string} name 系列名称
 * @param {any} customData 自定义数据，可用于其他业务逻辑，如模版渲染
 * @param {Array<number[]>} seriesData 系列数据
 */
export type SeriesTagType = Pick<OneDataType, 'name' | 'customData' | 'seriesData'>;

/**
 * @description: 接收drop事件的参数类型
 * @param {string} id 接收drop事件的图表id
 */
export type DropEchartType = {
  id: string;
}

/**
 * @description: 接收listener-graphic-location事件的参数类型
 * @param {string} id 接收grapicLocation事件的图表id
 * @param {Array<GraphicLocationInfoType>} graphics 图形位置信息
 */
export type ListenerGrapicLocationType = Array<Pick<SeriesIdDataType, 'id' | 'graphics'>>;