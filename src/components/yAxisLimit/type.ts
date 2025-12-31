/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2025-12-27 17:21:31
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-12-31 10:39:27
 * @FilePath: \vue-echarts-linkage\src\components\yAxisLimit\type.ts
 * @Description: Y轴上下区间相关数据类型
 */

/**
 * @description: Y轴区间限制数据类型
 * @param {string} seriesName 系列名称
 * @param {boolean} isYAxisLimitEnabled 是否启用Y轴区间设置
 * @param {number} yAxisMinLimit 启用Y轴区间设置时，设置的Y轴最小值
 * @param {number} yAxisMaxLimit 启用Y轴区间设置时，设置的Y轴最大值
 */
export type YAxisLimitType = {
  seriesName: string,
  isYAxisLimitEnabled: boolean,
  yAxisMinLimit: number,
  yAxisMaxLimit: number,
}

/**
 * @description: Y轴区间缓存数据类型
 * @param {string} seriesName 系列名称
 * @param {number} yAxisMinLimit Y轴最小值
 * @param {number} yAxisMaxLimit Y轴最大值
 */
export type YAxisLimitsCacheType = {
  [seriesName: string]: {
    yAxisMinLimit: number,
    yAxisMaxLimit: number,
  }
}


