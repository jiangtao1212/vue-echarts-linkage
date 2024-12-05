/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-12-05 14:03:21
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-12-05 14:03:37
 * @FilePath: \vue-echarts-linkage\src\components\sheet\type\index.ts
 * @Description: sheet相关类型
 */

/**
 * @description: sheet的head类型
 * @param {string} label 表头显示的文字
 * @param {string} prop 表头对应的字段名
 * @param {number} width 表头的宽度
 */
export type SheetHeadType = {
  label: string,
  prop: string,
  width?: number,
}
