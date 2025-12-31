/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2025-12-31 10:33:18
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-12-31 10:53:12
 * @FilePath: \vue-echarts-linkage\src\components\yAxisLimit\store.ts
 * @Description: 存储和更新所有图表的Y轴区间数据到浏览器本地缓存中
 */
import { ref } from 'vue';
import type { YAxisLimitType, YAxisLimitsCacheType } from './type';

// 使用localStorage存储Y轴区间缓存数据
const Y_AXIS_LIMITS_CACHE_KEY = 'ECHARTS_LINKAGE_yAxis_limits_cache';

// 获取Y轴区间缓存数据
export const getYAxisLimitsCache = (): YAxisLimitsCacheType => {
  const cache = localStorage.getItem(Y_AXIS_LIMITS_CACHE_KEY);
  return cache ? JSON.parse(cache) as YAxisLimitsCacheType : {};
}

/**
 * @description: 设置Y轴区间缓存数据
 * @param data Y轴区间数据
 */
export const setYAxisLimitsCache = (data?: YAxisLimitType[]) => {
  // 数据不存在或长度为0时，直接返回
  if (!data || data.length === 0) return;
  // 过滤掉未启用的Y轴区间数据
  data = data.filter((item: YAxisLimitType) => item.isYAxisLimitEnabled);
  // 获取Y轴区间缓存数据
  const cache = getYAxisLimitsCache();
  // 更新Y轴区间缓存数据
  data.forEach((item: YAxisLimitType) => {
    // 存在则更新，不存在则新增
    cache[item.seriesName] = {
      yAxisMinLimit: item.yAxisMinLimit,
      yAxisMaxLimit: item.yAxisMaxLimit,
    };
  });
  localStorage.setItem(Y_AXIS_LIMITS_CACHE_KEY, JSON.stringify(cache) as string);
}
