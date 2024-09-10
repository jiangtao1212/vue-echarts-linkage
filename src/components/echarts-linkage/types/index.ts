/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-08-22 15:28:16
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-09-09 09:27:41
 * @FilePath: \vue-echarts-linkage\src\components\echartsLinkage\types\index.d.ts
 * @Description: 类型定义
 */


export interface ExposedMethods {
  addEchart: (data?: OneDataType | OneDataType[]) => void;
  addEchartSeries: (id: string, data: OneDataType) => void;
  deleteEchart: (id: string) => void;
  getDataLength: () => number;
  getMaxEchartsIdSeq: () => number;
  getAllDistinctSeriesTagInfo: () => Array<seriesTagType>;
  getAllSeriesTagInfo: () => Array<{ id: string, series: Array<seriesTagType> }>;
  updateAllEcharts: (newAllSeriesdata: Array<seriesTagType>) => void;
  clearAllEchartsData: () => void;
  replaceAllEchartsData: (newAllSeriesdata: Array<OneDataType[]>) => void;
}

export type OneDataType = {
  name: string;
  type: 'line' | 'bar';
  seriesData: Array<number[]>;
  xAxisName?: string;
  yAxisName?: string;
  markLineArray?: Array<number>;
  customData?: any;
}

export type seriesIdDataType = {
  id: string;
  data: Array<OneDataType>;
  markLineArray?: Array<number>;
}

export type DataAboutType = {
  groupName: string;
  maxEchartsIdSeq: number;
  data: Array<seriesIdDataType>;
  currentHandleChartId: string;
  restoreClickBool: Boolean;
  isAllUpdate: Boolean;
}

// 系列的标签信息
export type seriesTagType = Pick<OneDataType, 'name' | 'customData' | 'seriesData'>;

export type dropEchartType = {
  id: string;
}