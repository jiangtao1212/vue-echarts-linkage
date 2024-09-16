/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-09-12 09:05:22
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-09-16 23:55:09
 * @FilePath: \vue-echarts-linkage\src\models\echarts-linkage-model\index.ts
 * @Description: 单个echarts图表模型类
 */

import * as echarts from "echarts";
import {
  type EChartsOption,
  type EChartsType,
  type LineSeriesOption,
  type BarSeriesOption,
  type ToolboxComponentOption,
  type MarkLineComponentOption
} from "echarts";
import { ECHARTS_COLORS, lineSeriesMarkLineTemplate, optionTemplate } from "./staticTemplates"
import { ObjUtil } from "@/utils/index";

/**
 * @description 图表数据类型
 * @param type 图表类型, maybe 'line' or 'bar', default is 'line'
 * @param name 图表名称
 * @param smooth 是否平滑曲线
 * @param seriesData 数据系列
 * @param xAxisName x轴名称
 * @param yAxisName y轴名称
 * @param yAxisShow y轴是否显示
 * @param seriesShow series是否显示
 * @param seriesYAxisIndex series的y轴索引
 */
export type SeriesOptionType = {
  type?: 'line' | 'bar', // 图表类型, maybe 'line' or 'bar', default is 'line'
  name?: string, // 图表名称
  smooth?: true,
  seriesData: Array<Array<number>>, // 数据系列
  seriesDataCache: Array<Array<number>>, // 缓存数据系列
  xAxisName?: string, // x轴名称
  yAxisName?: string, // y轴名称
  yAxisShow?: boolean; // y轴是否显示
  seriesShow?: boolean; // series是否显示
  seriesYAxisIndex?: number; // series的y轴索引
}

/**
 * @param {Array<Array<number>>} originData - 原始数据
 * @param {number} segment - 图表分段数
 * @param {Array<string>} colors - 颜色数组
 */
export type EchartsLinkageModelType = {
  seriesOptionArray: Array<SeriesOptionType>,
  segment?: number,
  echartsColors?: Array<string>,
  useMergedLegend?: boolean,
}

// 联动图表模型 ----------- 实体类
export class EchartsLinkageModel {
  private seriesOptionArray: Array<SeriesOptionType>; // 原始数据
  private segment; // 图表分段数
  private xAxisInterval = 1; // x轴刻度标签显示间隔
  private offsetNum = 40; // Y轴偏移量
  private gridLeftInit = 45; // 左侧边距 --- 由于设置了containLabel: true，包含Y轴刻度标签，所以这里不需要设置
  private gridTopInit = 40; // 上方边距
  private echartsColors = ECHARTS_COLORS; // 颜色数组
  private legendShow = true; // 是否显示图例
  private xAxisData: Array<number> = []; // x轴数据
  private lineSeriesMarkLineTemplate = JSON.parse(JSON.stringify(lineSeriesMarkLineTemplate)); // 标记线模板
  private optionTemplate: EChartsOption = optionTemplate; // 折线图表模板
  private resultOption: EChartsOption = optionTemplate; // 最终的option

  constructor(param: EchartsLinkageModelType) {
    console.groupCollapsed('EchartsLinkageModel')
    console.log(param);
    this.seriesOptionArray = param.seriesOptionArray;
    this.segment = param.segment;
    this.echartsColors = param.echartsColors || ECHARTS_COLORS;
    this.legendShow = param.useMergedLegend === false ? true : false; // 不使用合并图例时，默认显示echarts原生图例
    this.init();
    console.groupEnd();
  }

  // 初始化
  init = () => {
    this.setLenged();
    this.setYAxis();
    this.initOptionTemplate();
    this.setResultOption();
  }

  // 设置图例
  setLenged = () => {
    (this.optionTemplate.legend as ToolboxComponentOption).show = this.legendShow;
  }

  // 设置x轴刻度标签显示间隔
  setXAxisInterval = () => {
    if (!this.segment) return false;
    this.xAxisInterval = this.segment - 1;
    return this.xAxisInterval;
  }

  // 获取x轴数据 --- 如果有多个series，则从第一个开始获取，如果没有则往下一个series中获取
  setXAxisData = () => {
    const xAxisData = [];
    for (let i = 0; i < this.seriesOptionArray.length; i++) {
      const seriesData = this.seriesOptionArray[i].seriesData;
      if (seriesData.length === 0) {
        continue;
      } else {
        const end = seriesData[seriesData.length - 1][0];
        for (let j = 0; j <= end; j++) {
          xAxisData.push(j);
        }
        break;
      }
    }
    this.xAxisData = xAxisData;
    return this.xAxisData;
  }

  // 折线图表模板
  initOptionTemplate = () => {
    const xAxis = this.optionTemplate.xAxis as Array<any>;
    xAxis[0].data = this.setXAxisData();
    xAxis[0].name = (xAxis[0].data?.length > 0 && this.seriesOptionArray[0].xAxisName) || '';
    xAxis[0].show = this.xAxisData?.length > 0 ? true : false;
    // 如果传入了间隔值，则设置x轴刻度标签显示间隔，否则不设置
    this.setXAxisInterval() && (xAxis[0].axisLabel.interval = { show: true, interval: this.xAxisInterval });
  }

  // 设置y轴 //todo: 这里可以考虑优化
  setYAxis = () => {
    const current: Array<any> = [];
    const yAxisShowArray: Array<boolean> = [];
    this.seriesOptionArray.forEach((item: SeriesOptionType, index: number) => {
      const offset = this.offsetNum * index; // 设置 Y 轴的偏移量, 这里的index是从0开始的
      const show = item.seriesData.length > 0 && (item.yAxisShow === undefined || item.yAxisShow === true) ? true : false;
      yAxisShowArray.push(show);
      current.push({
        name: item.yAxisName || '',
        type: 'value',
        show, // 注：只有当数据不为空时才显示Y轴
        position: 'left',
        offset: offset,  // todo: 这里需要优化，最好是没数据的隐藏Y轴，并且offset
        alignTicks: true,
        axisLine: { show: true, lineStyle: { color: this.echartsColors[index % this.echartsColors.length] } },
        nameTextStyle: { align: 'center', padding: 0 },
        axisLabel: { margin: 2 },
      });
    });
    // 计算Y轴的偏移量
    current.forEach((item: any, index: number) => {
      const count = yAxisShowArray.reduce((pre, cur, currentIndex) => {
        if (currentIndex <= index) {
          pre = pre + (cur ? 1 : 0);
        }
        return pre;
      }, 0);
      item.offset = count === 0 ? 0 : this.offsetNum * (count - 1);
    });

    // console.log("current", current);
    this.optionTemplate.yAxis = current;
    const showYCount = current.filter((item: any) => item.show === true).length;
    if (showYCount === 0 || showYCount === 1) {
      (this.optionTemplate.grid as echarts.GridComponentOption).left = this.gridLeftInit;
    } else {
      (this.optionTemplate.grid as echarts.GridComponentOption).left = this.gridLeftInit + this.offsetNum * (showYCount - 1);
    }
  }

  // 组装option
  setResultOption = () => {
    const _that = this;
    // 合并参数
    function addOneSeries(option: EChartsOption, param: SeriesOptionType, yAxisIndex: number): EChartsOption {
      const defaultParams = {
        type: 'line',
        name: 'demo',
        smooth: true,
        ...param,
      } as SeriesOptionType;
      let series: echarts.SeriesOption | echarts.SeriesOption[] | undefined = [];
      let markLine = {};
      switch (defaultParams.type) {
        case 'line':
          series = option.series as LineSeriesOption[];
          break;
        case 'bar':
          series = option.series as BarSeriesOption[];
          break;
        default:
          series = option.series as LineSeriesOption[];
          break;
      }
      series.push({
        name: defaultParams.name,
        type: defaultParams.type,
        smooth: defaultParams.smooth,
        symbol: 'none',
        yAxisIndex: (param.seriesYAxisIndex || param.seriesYAxisIndex === 0) ? param.seriesYAxisIndex : yAxisIndex,
        lineStyle: { color: _that.echartsColors[yAxisIndex % _that.echartsColors.length] },
        itemStyle: { color: _that.echartsColors[yAxisIndex % _that.echartsColors.length] },
        data: defaultParams.seriesShow === false ? [] : defaultParams.seriesData,
      } as echarts.SeriesOption);
      return option;
    }
    let resOption: EChartsOption = ObjUtil.deepCopy(this.optionTemplate) as EChartsOption;
    if (Array.isArray(this.seriesOptionArray)) { // 多个series
      this.seriesOptionArray.forEach((item: SeriesOptionType, index: number) => {
        resOption = addOneSeries(resOption, item, index);
      });

    } else { // 单个series
      resOption = addOneSeries(resOption, this.seriesOptionArray[0], 0);
    }
    this.resultOption = resOption;
    console.log(this.resultOption);
  }

  /**
   * @description 添加自定义标记线
   * @param markLineArray 自定义标记线数组 例如：[ 30, ... , 930 ]
   * @returns this 链式调用 
   */
  addCustomSeriesMarkLine = (markLineArray: Array<number>) => {
    markLineArray.forEach((markLine: number) => {
      (this.lineSeriesMarkLineTemplate.data as Array<any>).push({ yAxis: markLine });
    });
    return this;
  }

  /**
   * @description 清除所有自定义标记线
   * @returns this 链式调用
   */
  clearCustomSeriesMarkLine = () => {
    (this.lineSeriesMarkLineTemplate.data as Array<any>).length = 0;
    return this;
  }

  /**
   * @description 设置自定义标记线
   * @returns this 链式调用
   */
  setCustomSeriesMarkLine = () => {
    (this.resultOption.series as LineSeriesOption[]).length > 0 && ((this.resultOption.series as LineSeriesOption[])[0].markLine = this.lineSeriesMarkLineTemplate);
    return this;
  }

  /**
   * @description 设置工具箱点击事件
   * @param callback 自定义工具箱按钮的点击事件回调函数
   * @returns this 链式调用
   */
  setToolBoxClickEvent = (callback: Function) => {
    if (this.resultOption.toolbox) {
      const toolbox = this.resultOption.toolbox as ToolboxComponentOption;
      if (toolbox.feature && toolbox.feature.myDeleteButton) {
        toolbox.feature.myDeleteButton.onclick = callback;
      } else {
        console.error("myDeleteButton is not defined in toolbox feature");
      }
    } else {
      console.error("toolbox is not defined in resultOption");
    }
    return this;
  }

  /**
   * 设置toolbox中相关工具的title语言类型
   * @param lang 语言类型，zh-cn | en (中文 | 英文)，默认中文
   * @returns 
   */
  setLanguage = (lang: 'zh-cn' | 'en') => {
    const feature = (this.resultOption?.toolbox as any).feature;
    feature.dataZoom.title = { zoom: `${lang === 'zh-cn' ? '区域缩放' : 'Zoom'}`, back: `${lang === 'zh-cn' ? '区域缩放还原' : 'Zoom Reset'}` };
    feature.restore.title = `${lang === 'zh-cn' ? '还原' : 'Restore'}`;
    feature.saveAsImage.title = `${lang === 'zh-cn' ? '保存为图片' : 'Save as Image'}`;
    feature.myDeleteButton.title = `${lang === 'zh-cn' ? '删除' : 'Delete'}`;
    return this;
  }

  /**
   * @description 统一设置所有echarts实例grid的left值对齐
   * 当前echarts中没有Y轴显示时，grid的left值设置默认值，无需对齐
   * 最大显示数量maxShowYCount为0时，grid的left值设置默认值，无需对齐
   * 其他情况，grid的left值设置： 默认值 + 最大显示数量-1的偏移量
   * @param maxShowYCount 各个图表中Y轴的最大显示数量
   */
  setGridLeftAlign = (maxShowYCount: number) => {
    let showYCount = 0;
    this.seriesOptionArray.forEach((item: SeriesOptionType, index: number) => {
      item.seriesData.length > 0 && showYCount++;
    });
    if (showYCount === 0 ||maxShowYCount === 0) {
      (this.resultOption.grid as echarts.GridComponentOption).left = this.gridLeftInit;
    } else {
      (this.resultOption.grid as echarts.GridComponentOption).left = this.gridLeftInit + this.offsetNum * (maxShowYCount - 1);
    }
    return this;
  }

  /**
   * 设置背景色
   * @param color 背景色
   * @returns 
   */
  setBackgroundColor = (color: string) => {
    color && (this.resultOption.backgroundColor = color);
    return this;
  }

  getOptionTemplate = () => {
    return this.optionTemplate;
  }

  getXAxisData = () => {
    return this.xAxisData;
  }

  getResultOption = () => {
    return this.resultOption;
  }
}