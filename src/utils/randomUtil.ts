/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-08-20 13:51:03
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-09-18 17:41:18
 * @FilePath: \vue-echarts-linkage\src\utils\randomUtil.ts
 * @Description: 随机数相关工具
 */


/**
 * 获取随机数据系列 --- 这里数据是从1开始的 [[1, ???], [2, ???], [3, ???], ... , [999, ???], [1000, ???]]
 * @param count 数据条数
 * @returns 组装的随机数据
 */
const getSeriesData = (count = 1000, min = 1, max = 10000) => {
  const seriesData = [];
  for (let i = 0; i < count; i++) {
    seriesData.push([i + 1, Math.floor(Math.random() * max) + 1]);
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

/**
 * 获取随机开关数据
 * @param count  数据总数
 * @param close  关闭值
 * @param open  打开值
 * @returns 
 */
const getSwitchData = (count = 1000, close = 0, open = 1) => {
  const seriesData = [];
  for (let i = 0; i < count; i++) {
    seriesData.push([i + 1, Math.random() > 0.5 ? open : close]);
  }
  return seriesData;

}

export default { getSeriesData, getRandomDataFromInterval, getSwitchData };