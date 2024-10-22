/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-10-22 13:39:19
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-10-22 13:45:40
 * @FilePath: \vue-echarts-linkage\src\utils\arrayUtil.ts
 * @Description: 数组相关工具函数
 */

/**
 * 获取两个数组的交叉区间
 * @param {Array} baseArray 基础数组
 * @param {Array} compareArray 对比数组
 * @param {Function} judgeCallback 判断函数，接收两个参数，返回true表示符合条件，false表示不符合条件
 * @returns {Array<Array<number>>} 交叉区间数组
 */
function getGreaterValueIntervals(baseArray: number[], compareArray: number[], judgeCallback: Function) {
  if (baseArray.length !== compareArray.length) {
      throw new Error('两个数组长度必须相等');
  }

  let intervals = [];
  let startIndex = null;

  for (let i = 0; i < baseArray.length; i++) {
      if (judgeCallback(baseArray[i], compareArray[i])) {
          // 如果开始索引为null，表示新的区间开始
          if (startIndex === null) {
              startIndex = i;
          }
      } else {
          // 如果不满足条件且开始索引不为null，表示区间结束
          if (startIndex !== null) {
              intervals.push([startIndex, i - 1]);
              startIndex = null; // 重置开始索引
          }
      }
  }

  // 如果循环结束时仍有一个开放的区间
  if (startIndex !== null) {
      intervals.push([startIndex, baseArray.length - 1]);
  }

  return intervals;
}

export default { getGreaterValueIntervals };

