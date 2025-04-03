/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-09-14 10:16:52
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-04-03 09:06:04
 * @FilePath: \vue-echarts-linkage\src\components\drag\type\index.ts
 * @Description: 拖拽组件的类型定义
 */

import type { SeriesTagType } from '@/components/echarts-linkage/types/index';

/**
 * @description 拖拽组件暴露的方法类型定义
 * @interface DragExposedMethods
 * @property {Function} getAllData - 获取所有列表数据
 */
export interface DragExposedMethods {
  getAllData: () => Array<DragListDataType>;
}

/**
 * @description 拖拽组件中单个子项的类型定义
 * @type DragItemType
 * @property {string} name - 子项名称
 * @property {string} id - 子项自身id
 * @property {string} followId - 子项跟随的id
 * @property {boolean} isShow - 子项是否显示
 * @property {boolean} isDrag - 子项是否可拖拽
 */
export type DragItemType = {
  name: string,
  id: string,
  followId: string,
  isShow: boolean,
  isDrag: boolean,
  seriesOption?: SeriesTagType,
}

/**
 * @description 拖拽组件中单个列表的类型定义，key是从1开始的数字字符串：'1', '2', '3',...
 * 示例数据：{ key: '1', value: [{ name: 'coao-1', id: '1', isShow: true }, { name: 'coao-2', id: '2', isShow: false }, ...] }
 * @type DragListDataType
 * @property {string} key - 列表的唯一标识
 * @property {Array<DragItemType>} value - 列表中的子项数组
 */
export type DragListDataType = {
  key: string,
  value: Array<DragItemType>,
}

// /**
//  * @description 拖拽组件中单个子项的props类型定义
//  * @type DragItemDataProps
//  * @property {string} name - 子项名称
//  * @property {boolean} isDrag - 子项是否可拖拽
//  * @property {string} id - 子项自身id
//  * @property {string} followId - 子项跟随的id
//  */
// export type DragItemDataProps = Pick<DragItemType, 'name' | 'isDrag' | 'id' | 'followId'>;
