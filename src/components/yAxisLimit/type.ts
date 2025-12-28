/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2025-12-27 17:21:31
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-12-27 17:23:26
 * @FilePath: \vue-echarts-linkage\src\components\yAxisLimit\type.ts
 * @Description: Y轴上下限制相关数据类型
 */

/**
 * @description: Y轴上下限制相关数据类型
 * @param {boolean} isYAxisLimitEnabled 是否启用Y轴区间限制
 * @param {number} yAxisMinLimit 启用Y轴区间限制时，设置的Y轴最小值
 * @param {number} yAxisMaxLimit 启用Y轴区间限制时，设置的Y轴最大值
 */
export type YAxisLimitType = {
  isYAxisLimitEnabled: boolean,
  yAxisMinLimit: number,
  yAxisMaxLimit: number,
}
