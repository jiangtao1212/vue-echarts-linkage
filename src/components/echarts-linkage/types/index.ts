/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-08-22 15:28:16
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-09-05 13:43:00
 * @FilePath: \vue-echarts-linkage\src\components\echartsLinkage\types\index.d.ts
 * @Description: 类型定义
 */


export interface ExposedMethods {
  addEchart: (data?: OneDataType) => void;
  addEchartSeries: (id: string, data: OneDataType) => void;
  deleteEchart: (id: string) => void;
  getDataLength: () => number;
  getMaxEchartsIdSeq: () => number;
  getAllDistinctSeriesTagInfo: () => Array<seriesTagType>;
  updateAllEcharts: (newAllSeriesdata: Array<seriesTagType>) => void;
}

export type OneDataType = {
  name: string;
  type: 'line' | 'bar';
  seriesData: Array<number[]>;
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