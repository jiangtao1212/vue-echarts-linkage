/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-09-12 09:08:34
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-10-21 10:33:47
 * @FilePath: \vue-echarts-linkage\src\models\echarts-linkage-model\staticTemplate.ts
 * @Description: 单个echarts图表模型类中使用的静态模板
 */

import { type EChartsOption, type MarkLineComponentOption } from "echarts";
import SaveAsImageSvg from '@/assets/svg/save-image.svg';
import DeleteSvg from '@/assets/svg/delete.svg';

// x轴id
export const XAXIS_ID = 'X1';
// 主题
export const THEME = {
  'DARK': { // 黑色主题
    BACKGROUND_COLOR: '#100C2A',
  },
  'LIGHT': { // 白色主题
    BACKGROUND_COLOR: 'transparent',
  }
};
// 颜色数组
export const ECHARTS_COLORS = ['#0078FF', '#FFAA2E', '#00FF00', '#9D2EFF', '#DA1D80', '#DA4127'];
// 折线图表模板
export const optionTemplate: EChartsOption = {
  tooltip: { trigger: 'axis', confine: true },
  legend: { show: true, left: 45, top: 8 },
  grid: {
    show: true,
    left: '1%',
    right: '1.3%',
    top: '15%',
    bottom: '10%',
    // containLabel: true, // 包含刻度标签, 如果这里使用的话，echarts自身的适配的效果并不好，grid的left适配会出现问题
  },
  toolbox: {
    show: true,
    feature: {
      dataZoom: {
        show: true,
        yAxisIndex: 'none',
        brushStyle: {
          shadowColor: 'rgba(0,0,0,0.7)',
          shadowBlur: 10
        }
      },
      // dataView: { readOnly: false },
      // magicType: { type: ['line', 'bar'] },
      restore: {},
      // saveAsImage: {}, //注：echarts自带的saveAsImage功能，不能将自定义legend等元素保存到图片中，因此这里使用下面自定义的mySaveAsImage功能
      myThemeButton: { // 自定义的主题切换功能
        show: true,
        title: `深色模式`,
        icon: 'image://',
        onclick: (e: any) => {
          // console.log(e);
          // 在这里添加你想要执行的代码
        }
      },
      mySaveAsImage: { // 自定义的保存图片功能
        show: true,
        // title: `保存为图片`,
        // icon: 'path://M225.28 675.75808a20.48 20.48 0 0 0-20.48 20.48v125.60384a20.48 20.48 0 0 0 20.48 20.48h573.44a20.48 20.48 0 0 0 20.48-20.48v-125.60384a20.48 20.48 0 1 0-40.96 0v105.12384H245.76v-105.12384a20.48 20.48 0 0 0-20.48-20.48z M512 186.96192a20.48 20.48 0 0 0-20.48 20.48v440.5248l-129.90464-125.48096a20.45952 20.45952 0 1 0-28.44672 29.45024l164.31104 158.74048 0.04096 0.04096 0.24576 0.22528c0.75776 0.73728 1.72032 1.04448 2.53952 1.6384 1.26976 0.9216 2.4576 1.9456 3.93216 2.53952a20.25472 20.25472 0 0 0 15.48288 0c1.37216-0.55296 2.4576-1.51552 3.64544-2.3552 0.94208-0.63488 2.00704-1.024 2.84672-1.8432l164.57728-159.0272a20.48 20.48 0 0 0-28.48768-29.45024L532.48 647.96672v-440.5248a20.48 20.48 0 0 0-20.48-20.48z',
        icon: 'image://' + SaveAsImageSvg,
        onclick: (e: any) => {
          // console.log(e);
          // 在这里添加你想要执行的代码
        }
      },

      myDeleteButton: { // 自定义的删除功能
        show: true,
        title: `删除`,
        // icon: 'path://M554.6496 512.0512l255.744-255.6928a30.1056 30.1056 0 1 0-42.6496-42.5984L512 469.4528 256.256 213.6064a30.1568 30.1568 0 1 0-42.6496 42.6496l255.744 255.6928-255.744 255.7952a30.1056 30.1056 0 1 0 42.6496 42.6496L512 554.6496l255.744 255.744a30.1568 30.1568 0 1 0 42.6496-42.6496l-255.744-255.6928z',
        icon: 'image://' + DeleteSvg,
        onclick: (e: any) => {
          // console.log(e);
          // 在这里添加你想要执行的代码
        }
      }
    },
  },
  dataZoom: [{
    type: 'inside',
    start: 0,
    end: 100
  }],
  xAxis: [{
    type: 'category',
    id: XAXIS_ID,
    name: '',
    axisLabel: {
      fontSize: 12,
    },
    nameTextStyle: {
      fontSize: 12,
      align: 'center',
      verticalAlign: 'top',
    },
    data: [],
  }],
  yAxis: [
    {
      type: 'value',  //y轴为值类型
      show: true,
      nameLocation: 'center',
      nameTextStyle: {
        padding: 0,
        align: 'right',
      },
      axisLine: {
        show: true,
      },
      axisLabel: {
        fontSize: 12,
      },
    }
  ],
  visualMap: [],
  series: []
} as EChartsOption;

// 标记线模版
export const lineSeriesMarkLineTemplate = {
  symbol: ['none', 'none'], // 箭头方向
  lineStyle: {
    type: "dashed",
    color: '#f00', // 线条颜色
  },
  itemStyle: {
    show: true,
    color: '#f00', // 标签颜色
  },
  label: {
    show: true,
    position: "insideEndTop",
    color: "#f00", // 标签颜色
    distance: 0, // 标签距离线条距离
  },
  data: []
} as MarkLineComponentOption