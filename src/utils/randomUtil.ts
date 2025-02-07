/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-08-20 13:51:03
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-10-29 14:57:33
 * @FilePath: \vue-echarts-linkage\src\utils\randomUtil.ts
 * @Description: 随机数相关工具
 */


/**
 * 获取长度分析随机数据系列 --- 这里数据是从1开始的 [[1, ???], [2, ???], [3, ???], ... , [999, ???], [1000, ???]]
 * @param count 数据条数
 * @returns 组装的随机数据
 */
const getSeriesData = (count = 1000, min = 1, max = 10000, defaultValue = 0) => {
  const seriesData: Array<Array<string | number>> = [];
  packageSeriesData(count, min, max, (index, value) => {
    seriesData.push([defaultValue + index + 1, value]);
  });
  return seriesData;
}

/**
 * @description: 获取时间分析随机数据系列
 * @param count 数据条数
 * @param min 区间最小值
 * @param max 区间最大值
 * @param startTime 起始时间
 * @param timeSegment 时间频次 
 * @returns 
 */
const getSeriesDataWithTime = (count = 1000, min = 1, max = 10000, startTime: Date = new Date('2024-10-01 08:00:00'), timeSegment: number = 1000) => {
  const timeData = getTimeData(count, startTime, timeSegment);
  const seriesData: Array<Array<string | number>> = [];
  packageSeriesData(count, min, max, (index, value) => {
    seriesData.push([timeData[index], value]);
  });
  return seriesData;
}

// 组装数据模版
const packageSeriesData = (count = 1000, min = 1, max = 10000, callback: (index: number, value: number) => void) => {
  let current = 0;
  let segment = Math.floor(Math.random() * 20) + 30;
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      current = Math.floor(Math.random() * max) + 1;
    } else {
      current += Math.random() > 0.55 ? 0 - Math.floor(Math.random() * segment) : Math.floor(Math.random() * segment);
      if (current < min) {
        current = min;
      } else if (current > max) {
        current = max;
      }
    }
    callback(i, current);
  }
}

// 获取时间数据系列
const getTimeData = (count: number, startTime: Date, segment: number): Array<string> => {
  const timeData: Array<string> = [];
  for (let i = 0; i < count; i++) {
    const current = new Date(startTime.getTime() + i * segment);
    const dateStr = current.toLocaleString();
    // const dateStr = current.toLocaleString().split(' ').join('\n');
    timeData.push(dateStr);
  }
  return timeData;
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

export default { getSeriesData, getSeriesDataWithTime, getRandomDataFromInterval, getSwitchData };