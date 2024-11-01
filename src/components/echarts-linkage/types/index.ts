/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-08-22 15:28:16
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-10-29 17:15:37
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
 * @param {Function} getAllSeriesTagInfo 获取所有echarts实例或者某个echarts实例各个系列的标签信息，默认返回所有echarts实例的标签信息
 * @param {Function} updateAllEcharts 更新所有echarts图表
 * @param {Function} clearAllEchartsData 清空所有echarts图表数据
 * @param {Function} replaceAllEchartsData 替换所有echarts图表数据
 * @param {Function} downloadAllEchartsImg 下载所有echarts图表图片
 * @param {Function} realTimeUpdate 实时更新echarts图表数据
 * @param {Function} updateOneEchartsVisualMapSeries 更新单个echarts图表的视觉映射数据
 * @param {Function} handleMultipleLinkData 处理前后关联数据，多条关联数据进行首尾相连操作，primaryData中必须设置seriesLink，否则不进行处理，直接返回
 */
export interface ExposedMethods {
  addEchart: (data?: OneDataType | OneDataType[]) => void;
  addEchartSeries: (id: string, data: OneDataType) => void;
  deleteEchart: (id: string) => void;
  getDataLength: () => number;
  getMaxEchartsIdSeq: () => number;
  getAllDistinctSeriesTagInfo: () => Array<SeriesTagType>;
  getAllSeriesTagInfo: (echartsId?: string) => Array<{ id: string, series: Array<SeriesTagType> }>;
  updateAllEcharts: (newAllSeriesdata: Array<SeriesTagType>) => void;
  clearAllEchartsData: () => void;
  replaceAllEchartsData: (newAllSeriesdata: Array<OneDataType[]>) => void;
  downloadAllEchartsImg: () => void;
  realTimeUpdate: (allRealTimeData: Array<SeriesTagType>, limitCount?: number) => void;
  updateOneEchartsVisualMapSeries: (id: string, data: VisualMapSeriesType[] | VisualMapSeriesType) => void;
  handleMultipleLinkData: (primaryData: OneDataType) => OneDataType;
}

/**
 * @description: 系列数据类型
 * @param {Array<(string | number)[]>} 系列数据二维数组，每一项为一个数组，数组的每一项为一个数据点
 */
export type SeriesDataType = Array<(string | number)[]>;

/**
 * @description: 标记线数据类型
 * @param {number | object} 标记线数据，可以是数字([2, 4, 6, 8, 10])，也可以是对象(内容参考echarts官网文档中标线markLine的data属性)
 */
export type MarkLineDataType = Array<number | object>;

/**
 * @description: 多条数据进行首尾相连的单条数据类型
 * @param {SeriesDataType} data 系列数据
 * @param {string} label 标签名称
 */
export type LinkDataType = {
  data: SeriesDataType,
  label?: string
}

/**
 * @description: 多条数据进行首尾相连的数据类型
 * @param {boolean} isLinkMode 是否开启多条数据进行首尾相连模式
 * @param {Array<LinkDataType>} linkData 进行首尾相连的多条数据
 */
export type SeriesLinkType = {
  isLinkMode?: boolean,
  linkData: LinkDataType[],
}

/**
 * @description: echarts图表中单个系列数据类型
 * @param {string} name 系列名称
 * @param {'line' | 'bar'} type 图表类型
 * @param {SeriesDataType} seriesData 系列数据
 * @param {SeriesDataType} seriesDataCache 缓存的系列数据
 * @param {SeriesLinkType} seriesLink 多条数据进行首尾相连
 * @param {string} xAxisName x轴名称
 * @param {string} yAxisName y轴名称
 * @param {MarkLineDataType} markLineArray 标记线数据
 * @param {Array<VisualMapSeriesType> | undefined} visualMapSeries 视觉映射数据，设置echarts的visualMap数据，自定义每个series中不同报警区间，默认报警色为红色
 * @param {any} customData 自定义数据，可用于其他业务逻辑，如模版渲染
 * @param {boolean} yAxisShow 是否显示y轴
 * @param {boolean} seriesShow 是否显示系列
 * @param {number} seriesYAxisIndex 系列y轴索引
 * @param {'switch' | 'pulse'} dataType 数据类型：switch 开关量， pulse 脉冲量
 */
export type OneDataType = {
  name: string;
  type: 'line' | 'bar';
  seriesData: SeriesDataType;
  seriesDataCache?: SeriesDataType;
  seriesLink?: SeriesLinkType;
  xAxisName?: string;
  yAxisName?: string;
  markLineArray?: MarkLineDataType;
  visualMapSeries?: VisualMapSeriesType | undefined;
  customData?: any;
  xAxisShow?: boolean;
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
  xAxisX: string
}

/**
 * @description: 视觉映射数据类型，自定义每个series中不同报警区间，默认报警色为红色
 * @param {string} seriesName 指定作用的系列名称，在更新单个echarts的visualMap数据（updateOneEchartsVisualMapSeries方法）时使用
 * @param {SeriesDataType} baseLine 基准线数据
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @param {string} color 颜色
 */
export type VisualMapSeriesType = {
  seriesName?: string,
  baseLine?: {
    mode: 'above' | 'below' | 'equal', // 基准线报警模式：above: 超出基准线，Below: 低于基准线，equal: 等于基准线
    value: SeriesDataType // 基准线值
  },
  pieces: Array<{
    min: number,
    max: number,
    color?: string
  }>,
}

/**
 * @description: 单个echarts图表数据类型
 * @param {string} id 图表id
 * @param {Array<OneDataType>} data 图表数据
 * @param {MarkLineDataType} markLineArray 标记线数据
 * @param {Array<VisualMapType>} visualMapArray 视觉映射数据
 * @param {boolean} isDeleteItem 是否删除数据项状态
 * @param {Array<GraphicLocationType>} graphics 图形位置信息
 */
export type SeriesIdDataType = {
  id: string;
  data: Array<OneDataType>;
  xAxisdata?: Array<string>;
  markLineArray?: MarkLineDataType;
  isDeleteItem?: boolean, // 是否删除数据项状态
  graphics?: Array<GraphicLocationInfoType>,
  theme: 'dark' | 'light',
}

/**
 * @description: ../index.vue文件中响应式数据所有相关数据类型
 * @param {string} groupName echarts所有关联图表组名
 * @param {number} maxEchartsIdSeq 最大的echarts图表id序号
 * @param {Array<seriesIdDataType>} data 所有echarts图表数据
 * @param {string} currentHandleChartId 当前操作的echarts图表id
 * @param {boolean} restoreClickBool 监听restore是否触发点击
 * @param {boolean} isAllUpdate 是否全部更新
 * @param {boolean} isSwitchingTheme 是否正在切换主题
 * @param {number} currentMaxShowYCount 当前最大显示y轴数量
 */
export type DataAboutType = {
  groupName: string;
  maxEchartsIdSeq: number;
  data: Array<SeriesIdDataType>;
  currentHandleChartId: string;
  restoreClickBool: boolean;
  isAllUpdate: boolean;
  isSwitchingTheme: boolean;
  currentMaxShowYCount: number;
  drag: { top: number, fontSize: number | string, isDragging: boolean }
}

/**
 * @description: 系列的标签信息类型
 * @param {Pick<OneDataType, 'name' | 'customData' |'seriesData'>} 单个系列数据类型中name、customData、seriesData字段
 * @param {string} name 系列名称
 * @param {any} customData 自定义数据，可用于其他业务逻辑，如模版渲染
 * @param {Array<number[]>} seriesData 系列数据
 * @param {SeriesLinkType} seriesLink 多条数据进行首尾相连
 * @param {Array<VisualMapSeriesType> | undefined} visualMapSeries 视觉映射数据，设置echarts的visualMap数据，自定义每个series中不同报警区间，默认报警色为红色
 */
export type SeriesTagType = Pick<OneDataType, 'name' | 'customData' | 'seriesData' | 'dataType' | 'seriesLink' | 'visualMapSeries'>;

/**
 * @description: 接收drop事件的参数类型
 * @param {string} id 接收drop事件的图表id
 */
export type DropEchartType = {
  id: string;
}

/**
 * @description: 接收delete事件的参数类型
 * @param {string} id 接收delete事件的图表id
 * @param {number} remainCount 剩余图表数量
 */
export type DeleteEchartType = {
  id: string;
  remainCount: number;
}

/**
 * @description: 接收listener-graphic-location事件的参数类型
 * @param {string} id 接收grapicLocation事件的图表id
 * @param {Array<GraphicLocationInfoType>} graphics 图形位置信息
 */
export type ListenerGrapicLocationType = Array<Pick<SeriesIdDataType, 'id' | 'graphics'>>;

/**
 * @description 定义标线分段数
 * @param {number} count 标线分段数
 * @property {string} [mode='interval'] - 分段模式，可选值：'interval' | 'percent', 
 * @property {number} [value] - 分段数，当mode为'interval'时，value表示分段数，当mode为'percent'时，表示显示能被value整除的数值
 * @example
 * 1. 5个分段：segment: 5
 * 2. 5个分段：segment: { mode: 'interval', value: 5 }
 * 3. 能被50整除的数值：segment: { mode: 'percent', value: 50 }
 */
export type SegementType = number | {
  mode: 'interval' | 'percent',
  value: number
}