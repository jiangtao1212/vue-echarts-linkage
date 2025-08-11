/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2025-08-11 13:29:43
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-08-11 14:39:19
 * @FilePath: \vue-echarts-linkage\src\utils\cloneUtils.ts
 * @Description: 克隆方法
 */

import { isProxy, toRaw, isReactive, isRef } from "vue";

// 深拷贝
export const deepClone = <T>(obj: T): T => {
  try {
    if (typeof structuredClone !== 'undefined') {
      const plainObj = convertToPlainObject(obj);
      return structuredClone(plainObj);
    }
  } catch (e) {
    // structuredClone 可能会失败，比如遇到函数等不可克隆的对象
    console.warn('structuredClone failed, falling back to JSON method', e);
  }
  // 降级方案
  return JSON.parse(JSON.stringify(obj));
};

// 浅拷贝
export const shallowClone = <T>(obj: T): T => {
  if (Array.isArray(obj)) {
    return [...obj] as T;
  }
  if (typeof obj === 'object' && obj !== null) {
    return {...obj} as T;
  }
  return obj;
};


// 完整的嵌套响应式对象处理方案
export const convertToPlainObject = <T>(obj: T): T => {
  // 处理 null 和基本类型
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 处理 Date 对象
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  // 处理 RegExp 对象
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as unknown as T;
  }

  // 处理 Vue Ref
  if (isRef(obj)) {
    return convertToPlainObject(obj.value) as unknown as T;
  }

  // 处理 Vue 响应式对象
  if (isReactive(obj) || isProxy(obj)) {
    const raw = toRaw(obj);
    return convertToPlainObject(raw);
  }

  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map(item => convertToPlainObject(item)) as unknown as T;
  }

  // 处理普通对象
  const result = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = convertToPlainObject(obj[key]);
    }
  }
  return result;
};
