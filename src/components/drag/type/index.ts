/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-09-14 09:35:18
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-09-14 10:04:15
 * @FilePath: \echarts-legend-drage\src\components\echartsDrag4\drag\type\index.ts
 * @Description: 拖拽组件的类型定义
 */

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
 * @property {string} id - 子项id
 * @property {boolean} isShow - 子项是否显示
 */
export type DragItemType = {
  name: string,
  id: string,
  isShow: boolean,
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
