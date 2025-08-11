/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2025-08-11 11:02:29
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-08-11 11:03:00
 * @FilePath: \vue-echarts-linkage\src\utils\chartUtils.ts
 * @Description: 这里是图表的一些处理
 */


export class ChartUtils {
  // 组装Y轴显示状态数据
  static packageYAxisShowData(data: Array<any>): boolean[] {
    return data.map(item =>
      item.value.length > 0 && item.value.some((item: any) => item.isShow ===      
true)
    );
  }

  // 组装系列透明度数据
  static packageSeriesOpacityData(data: Array<any>): boolean[] {
    const seriesOpacityData = new Array(data.length).fill(0);
    data.forEach((item) => {
      item.value.forEach((subItem: any) => {
        seriesOpacityData[+subItem.id - 1] = subItem.isShow;
      });
    });
    return seriesOpacityData;
  }

  // 组装系列Y轴索引数据
  static packageSeriesyAxisIndexData(data: Array<any>): number[] {
    const seriesyAxisIndexData = new Array(data.length).fill(0);
    data.forEach((item, index) => {
      item.value.forEach((subItem: any) => {
        seriesyAxisIndexData[+subItem.id - 1] = index;
      });
    });
    return seriesyAxisIndexData;
  }
}