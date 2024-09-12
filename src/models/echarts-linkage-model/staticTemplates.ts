/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-09-12 09:08:34
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-09-12 09:15:56
 * @FilePath: \vue-echarts-linkage\src\models\echarts-linkage-model\staticTemplate.ts
 * @Description: 单个echarts图表模型类中使用的静态模板
 */

import { type EChartsOption, type MarkLineComponentOption } from "echarts";

// 颜色数组
export const ECHARTS_COLORS = ['#0078FF', '#FFAA2E', '#00FF00', '#9D2EFF', '#DA1D80', '#DA4127'];
// 折线图表模板
export const optionTemplate: EChartsOption = {
  tooltip: { trigger: 'axis', confine: true },
  legend: { left: 200, top: 8 },
  grid: {
    show: true,
    left: '1%',
    right: '2%',
    // top: '1%',
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
      saveAsImage: {},
      myDeleteButton: {
        show: true,
        title: `删除`,
        icon: 'path://M554.6496 512.0512l255.744-255.6928a30.1056 30.1056 0 1 0-42.6496-42.5984L512 469.4528 256.256 213.6064a30.1568 30.1568 0 1 0-42.6496 42.6496l255.744 255.6928-255.744 255.7952a30.1056 30.1056 0 1 0 42.6496 42.6496L512 554.6496l255.744 255.744a30.1568 30.1568 0 1 0 42.6496-42.6496l-255.744-255.6928z',
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
    name: '',
    // axisLabel: {
    //   show: true,
    //   interval: 1, // 控制刻度标签显示间隔
    // },
    data: [],
  }],
  yAxis: [
    {
      type: 'value',  //y轴为值类型
      show: true,
      nameLocation: 'center',
      nameTextStyle: {
        padding: [0, 10, 0, 50],
        align: 'right',
      },
      axisLine: {
        show: true,
      },
    }
  ],
  series: []
} as EChartsOption;

// 标记线模版
export const lineSeriesMarkLineTemplate = {
  symbol: ['none'], // 箭头方向
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