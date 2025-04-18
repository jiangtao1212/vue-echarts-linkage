/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2025-04-17 09:52:44
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-04-17 14:26:11
 * @FilePath: \vue-echarts-linkage\src\components\echarts-linkage\handleExcel.ts
 * @Description: 处理excel视图
 */
import type { excelViewType, excelViewHeadType, SeriesIdDataType, OneDataType, SeriesLinkType } from './types/index';
import { type SheetHeadType } from '@/components/sheet/type/index';
import Extension from './extension';

// excel数据视图点击事件发送给外部，外部处理之后的回调函数
function handleExcel(data: SeriesIdDataType, excelView: excelViewType | undefined, seriesLink?: SeriesLinkType) {
  console.groupCollapsed('excelViewCallback');
  console.time('excelViewCallback');
  const headXname = excelView?.headXname || (data.data[0].xAxisName || '');
  const preAdd = excelView?.preAdd;
  const postAdd = excelView?.postAdd;
  preAdd && Extension.isAutoPropertyTypeConsistent(preAdd, 'value'); // 检查前置数据value属性类型是否一致
  postAdd && Extension.isAutoPropertyTypeConsistent(postAdd, 'value'); // 检查后置数据value属性类型是否一致
  let head: SheetHeadType[] = []; // 表头
  let body: Array<any> = []; // 表体
  const itemNameArray = data.data.map((item: OneDataType, index: number): SheetHeadType => ({ 'label': item.name, 'prop': 'prop' + index }));
  head = [...itemNameArray];
  if (seriesLink) { // 考虑到尽管是多卷关联模式，但有些系列只有name，并没有数据，因此需要用params.seriesLink进行判断
    // --多卷关联--
    // 1.新增两列表头数据，一个是卷号列（关联的label），一个是X轴列
    const primaryKey = 'primary'; // 数据主键
    const mainProp = 'auto'; // 主数据列
    head.unshift(...[{ 'label': '自定义', 'prop': mainProp }, { 'label': headXname, 'prop': 'xProp' }]); // 表头，多卷关联时，最前面增加卷号列和X轴列
    // 2.第一次组装body数据
    const res = packageExcelViewBody(head, data, primaryKey, (item: string) => ({ [primaryKey]: item, 'auto': item.split('--')[0], 'xProp': item.split('--')[1] }))
    // 3.处理传入的前置数据
    if (preAdd && preAdd!.length > 0) {
      // 3.1 提取前置数据，并且加入到表头数据中
      const preAddHead = preAdd.map((item: excelViewHeadType, index: number) => {
        if (item.isPrimaryKey) {
          return { 'label': item.name, 'prop': mainProp }
        } else {
          return { 'label': item.name, 'prop': 'preAdd' + index }
        }
      });
      res.head.shift(); // 先删除第一列, 是为了保持和传入的顺序一致，这样外部就可以自定义列的顺序了
      res.head.unshift(...preAddHead); // 表头前面增加自定义列
      // 3.2 提取主数据数组和其他数据数组
      let mainDataArray: (string | number)[] = []; // 主数据数组
      const otherDataArray: Array<{ value: any, prop: string }> = []; // 其他数据数组
      preAdd.forEach((item: excelViewHeadType, index: number) => {
        if (Array.isArray(item.value)) {
          if (item.isPrimaryKey) {
            mainDataArray = item.value;
          } else {
            otherDataArray.push({ value: item.value, 'prop': 'preAdd' + index })
          }
        } else {
          if (item.isPrimaryKey) {
            mainDataArray.push(item.value);
          } else {
            otherDataArray.push({ value: [item.value], 'prop': 'preAdd' + index })
          }
        }
      });
      // 3.3 组装数据，用于后续给body添加属性数据 { main1: { other1: value, other2: value }, main2: { other1: value, other2: value }
      const packageData: { [key: string]: { [prop: string]: any } } = {};
      mainDataArray.forEach((item: any, index: number) => {
        const key = item + ''; // 防止key为数字时报错
        packageData[key] = {} as any;
        otherDataArray.forEach((item1: any) => {
          packageData[key][item1.prop] = item1.value[index];
        });
      });
      // console.log('packageData', packageData);
      // 3.4 遍历body，给对象添加其他属性数据
      res.body.forEach((item: any) => {
        const mainKey = item[mainProp];
        const addDataObj = packageData[mainKey];
        if (!addDataObj) return;
        for (const key in addDataObj) {
          if (Object.prototype.hasOwnProperty.call(addDataObj, key)) {
            item[key] = addDataObj[key];
          }
        }
      });
    }
    // 4.处理传入的后置数据
    head = res.head;
    body = res.body;
  } else {
    // --非多卷关联--
    const primaryKey = 'xProp'; // 数据主键
    head.unshift(...[{ 'label': headXname, 'prop': 'xProp' }]); // 表头前面增加X轴列
    const res = packageExcelViewBody(head, data, primaryKey, (item: string) => ({ [primaryKey]: item }));
    if (preAdd && preAdd!.length > 0) {
      res.head.unshift(...preAdd.map((item: excelViewHeadType, index: number) => ({ 'label': item.name, 'prop': 'preAdd' + index }))); // 表头前面增加自定义列
      res.body.forEach((item: any) => {
        preAdd.forEach((item1: excelViewHeadType, index: number) => {
          item['preAdd' + index] = item1.value;
        });
      });
    }
    if (postAdd && postAdd!.length > 0) {
      res.head.push(...postAdd.map((item: excelViewHeadType, index: number) => ({ 'label': item.name, 'prop': 'postAdd' + index }))); // 表头后面增加自定义列
      res.body.forEach((item: any) => {
        postAdd.forEach((item1: excelViewHeadType, index: number) => {
          item['postAdd' + index] = item1.value;
        });
      });
    }
    head = res.head;
    body = res.body;
  }
  console.log('head', head);
  console.log('body', body);
  // console.log('计算结束---开启子画面');
  // console.timeEnd('excelViewCallback');
  // console.groupEnd();
  return { head, body };
  // sheetAbout.head = head;
  // sheetAbout.body = body;
  // console.log('计算结束---开启子画面');
  // console.timeEnd('excelViewCallback');
  // console.groupEnd();
}

// 组装body数据, primaryKey为数据主键
function packageExcelViewBody(head: SheetHeadType[], data: SeriesIdDataType, primaryKey: string, callBack: Function) {
  const body = data.xAxisdata?.map((item: string) => callBack(item)) || [];
  // const headProps = head.map(item => item.prop);
  const series = data.data.map((item: OneDataType) => {
    const key = head.find(item1 => item1.label === item.name)?.prop;
    return { 'prop': key, 'value': item.seriesData };
  });
  body.forEach((item: any, index: number) => {
    series.forEach((item1: any) => {
      item[item1.prop] = item1.value[index][1];
    });
  });
  return { head, body };
}

export default {
  handleExcel
};
