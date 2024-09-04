/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-08-22 15:28:16
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-09-04 17:41:59
 * @FilePath: \vue-echarts-linkage\src\components\echartsLinkage\types\index.d.ts
 * @Description: 类型定义
 */

declare module "echartsLinkageType" {
  interface ExposedMethods {
    addEchart: (data?: OneDataType) => void;
    addEchartSeries: (id: string, data: OneDataType) => void;
    deleteEchart: (id: string) => void;
    getDataLength: () => number;
    getMaxEchartsIdSeq: () => number;
    getAllDistinctSeriesTagInfo: () => Array<seriesTagType>;
    updateAllEcharts: (data: { [key: string]: Array<number[]> }) => void;
  }

  type OneDataType = {
    name: string;
    type: 'line' | 'bar';
    seriesData: Array<number[]>;
    markLineArray?: Array<number>;
    customData?: any;
  }

  type seriesIdDataType = {
    id: string;
    data: Array<OneDataType>;
    markLineArray?: Array<number>;
  }

  type DataAboutType = {
    groupName: string;
    maxEchartsIdSeq: number;
    data: Array<seriesIdDataType>;
    currentHandleChartId: string;
    restoreClickBool: Boolean;
  }

  // 系列的标签信息
  type seriesTagType = Pick<OneDataType, 'name' | 'customData'>;
}