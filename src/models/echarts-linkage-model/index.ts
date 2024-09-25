/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-09-12 09:05:22
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-09-25 10:57:51
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
import { XAXIS_ID, ECHARTS_COLORS, lineSeriesMarkLineTemplate, optionTemplate } from "./staticTemplates"
import { ObjUtil } from "@/utils/index";
import { type GraphicLocationInfoType } from "@/components/echarts-linkage/types/index"

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
  dataType: 'switch' | 'pulse' // 数据类型：switch 开关量， pulse 脉冲量
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
  private usedStandards = {}; // 标准配置，适配高度尺寸自适应
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
    let xAxisData: Array<any> = [];
    for (let i = 0; i < this.seriesOptionArray.length; i++) {
      const seriesData = this.seriesOptionArray[i].seriesData;
      if (seriesData.length === 0) {
        continue;
      } else {
        // 第一个值空字符串，用于隔开起始点
        xAxisData = ['', ...seriesData.map((item: Array<number>) => item[0])];
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

  // 设置y轴
  setYAxis = () => {
    const current: Array<any> = [];
    const yAxisShowArray: Array<boolean> = [];
    let switchYCount = 0; // 开关量Y轴数量
    this.seriesOptionArray.forEach((item: SeriesOptionType, index: number) => {
      // 开关量不计入Y轴显示数量
      const show = item.seriesData.length > 0 && item.yAxisShow !== false && item.dataType !== 'switch' ? true : false;
      yAxisShowArray.push(show);
      const yAxisObj: any = {
        name: item.yAxisName || '',
        type: 'value',
        show, // 注：只有当数据不为空时才显示Y轴
        position: 'left',
        offset: 0,
        alignTicks: true,
        axisLine: { show: true, lineStyle: { color: this.echartsColors[index % this.echartsColors.length] } },
        nameTextStyle: { align: 'center', padding: [0, 0, -7, 0] },
        axisLabel: { margin: 2 },
      }
      if (item.dataType === 'switch') { // 开关量
        yAxisObj.show = true;
        yAxisObj.name = '';
        yAxisObj.min = 0 - switchYCount * 1.5;
        yAxisObj.max = 12 - switchYCount * 1.5;
        // yAxisObj.interval = 1; //注：interval设置会导致其他坐标轴受影响，所以这里不设置
        yAxisObj.axisLine.show = false;  // 透明颜色
        yAxisObj.axisLabel.show = false;  // 透明颜色
        switchYCount++;
      }
      current.push(yAxisObj);
    });
    // 计算各个显示的Y轴偏移量
    current.forEach((item: any, index: number) => {
      if (item.axisLine.show === false && item.axisLabel.show === false) return;
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
    console.log("yAxisShowArray", yAxisShowArray);
    // 计算grid的left值对齐
    const showYCount = yAxisShowArray.filter((item: boolean) => item === true).length;
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
      const color = _that.echartsColors[yAxisIndex % _that.echartsColors.length];
      const obj: any = {
        id: `series${yAxisIndex}`,
        name: defaultParams.name,
        type: defaultParams.type,
        smooth: defaultParams.smooth,
        step: false,
        symbol: 'none',
        yAxisIndex: (param.seriesYAxisIndex || param.seriesYAxisIndex === 0) ? param.seriesYAxisIndex : yAxisIndex,
        lineStyle: { color },
        itemStyle: { color },
        data: defaultParams.seriesShow === false ? [] : defaultParams.seriesData,
      };
      if (defaultParams.dataType === 'switch') { // 开关量
        obj.smooth = false;
        obj.step = 'start';
        obj.areaStyle = { origin: 0 };
      }
      series.push(obj);
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
   * 重写echarts实例的SaveAsImage按钮的点击事件
   * @param callback SaveAsImage按钮的自定义点击事件回调函数
   * @returns this 链式调用 
   */
  setSaveAsImageClickEvent = (callback: Function) => {
    if (this.resultOption.toolbox) {
      const toolbox = this.resultOption.toolbox as ToolboxComponentOption;
      if (toolbox.feature && toolbox.feature.mySaveAsImage) {
        toolbox.feature.mySaveAsImage.onclick = callback;
      } else {
        console.error("mySaveAsImage is not defined in toolbox feature");
      }
    } else {
      console.error("toolbox is not defined in resultOption");
    }
    return this;
  }

  /**
   * 设置toolbox中相关工具的title语言类型
   * @param lang 语言类型，zh-cn | en (中文 | 英文)，默认中文
   * @returns this 链式调用 
   */
  setLanguage = (lang: 'zh-cn' | 'en') => {
    const feature = (this.resultOption?.toolbox as any).feature;
    feature.dataZoom.title = { zoom: `${lang === 'zh-cn' ? '区域缩放' : 'Zoom'}`, back: `${lang === 'zh-cn' ? '区域缩放还原' : 'Zoom Reset'}` };
    feature.restore.title = `${lang === 'zh-cn' ? '还原' : 'Restore'}`;
    // feature.mySaveAsImage.title = `${lang === 'zh-cn' ? '保存为图片' : 'Save as Image'}`;
    feature.myDeleteButton.title = `${lang === 'zh-cn' ? '删除' : 'Delete'}`;
    return this;
  }

  /**
   * @description 统一设置所有echarts实例grid的left值对齐
   * 当前echarts中没有Y轴显示时，grid的left值设置默认值，无需对齐
   * 最大显示数量maxShowYCount为0时，grid的left值设置默认值，无需对齐
   * 其他情况，grid的left值设置： 默认值 + 最大显示数量-1的偏移量
   * @param maxShowYCount 各个图表中Y轴的最大显示数量
   * @returns this 链式调用
   */
  setGridLeftAlign = (maxShowYCount: number) => {
    let showYCount = 0;
    this.seriesOptionArray.forEach((item: SeriesOptionType, index: number) => {
      item.seriesData.length > 0 && showYCount++;
    });
    if (showYCount === 0 || maxShowYCount === 0) {
      (this.resultOption.grid as echarts.GridComponentOption).left = this.gridLeftInit;
    } else {
      (this.resultOption.grid as echarts.GridComponentOption).left = this.gridLeftInit + this.offsetNum * (maxShowYCount - 1);
    }
    return this;
  }

  /**
   * 
   * @param myChart echarts实例
   * @param graphics 图形元素数组 
   * @param onPointDragging 自定义图形元素拖拽事件回调函数 
   * @returns 图形元素数组信息 Array<GraphicLocationInfoType>
   */
  setGraphic = (myChart: any, graphics: Array<GraphicLocationInfoType> | undefined, onPointDragging: Function): Array<GraphicLocationInfoType> => {
    // console.log('myChart', myChart);
    // console.log('myChart.getHeight()', myChart.getHeight());
    const GRAPHIC_RECT1_ID = 'rect1'; // 矩形图形元素1的id
    const GRAPHIC_RECT2_ID = 'rect2'; // 矩形图形元素2的id
    const xAxisSeq1 = (graphics && graphics[0].xAxisSeq) || Math.floor(this.xAxisData.length / 3);
    const xAxisSeq2 = (graphics && graphics[1].xAxisSeq) || Math.floor(this.xAxisData.length / 3) * 2;
    const xAxisX1 = this.xAxisData[xAxisSeq1];
    const xAxisX2 = this.xAxisData[xAxisSeq2];
    myChart.setOption({
      // 绘制markLine的graphic line
      graphic: [
        {
          ...this.getGraphicRectTemplate(myChart, GRAPHIC_RECT1_ID, xAxisSeq1, xAxisX1),
          ondrag: (e: any) => onPointDragging(this.computedTwoGraphicRect(e, myChart, GRAPHIC_RECT1_ID)),
          // ondragend: (e: any) => onPointDragendx1(e, GRAPHIC_RECT1_Id),// 此长方形的拖拽的响应事件，在拖拽过程中会不断被触发。
        },
        {
          ...this.getGraphicRectTemplate(myChart, GRAPHIC_RECT2_ID, xAxisSeq2, xAxisX2),
          ondrag: (e: any) => onPointDragging(this.computedTwoGraphicRect(e, myChart, GRAPHIC_RECT2_ID)),
          // ondragend: (e: any) => onPointDragendx2(e, GRAPHIC_RECT2_ID)
        }
      ],
    });

    function onPointDragendx1(e: any, id: string) {
      console.group('onPointDragendx1');
      console.log('e', e)
      console.log('e', myChart.getOption())
      console.log('myChart.getOption().graphic', myChart.getOption().graphic);
      const x = e.target.x; // 获取当前拖拽线条的X值,距离echarts左侧边框距离（包含grid）
      //获取当前拖拽线条的X值
      let markLine1 = myChart.convertFromPixel({ xAxisId: XAXIS_ID }, x);
      // //获取另一条markLine的X值
      let markLine2 = myChart.convertFromPixel({ xAxisId: XAXIS_ID }, myChart.getOption().graphic[0].elements[1].position[0]);
      // 重新绘制两条markLine
      myChart.setOption({
        graphic: [
          {
            id,
            position: [x, 0],
            info: markLine1,
            textContent: {
              type: 'text',
              style: {
                text: markLine1,
                // font: '20px "STHeiti", sans-serif'
              }
            },
          },
        ],
        // series: [{
        //   id: "series0",
        //   markLine: {
        //     data: [
        //       { xAxis: markLine1 },
        //       { xAxis: markLine2 },
        //     ],
        //   }
        // }]
      });
      console.groupEnd();
    }

    function onPointDragendx2(e: any, id: string) {
      console.group('onPointDragendx1');
      console.log('e', e)
      console.log('e', myChart.getOption())
      console.log('myChart.getOption().graphic', myChart.getOption().graphic);
      const x = e.target.x; //获取当前拖拽线条的X值,距离echarts左侧边框距离（包含grid）
      let markLine2 = myChart.convertFromPixel({ xAxisId: XAXIS_ID }, x);
      let markLine1 = myChart.convertFromPixel({ xAxisId: XAXIS_ID }, myChart.getOption().graphic[0].elements[0].position[0]);
      myChart.setOption({
        graphic: [
          {
            id,
            position: [x, 0],
          },
        ],
        series: [{
          id: "series0",
          markLine: {
            data: [
              { xAxis: markLine2 },
              { xAxis: markLine1 },
            ],
          }
        }]
      });
      console.groupEnd();
    }
    return [
      { graphicId: GRAPHIC_RECT1_ID, positionX: myChart.convertToPixel({ xAxisId: XAXIS_ID }, xAxisSeq1), xAxisSeq: xAxisSeq1, xAxisX: xAxisX1 },
      { graphicId: GRAPHIC_RECT2_ID, positionX: myChart.convertToPixel({ xAxisId: XAXIS_ID }, xAxisSeq2), xAxisSeq: xAxisSeq2, xAxisX: xAxisX2 }
    ]
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

  /**
   * @description 获取graphic 矩形图形模板
   * @param myChart echarts实例
   * @param graphicId 图形元素id
   * @param xAxisSeq 图形元素x轴坐标序号：从0开始
   * @param graphicXAxisX 图形元素x轴坐标：不定，可能是数值可能是时间等等
   * @returns 
   */
  getGraphicRectTemplate = (myChart: any, graphicId: string, xAxisSeq: number, graphicXAxisX: number) => {
    console.log('this.usedStandards', this.usedStandards);
    let TOP = 40; // 图形元素距离顶部的偏移量
    let TEXT_OFFSET_TOP = 20; // 文本距离顶部的偏移量
    let height = myChart.getHeight() * 0.9 - TOP; // 图形元素的高度
    let fontSize = 12; // 图形元素的字体大小
    if (Object.keys(this.usedStandards).length !== 0) {
      // 自适应
      const usedStandards: any = this.usedStandards;
      const top = usedStandards.grid.top;
      const bottom = usedStandards.grid.bottom;
      TOP = top / 2;
      height = usedStandards.echartsHeight - top - bottom + TOP;
      fontSize = usedStandards.fontSize;
      TEXT_OFFSET_TOP = (top - TOP) / 2 + fontSize;
    }
    
    const positionX = myChart.convertToPixel({ xAxisId: XAXIS_ID }, xAxisSeq); // 图形元素的X轴坐标转为像素值
    return {
      id: graphicId,
      type: 'rect',	//'rect' 表示这个 graphic element 的类型是长方形。
      top: TOP,
      // left: myChart.convertToPixel({ xAxisId: XAXIS_ID }, 120),
      z: 101,	// 这个属性让长方形可以被拖拽。
      //设置长方形的形状
      shape: {
        width: 1,
        height: height,
        // r: 10
      },
      // 用 transform 的方式对长方形进行定位。position: [x, y] 表示将长方形平移到 [x, y] 位置。
      // 这里使用了 convertToPixel 这个 API 来得到长方形的位置
      position: [positionX, 0],
      draggable: 'horizontal',// 这个属性让圆点可以被拖拽。
      //设置长方形的样式，透明度设置为0时，该长方形不可见
      //  invisible: true,// 这个属性让长方形不可见（但是不影响他响应鼠标事件）。
      info: graphicXAxisX,
      textContent: {
        type: 'text',
        style: {
          text: graphicXAxisX,
          font: fontSize + 'px "Microsoft YaHei", sans-serif'
        }
      },
      textConfig: {
        position: 'top',
        offset: [15, TEXT_OFFSET_TOP]
      },
      style: {
        fill: 'red',
        stroke: 'red',
        lineWidth: 1
      },
      //鼠标悬浮时在图形元素上时鼠标的样式是什么。同 CSS 的 cursor
      // 'move'	光标指示某对象可被移动。
      // 'pointer'	光标呈现为指示链接的指针（一只手）
      cursor: 'pointer',
    }
  }

  /**
   * @description 计算两个graphic矩形的坐标信息: 当前拖拽的图形的左侧位置和在X轴上的坐标值、未拖动的图形的左侧位置和在X轴上的坐标值
   * @param e 鼠标事件对象 
   * @param myChart echarts实例 
   * @param currentDragGraphicId 当前拖拽的图形的id 
   * @param notDragGraphicId 未拖动的图形的id 
   * @returns
   */
  computedTwoGraphicRect = (e: any, myChart: any, currentDragGraphicId: string): GraphicLocationInfoType => {
    const currentDragGraphicPositionX: number = e.target.x; // 获取当前拖拽线条的X值,距离echarts左侧边框距离（包含grid）
    const xAxisSeq = myChart.convertFromPixel({ xAxisId: XAXIS_ID }, currentDragGraphicPositionX); // 图形元素x轴坐标序号：从0开始
    const currentDragGraphicXAxisX: number = this.xAxisData[xAxisSeq];
    return {
      graphicId: currentDragGraphicId,
      positionX: currentDragGraphicPositionX,
      xAxisSeq,
      xAxisX: currentDragGraphicXAxisX
    };
  }

  /**
   * 
   * @param myChart echarts实例
   * @returns this 链式调用
   */
  setFontSizeBottomAuto = (height: number, useGraphicLocation: boolean = true) => {
    console.log('setFontSizeBottomAuto', height);
    let usedStandards: any = {}; // 使用的标准
    const standardsMap = { // 标准映射
      '200': {
        fontSize: 12,
        grid: {
          top: useGraphicLocation ? 50 : 30,
          bottom: 12 + 5 + 4,
        },
        toolbox: {
          top: 'auto',
          itemSize: 15,
          itemGap: 8,
        }
      },
      '150': {
        fontSize: 10,
        grid: {
          top: useGraphicLocation ? 40 : 20,
          bottom: 10 + 5 + 4,
        },
        toolbox: {
          top: -4,
          itemSize: 12,
          itemGap: 6,
        }
      },
      '100': {
        fontSize: 10,
        grid: {
          top: useGraphicLocation ? 30 : 20,
          bottom: 10 + 5 + 4,
        },
        toolbox: {
          top: -4,
          itemSize: 12,
          itemGap: 6,
        }
      },
      'other': {
        fontSize: 9,
        grid: {
          top: 20,
          bottom: 9 + 5 + 4,
        },
        toolbox: {
          top: -4,
          itemSize: 10,
          itemGap: 4,
        }
      },
    }
    if (height > 200) {
      usedStandards = standardsMap['200'];
    } else if (height > 150) {
      usedStandards = standardsMap['150'];
    } else if (height > 100) {
      usedStandards = standardsMap['100'];
    } else {
      usedStandards = standardsMap['other'];
    }
    // grid
    const grid = this.resultOption.grid as echarts.GridComponentOption;
    grid.top = usedStandards.grid.top;
    grid.bottom = usedStandards.grid.bottom;
    // toolbox
    const toolbox = this.resultOption.toolbox as echarts.ToolboxComponentOption;
    toolbox.top = usedStandards.toolbox.top;
    toolbox.itemSize = usedStandards.toolbox.itemSize;
    toolbox.itemGap = usedStandards.toolbox.itemGap;
    // xAxis
    const xAxis = (this.resultOption.xAxis as Array<any>)[0];
    xAxis.axisLabel.fontSize = usedStandards.fontSize;
    xAxis.nameTextStyle.fontSize = usedStandards.fontSize;
    // yAxis
    (this.resultOption.yAxis as Array<echarts.YAXisComponentOption>).forEach((yAxis: any) => {
      yAxis.axisLabel.fontSize = usedStandards.fontSize;
      yAxis.nameTextStyle.fontSize = usedStandards.fontSize;
    });
    usedStandards.echartsHeight = height;
    this.usedStandards = usedStandards;
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