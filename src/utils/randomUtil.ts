/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-08-20 13:51:03
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-08-22 09:56:12
 * @FilePath: \vue-echarts-linkage\src\utils\randomUtil.ts
 * @Description: 随机数相关工具
 */


/**
 * 获取随机数据系列 --- 这里数据是从1开始的 [[1, ???], [2, ???], [3, ???], ... , [999, ???], [1000, ???]]
 * @param count 数据条数
 * @returns 组装的随机数据
 */
const getSeriesData = (count = 1000) => {
  const seriesData = [];
  for (let i = 0; i < count; i++) {
    seriesData.push([i + 1, Math.floor(Math.random() * 1000) + 1]);
  }
  return seriesData;
}

/**
 * 获取区间中的随机数
 * @param min 区间下限 
 * @param max 区间上限 
 * @returns 区间中的随机数
 */
const getRandomDataFromInterval = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export default { getSeriesData, getRandomDataFromInterval };