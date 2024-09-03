/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-08-22 15:28:16
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-09-03 14:45:11
 * @FilePath: \vue-echarts-linkage\src\components\echartsLinkage\types\index.d.ts
 * @Description: 类型定义
 */

/**
 * @description 组件props类型
 * @property {number} [cols=1] - 列数
 * @property {number} [echartsMaxCount=7] - Echarts最大数量
 */
export type PropsType = {
  cols?: number;
  echartsMaxCount?: number;
}

declare module "echartsLinkageType" {
  interface ExposedMethods {
    addEchart: (data: OneDataType) => void;
    addEchartSeries: (id: string, data: OneDataType) => void;
    deleteEchart: (id: string) => void;
    getDataLength: () => number;
    getMaxEchartsIdSeq: () => number;
  }

  type OneDataType = {
    name: string;
    type: 'line' | 'bar';
    seriesData: Array<number[]>;
    markLineArray?: Array<number>;
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
}