/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-09-12 09:05:22
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-06-09 14:26:58
 * @FilePath: \vue-echarts-linkage\src\models\echarts-linkage-model\index.ts
 * @Description: 单个echarts图表模型类
 */

import type {
  EChartsOption,
  LineSeriesOption,
  BarSeriesOption,
  SeriesOption,
  ToolboxComponentOption,
  LegendComponentOption,
  GridComponentOption,
  TooltipComponentOption,
  YAXisComponentOption,
  GraphicComponentOption,
  MarkLineComponentOption
} from "@/models/my-echarts/index";
import { XAXIS_ID, ECHARTS_COLORS, lineSeriesMarkLineTemplate, optionTemplate, THEME_DARK, THEME_LIGHT, MODE_ENLARGE, MODE_SHRINK } from "./staticTemplates"
import { ObjUtil, FileUtil, ArrayUtil } from "@/utils/index";
import type {
  GraphicLocationInfoType, VisualMapSeriesType, MarkLineDataType, SeriesDataType, SegementType,
  ThemeType, SeriesType, OneDataType, ExtraTooltipType, ExtraTooltipDataItemType, EnlargeShrinkType
} from "@/components/echarts-linkage/types/index";

let mergedOptionTemplate: EChartsOption = optionTemplate; // 合并后的option模板
const COLOR_KEY = 'color';
const COLOR_CACHE_KEY = 'colorCache';

/**
 * @description 图表数据类型
 * @param type 图表类型, maybe 'line' or 'bar', default is 'line'
 * @param name 图表名称
 * @param smooth 是否平滑曲线
 * @param seriesData 数据系列
 * @param xAxisName x轴名称
 * @param yAxisName y轴名称
 * @param yAxisShow y轴是否显示
 * @param yAxisMin y轴下限
 * @param yAxisMax y轴上限
 * @param seriesShow series是否显示
 * @param seriesYAxisIndex series的y轴索引
 * @param visualMapSeries 视觉映射系列
 * @param dataType series数据类型
 * @param seriesLinkMode 是否为连接模式
 */
export type SeriesOptionType = {
  type?: 'line' | 'bar', // 图表类型, maybe 'line' or 'bar', default is 'line'
  name?: string, // 图表名称
  smooth?: true,
  seriesData: SeriesDataType, // 数据系列
  seriesDataCache: SeriesDataType, // 缓存数据系列
  xAxisName?: string, // x轴名称
  yAxisName?: string, // y轴名称
  yAxisShow?: boolean; // y轴是否显示
  yAxisMin?: number; // y轴下限
  yAxisMax?: number; // y轴上限
  seriesShow?: boolean; // series是否显示
  seriesYAxisIndex?: number; // series的y轴索引
  visualMapSeries?: VisualMapSeriesType; // 视觉映射系列
  dataType: SeriesType // series数据类型
  seriesLinkMode?: boolean // 是否为连接模式
}

/**
 * @param {Array<Array<number>>} originData - 原始数据
 * @param {ThemeType} theme - 主题
 * @param {number} segment - 图表分段数
 * @param {Array<string>} colors - 颜色数组
 * @param {boolean} useMergedLegend - 是否使用合并图例
 * @param {boolean} useSeriesDataSetYAxisMinMax - 是否使用series数据来设置对应Y轴的上下限
 */
export type EchartsLinkageModelType = {
  seriesOptionArray: Array<SeriesOptionType>,
  theme: ThemeType,
  segment?: SegementType,
  echartsColors?: Array<string>,
  useMergedLegend?: boolean,
  useSeriesDataSetYAxisMinMax: boolean,
  extraTooltip?: ExtraTooltipType,
  enlargeShrink?: EnlargeShrinkType,
}

type VisualMapShowOnToolTipModeType = 'pieces' | 'baseLine' | 'not';

// 联动图表模型 ----------- 实体类
export class EchartsLinkageModel {
  private seriesOptionArray: Array<SeriesOptionType>; // 原始数据
  private segment; // 图表分段数
  private theme: ThemeType; // 主题
  private enlargeShrink: EnlargeShrinkType; // 放缩类型
  private swichThemeIcon: ThemeType; // 切换按钮的icon主题，与theme相反
  private xAxisInterval = 1; // x轴刻度标签显示间隔
  private offsetNum = 40; // Y轴偏移量
  private gridLeftInit = 45; // 左侧边距 --- 由于设置了containLabel: true，包含Y轴刻度标签，所以这里不需要设置
  private gridTopInit = 40; // 上方边距
  private echartsColors = ECHARTS_COLORS; // 颜色数组
  private legendShow = true; // 是否显示图例
  private extraTootip: ExtraTooltipType | undefined; // 额外的tooltip
  private xAxisData: Array<string> = []; // x轴数据
  private usedStandards = {}; // 标准配置，适配高度尺寸自适应
  private lineSeriesMarkLineTemplate = JSON.parse(JSON.stringify(lineSeriesMarkLineTemplate)) as MarkLineComponentOption; // 标记线模板
  // private optionTemplate: EChartsOption; // 折线图表模板
  private resultOption: EChartsOption; // 最终的option

  constructor(param: EchartsLinkageModelType) {
    console.groupCollapsed('EchartsLinkageModel');
    console.log('param', param);
    const myOptionTemplate = ObjUtil.deepCopy(mergedOptionTemplate);
    // this.optionTemplate = myOptionTemplate;
    this.resultOption = myOptionTemplate;
    this.seriesOptionArray = param.seriesOptionArray;
    this.segment = param.segment;
    this.theme = param.theme;
    this.enlargeShrink = param.enlargeShrink || MODE_SHRINK;
    this.swichThemeIcon = this.theme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    this.enlargeShrink = this.enlargeShrink === MODE_ENLARGE ? MODE_ENLARGE : MODE_SHRINK;
    this.echartsColors = param.echartsColors || ECHARTS_COLORS;
    this.legendShow = param.useMergedLegend === false ? true : false; // 不使用合并图例时，默认显示echarts原生图例
    this.extraTootip = param.extraTooltip;
    this.init();
    console.groupEnd();
  }

  // 初始化
  init = () => {
    this.setLenged();
    this.setYAxis();
    this.setToolTip();
    this.setThemeButtonIcon();
    this.setEnlargeShrinkButtonIcon();
    this.initOptionTemplate();
    this.setResultOption();
    this.setVisualMap(); // 视觉映射，必须等所有series都设置完毕后再设置
  }

  // 设置图例，在图例中设置selected来显示和隐藏series
  setLenged = () => {
    (this.resultOption.legend as LegendComponentOption).show = this.legendShow;
    const selected: any = {}
    this.seriesOptionArray.forEach((item: SeriesOptionType) => {
      const { name } = item;
      if (name) {
        selected[name] = item.seriesShow === false ? false : true;
      }
    });
    (this.resultOption.legend as LegendComponentOption).selected = selected;

  }

  /**
   * @description 设置x轴刻度标签显示间隔
   * egment值300，表示间隔300，效果应该是0,300,600,...,； 
   * 但在echarts中的含义其实是interval为299，表示『隔299个标签显示一个标签』；
   * 也就是说，间隔300，实际上interval为299。
   * @returns {number | boolean} x轴刻度标签显示间隔
   */
  setXAxisInterval = () => {
    if (!this.segment) return false;
    let segment = 1;
    if (typeof this.segment === 'number') {
      // number类型，直接赋值
      segment = this.segment;
    } else if (typeof this.segment === 'object') {
      // object类型
      // 如果mode为percent，则
      // 如果mode为interval，则取value值
      const { mode, value } = this.segment;
      if (mode === 'percent') {
        this.xAxisInterval = 0;
        return true;
      }
      segment = value;
    }
    this.xAxisInterval = segment - 1;
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
        xAxisData = [...seriesData.map((item: Array<(string | number)>) => item[0].toString())];
        // // 有基准线时，开始不新增空字符串
        // // 第一个值空字符串，用于隔开起始点---注意：这里会影响后续图形更新时的x轴seq序号数据，因为此时x轴数据长度比series数据长度多1
        // seriesData[0][0].toString() === '1' && xAxisData.unshift('');
        break;
      }
    }
    this.xAxisData = xAxisData;
    return this.xAxisData;
  }

  // 折线图表模板
  initOptionTemplate = () => {
    const xAxis = this.resultOption.xAxis as Array<any>;
    xAxis[0].data = this.setXAxisData();
    // xAxis[0].name = (xAxis[0].data?.length > 0 && this.seriesOptionArray[0].xAxisName) || '';
    (xAxis[0].data?.length > 0 && this.seriesOptionArray[0].xAxisName && (xAxis[0].name = this.seriesOptionArray[0].xAxisName));
    xAxis[0].show = this.xAxisData?.length > 0 ? true : false;
    // 如果传入了间隔值，则设置x轴刻度标签显示间隔，否则不设置
    this.setXAxisInterval() && (xAxis[0].axisLabel.interval = this.xAxisInterval);
    xAxis[0].axisLabel.formatter = (value: string | number) => {
      const seriesLinkMode = this.seriesOptionArray.some((item: SeriesOptionType) => item.seriesLinkMode);
      if (seriesLinkMode) {
        value = value.toString().split('--')[1]
      }
      if (typeof this.segment === 'object' && this.segment.mode === 'percent') {
        // segment的mode为percent时，显示能被整除的数值
        (+value) % this.segment.value !== 0 && (value = '');
      }
      return value;
    }
    // segment的mode为percent时，不显示x轴刻度标签
    typeof this.segment === 'object' && this.segment.mode === 'percent' && (xAxis[0].axisTick.show = false);
  }

  /**
   * @description 根据series数据，自定义Y轴最小值和最大值 --- 暂未使用，使用echarts自身的优化算法来自动设置
   * @returns this 链式调用   
   */
  customYAxisMinMax = () => {
    // 组装Y轴最小值和最大值，进行凑整处理，例如：最大值1013，凑整之后为1020；最小值-1013，凑整之后为-1020
    function packageYAxisMinMax(seriesData: (string | number)[][]) {
      const yAxisDataArray: Array<number> = seriesData.map((point: Array<number | string>) => +point[1]);
      let min = Math.min(...yAxisDataArray);
      let max = Math.max(...yAxisDataArray);
      console.log("min, max", min, max);
      if (min > 0 || min < 0) {
        min = Math.floor(min / 10) * 10;
      }
      if (max > 0 || max < 0) {
        max = Math.ceil(max / 10) * 10;
      }
      return { min, max };
    }
    this.seriesOptionArray.forEach((item: SeriesOptionType, index: number) => {
      const { min, max } = packageYAxisMinMax(item.seriesData);
      const yAxisObj = (this.resultOption.yAxis as Array<any>)[index];
      yAxisObj.min = min;
      yAxisObj.max = max;
      yAxisObj.alignTicks = false;
    });
    return this;
  }

  // 设置y轴
  setYAxis = () => {
    const current: Array<any> = [];
    const yAxisShowArray: Array<boolean> = [];
    let switchYCount = 0; // 开关量Y轴数量
    this.seriesOptionArray.forEach((item: SeriesOptionType, index: number) => {
      // 开关量不计入Y轴显示数量
      const show = item.seriesData.length > 0 && item.yAxisShow !== false && item.dataType !== 'switch' && item.dataType !== 'markLine' ? true : false;
      yAxisShowArray.push(show);
      const yAxisObj: any = {
        name: item.yAxisName || '',
        type: 'value',
        show, // 注：只有当数据不为空时才显示Y轴
        position: 'left',
        offset: 0,
        alignTicks: true,
        scale: true, // 坐标刻度不强制包含零刻度
        axisLine: { show: true, lineStyle: { color: this.echartsColors[index % this.echartsColors.length] } },
        nameTextStyle: { align: 'center', padding: [0, 0, -7, 0] },
        axisLabel: { margin: 2 },
      }
      if (item.yAxisMin || item.yAxisMin === 0) yAxisObj.min = item.yAxisMin;
      if (item.yAxisMax || item.yAxisMax === 0) yAxisObj.max = item.yAxisMax;
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
      if (item.dataType === 'markLine') { // series竖行标记线类型
        yAxisObj.show = true;
        yAxisObj.name = 'markLine';
        yAxisObj.axisLine.show = true;  // 透明颜色
        yAxisObj.axisLabel.show = true;  // 透明颜色
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
    this.resultOption.yAxis = current;
    console.log("yAxisShowArray", yAxisShowArray);
    // 计算grid的left值对齐
    const showYCount = yAxisShowArray.filter((item: boolean) => item === true).length;
    if (showYCount === 0 || showYCount === 1) {
      (this.resultOption.grid as GridComponentOption).left = this.gridLeftInit;
    } else {
      (this.resultOption.grid as GridComponentOption).left = this.gridLeftInit + this.offsetNum * (showYCount - 1);
    }
  }

  // 设置tooltip
  setToolTip = () => {
    const tooltip = this.resultOption.tooltip as TooltipComponentOption;
    this.setBaseLineOnToolTip(tooltip);
  }

  // 设置基准线值在tooltip中显示
  setBaseLineOnToolTip = (tooltip: TooltipComponentOption) => {
    // 显示在tooltip中的模式：pieces（非基线模式，自定义模式）| baseLine（基线模式）| false（不显示）
    const baseLines: Array<{ seriesShow: boolean, showOnToolTipMode: VisualMapShowOnToolTipModeType, baseLineValue: SeriesDataType | undefined, piecesOnTooltipValue: string }> = [];
    let someIsShowOnToolTip = false; // 是否有series的isShowOnToolTip为true
    this.seriesOptionArray.forEach((item: SeriesOptionType) => {
      const seriesShow = item.seriesShow === false ? false : true;
      if (!item.visualMapSeries) {
        // 视觉映射不存在
        const data = {
          seriesShow,
          showOnToolTipMode: 'not' as VisualMapShowOnToolTipModeType,
          baseLineValue: undefined,
          piecesOnTooltipValue: '',
        };
        baseLines.push(data);
        return;
      }
      const visualMapSeries = item.visualMapSeries;
      const isShowOnToolTip = visualMapSeries?.baseLine?.isShowOnToolTip; // 基线是否显示在tooltip中
      const piecesOnTooltip = visualMapSeries?.piecesOnTooltip?.show; // 非基线模式时，是否显示在tooltip
      const piecesOnTooltipValue = visualMapSeries?.piecesOnTooltip?.value || ''; // 非基线模式时，自定义组装内容数据
      console.log("isShowOnToolTip", isShowOnToolTip);
      const showOnToolTipMode: VisualMapShowOnToolTipModeType = (!isShowOnToolTip && !piecesOnTooltip) ? 'not' : (piecesOnTooltip ? 'pieces' : 'baseLine');
      (isShowOnToolTip || piecesOnTooltip) && (someIsShowOnToolTip = true);
      const baseLineValue = visualMapSeries?.baseLine?.value;
      const data = {
        seriesShow,
        showOnToolTipMode,
        baseLineValue,
        piecesOnTooltipValue,
      };
      baseLines.push(data);
    });
    console.log("someIsShowOnToolTip", someIsShowOnToolTip);
    // 没有series的isShowOnToolTip为true，则返回；有，则组装tooltip的formatter；并且没有额外的tooltip数据，则返回
    if (!someIsShowOnToolTip && (!this.extraTootip?.show || this.extraTootip?.data.length === 0)) return;
    tooltip.formatter = (params: any) => {
      let tooltipHtml = '';
      // console.log("params", params);
      if (params && params.length > 0) {
        tooltipHtml += `${params[0].name}</br>`;
        params.forEach((item: any) => {
          const index = item.componentIndex; // 未被隐藏系列的索引，params中不含有隐藏系列的数据
          const dataIndex = item.dataIndex;
          const seriesShow = baseLines[index].seriesShow;
          const showOnToolTipMode = baseLines[index].showOnToolTipMode;
          let value = Array.isArray(item.value) ? item.value[1] : item.value; // 实际值
          if (showOnToolTipMode === 'pieces') {
            // 非基线模式，自定义模式
            const autoValue = baseLines[index].piecesOnTooltipValue;
            value = `${value}&nbsp;<span style="color: green;">(${autoValue})<span>`;
          } else if (showOnToolTipMode === 'baseLine') {
            // 显示在tooltip中，实际值 (基线值)
            const baseLineValue = baseLines[index].baseLineValue as SeriesDataType;
            const pointBaseValue = Array.isArray(baseLineValue[dataIndex]) ? baseLineValue[dataIndex][1] : baseLineValue[dataIndex];
            value = `${value}&nbsp;<span style="color: green;">(${pointBaseValue})<span>`;
          } else {
            // 预留，未来可能支持其他模式
          }
          // 获取对应series的opacity值
          if (seriesShow) { // 检查series中lineStyle的opacity值
            tooltipHtml += `<div>${item.marker}&nbsp;${item.seriesName}&nbsp;&nbsp;&nbsp;&nbsp;<span style="float: right;">${value}</span></div>`;
          }
        });
        // 添加额外的tooltip数据
        if (this.extraTootip?.show && this.extraTootip?.data.length > 0) {
          const span1 = `<span style="display:inline-block; margin-right:4px; width:10px; height:10px; color: #ccc;">--</span>`;
          this.extraTootip!.data.forEach((extraTooltip: ExtraTooltipDataItemType) => {
            const label = extraTooltip.label;
            const data1 = extraTooltip.value;
            const xDataIndex = params[0].dataIndex; // x轴数据索引
            const pointData = data1[xDataIndex]; // 对应的点数据
            const value = Array.isArray(pointData) ? pointData[1] : pointData; // 判断是否为数组，是则取第二个值，否则取第一个值
            tooltipHtml += `<div>${span1}&nbsp;${label}&nbsp;&nbsp;&nbsp;&nbsp;<span style="float: right;">${value}</span></div>`;
          });
        }
      }
      return tooltipHtml;
    }
  }

  // 设置主题按钮图标
  setThemeButtonIcon = () => {
    if (this.resultOption.toolbox) {
      const toolbox = this.resultOption.toolbox as ToolboxComponentOption;
      // const xAxis = this.resultOption.xAxis as XAXisComponentOption[];
      if (toolbox.feature && toolbox.feature.myThemeButton) {
        // console.log('this.theme:', this.theme);
        // console.log('this.swichThemeIcon:', this.swichThemeIcon);
        const darkSvg = FileUtil.getAssetsFile('svg/dark.svg');
        const lightSvg = FileUtil.getAssetsFile('svg/light.svg');
        let icon = darkSvg;
        if (this.swichThemeIcon === THEME_DARK) {
          // 切换图标为dark，则当前主题为light
          icon = darkSvg;
        } else {
          // 切换图标为light，则当前主题为dark
          icon = lightSvg;
        }
        toolbox.feature.myThemeButton.icon = 'image://' + icon;
        // xAxis[0].axisLabel!.color = axisLabelColor;
        this.setOptionColorsByTheme(this.resultOption, this.swichThemeIcon);
      } else {
        console.error("myThemeButton is not defined in toolbox feature");
      }
    } else {
      console.error("toolbox is not defined in resultOption");
    }
    return this;
  }

  /**
   * @description 根据主题设置所有颜色，主要是坐标轴相关的颜色
   * @param option 配置项
   * @param swichThemeIcon 切换图标 
   */
  setOptionColorsByTheme = (option: any, swichThemeIcon: string) => {
    if (option !== null && typeof option === 'object') {
      for (const key in option) {
        if (Reflect.has(option, key)) {
          // 如果键是 'color'，就替换值
          if (key === COLOR_CACHE_KEY) {
            const colorCache = option[COLOR_CACHE_KEY];
            if (!colorCache) continue;
            // 数组第一项为light主题，第二项为dark主题
            option[COLOR_KEY] = swichThemeIcon === THEME_DARK ? colorCache[0] : colorCache[1];
          } else {
            // 如果值是对象，则递归调用
            this.setOptionColorsByTheme(option[key], swichThemeIcon);
          }
        }
      }
    }
  }

  // 设置放缩按钮图标
  setEnlargeShrinkButtonIcon = () => {
    if (this.resultOption.toolbox) {
      const toolbox = this.resultOption.toolbox as ToolboxComponentOption;
      // const xAxis = this.resultOption.xAxis as XAXisComponentOption[];
      if (toolbox.feature && toolbox.feature.myEnlargeShrinkButton) {
        const enlargeSvg = FileUtil.getAssetsFile('svg/enlarge.svg');
        const shrinkSvg = FileUtil.getAssetsFile('svg/shrink.svg');
        let icon = enlargeSvg;
        if (this.enlargeShrink === MODE_ENLARGE) {
          // 放大之后，切换图标为缩小svg图标
          icon = shrinkSvg;
        } else {
          // 缩小之后，切换图标为放大svg图标
          icon = enlargeSvg;
        }
        toolbox.feature.myEnlargeShrinkButton.icon = 'image://' + icon;
      } else {
        console.error("myEnlargeShrinkButton is not defined in toolbox feature");
      }
    } else {
      console.error("toolbox is not defined in resultOption");
    }
    return this;
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
      let series: SeriesOption | SeriesOption[] | undefined = [];
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
        data: defaultParams.seriesData,
      };
      if (defaultParams.dataType === 'switch') { // 开关量
        obj.smooth = false;
        obj.step = 'start';
        obj.areaStyle = { origin: 0 };
      }
      series.push(obj);
      return option;
    }

    let resOption: EChartsOption = ObjUtil.deepCopy(this.resultOption) as EChartsOption;
    if (Array.isArray(this.seriesOptionArray)) { // 多个series
      this.seriesOptionArray.forEach((item: SeriesOptionType, index: number) => {
        resOption = addOneSeries(resOption, item, index);
      });
    } else { // 单个series
      resOption = addOneSeries(resOption, this.seriesOptionArray[0], 0);
    }
    // console.log(resOption);
    this.resultOption = resOption;
  }

  /**
   * @description 添加自定义标记线
   * @param markLineArray 自定义标记线数组
   * @returns this 链式调用 
   */
  addCustomSeriesMarkLine = (markLineArray: MarkLineDataType) => {
    if (markLineArray.length === 0) {
      this.lineSeriesMarkLineTemplate.data = [];
      return this;
    }
    markLineArray.forEach((markLine: number | object) => {
      if (typeof markLine === 'number') {
        this.lineSeriesMarkLineTemplate.data && (this.lineSeriesMarkLineTemplate.data).push({ yAxis: markLine });
      } else {
        this.lineSeriesMarkLineTemplate.data && (this.lineSeriesMarkLineTemplate.data).push(markLine);
      }
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
   * 根据yAxis的show值，如果show是true，则显示该系列的markLine，否则不显示；
   * 同时也考虑到重复的markLine，如果有重复的，则只显示第一个重复的
   * @returns this 链式调用
   */
  setCustomSeriesMarkLine = (data: Array<OneDataType>) => {
    // 筛选出重复的markLine，根据对应yAxis的show值，如果show是true，将第一个重复的显示，后续的不显示
    function filterRepeatMarkLine(markLineArrays: Array<MarkLineDataType | undefined>, yAxis: Array<YAXisComponentOption>) {
      // 1. 首先筛选出二维数组的重复项
      const repeatSet = new Set(markLineArrays.filter((item: MarkLineDataType | undefined) => item !== undefined).flat().map(item => JSON.stringify(item)));
      // 记录重复项是否被使用过，Set数组转对象，对象值false表示未被使用过
      const repeatUsed = Array.from(repeatSet).reduce((obj, key) => {
        obj[key] = false;
        return obj;
      }, {} as { [key: string]: boolean });
      // 2. 然后将每个重复项与原二维数组进行比较，根据对应yAxis的show值，如果show是true，将第一个重复的显示，后续的置空
      const res: Array<MarkLineDataType | undefined> = [];
      markLineArrays.forEach((markLineArray: MarkLineDataType | undefined, index: number) => {
        const yAxisShow = yAxis[index].show;
        if (!markLineArray || markLineArray.length === 0) {
          // 2.1 空数组，直接添加
          res.push(undefined);
          return;
        }
        if (!yAxisShow) {
          // 2.2 Y轴不显示，则不显示该系列的markLine
          res.push(undefined);
          return;
        }
        // 2.3 先判断之前重复的是否已显示，如果已显示，则不操作；如果没有显示，则显示第一个重复的
        const data: MarkLineDataType = [];
        markLineArray.forEach((item: number | object) => {
          const key = JSON.stringify(item);
          const isRepeat = repeatSet.has(key);
          if (!isRepeat) {
            // 非重复项，直接添加
            data.push(item);
            return;
          }
          // 判断是否已被使用过
          if (!repeatUsed[key]) {
            // 未被使用过，则显示，并将该项设置为已被使用过
            data.push(item);
            repeatUsed[key] = true;
          }
        });
        res.push(data);
      });
      return res;
    }

    // 遍历data，遍历yAxis，如果yAxisShow是false，则将markLine的data置空
    const seriesArray = this.resultOption.series as LineSeriesOption[];
    const yAxis = this.resultOption.yAxis as Array<YAXisComponentOption>;
    if (seriesArray.length === 0) return this;
    const markLineArrays = data.map((item: OneDataType) => item.markLineArray);
    const markLineArraysFilter = filterRepeatMarkLine(markLineArrays, yAxis);
    console.log("markLineArraysFilter", markLineArraysFilter);
    for (let index = 0; index < markLineArraysFilter.length; index++) {
      const series = seriesArray[index];
      const yAxisShow = yAxis[index].show;
      const markLineArray = markLineArraysFilter[index];
      const markLineTemplate = JSON.parse(JSON.stringify(this.lineSeriesMarkLineTemplate));
      markLineArray?.forEach((markLine: number | object) => {
        if (typeof markLine === 'number') {
          (markLineTemplate.data as Array<any>).push({ yAxis: markLine });
        } else {
          (markLineTemplate.data as Array<any>).push(markLine);
        }
      });
      if (yAxisShow) {
        series.markLine = markLineTemplate;
      } else {
        series.markLine = { data: [] };
      }
    }
    return this;
  }

  /**
   * @description 设置自定义视觉映射
   * @param visualMapSreies 自定义视觉映射 例如：[ {min: 0, max: 100, color: 'green'}, {min: 100, max: 200, color: 'yellow'} ]
   * @returns this 链式调用
   */
  setVisualMap = () => {
    // 组装pieces，将min和max转换为gte和lte
    function packagePieces(visualMapSeries: VisualMapSeriesType, seriesData: SeriesDataType) {
      const res: Array<any> = [];
      const baseLine = visualMapSeries.baseLine;
      if (baseLine) {
        const mode = baseLine.mode;
        const baseLineData = baseLine.value;
        const baseValueArray = baseLineData.map((item: Array<number | string>) => +item[1]);
        const compareArray = seriesData.map((item: Array<number | string>) => +item[1]);
        const intervals = ArrayUtil.getGreaterValueIntervals(baseValueArray, compareArray, (baseValue: number, compareValue: number) => {
          let flag = false;
          switch (mode) {
            case 'above':
              flag = compareValue > baseValue;
              break;
            case 'below':
              flag = compareValue < baseValue;
              break;
            case 'equal':
              flag = compareValue === baseValue;
              break;
            default:
              break;
          }
          return flag;
        });
        console.log("intervals---------------", intervals);
        intervals.forEach((item: Array<number>) => {
          const obj: any = {
            gte: item[0],
            color: 'red'
          };
          if (item[0] === item[1]) {
            obj['lt'] = item[1] + 1;
          } else {
            obj['lte'] = item[1];
          }
          res.push(obj);
        });
      } else {
        const pieces = visualMapSeries.pieces;
        pieces.forEach((item: any) => {
          const obj = {
            gte: item.min,
            lte: item.max,
            color: item.color || 'red'
          };
          res.push(obj);
        });
      }
      return res;
    }

    this.resultOption.visualMap = [];
    const visualMap = this.resultOption.visualMap as any;
    this.seriesOptionArray.forEach((item: SeriesOptionType, index: number) => {
      if (!item.visualMapSeries) return;
      const color = (this.resultOption.series as LineSeriesOption[])[index].lineStyle?.color;
      (this.resultOption.series as LineSeriesOption[])[index].lineStyle = {};
      const pieces = packagePieces(item.visualMapSeries, item.seriesData);
      if (pieces.length === 0) return;
      const visualMapOne: any = {
        show: false,
        type: 'piecewise',
        pieces: pieces,
        seriesIndex: index,
        outOfRange: {
          color: color
        },
        dimension: item.visualMapSeries.baseLine ? 0 : 1, // 基准线存在时，dimension为0，否则为1
      };
      visualMap.push(visualMapOne);
    });
    return this;
  }

  /**
   * @description 设置echarts实例的myDeleteButton按钮的点击事件
   * @param callback myDeleteButton按钮的自定义点击事件回调函数
   * @returns this 链式调用
   */
  setMyDeleteButton = (callback: Function) => {
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
   * @description 重写echarts实例的SaveAsImage按钮的点击事件
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
   * @description 设置echarts实例的myThemeButton按钮的点击事件
   * @param callback myThemeButton按钮的自定义点击事件回调函数
   * @returns this 链式调用 
   */
  setMyThemeButtonClickEvent = (callback: Function) => {
    if (this.resultOption.toolbox) {
      const toolbox = this.resultOption.toolbox as ToolboxComponentOption;
      if (toolbox.feature && toolbox.feature.myThemeButton) {
        toolbox.feature.myThemeButton.onclick = callback;
      } else {
        console.error("myThemeButton is not defined in toolbox feature");
      }
    } else {
      console.error("toolbox is not defined in resultOption");
    }
    return this;
  }

  /** 
   * @description 设置echarts实例的放缩按钮的点击事件
   * @param callback 放缩按钮的自定义点击事件回调函数
   * @returns this 链式调用
   */
  setMyEnlargeShrinkButtonClickEvent = (callback: Function) => {
    if (this.resultOption.toolbox) {
      const toolbox = this.resultOption.toolbox as ToolboxComponentOption;
      if (toolbox.feature && toolbox.feature.myEnlargeShrinkButton) {

        toolbox.feature.myEnlargeShrinkButton.onclick = callback;
      } else {
        console.error("myEnlargeShrinkButton is not defined in toolbox feature");
      }
    } else {
      console.error("toolbox is not defined in resultOption");
    }
    return this;
  }

  /**
   * @description 设置echarts实例的myExcelView按钮的点击事件
   * @param callback myExcelView按钮的自定义点击事件回调函数
   * @returns this 链式调用
   */
  setMyExcelViewClickEvent = (callback: Function) => {
    if (this.resultOption.toolbox) {
      const toolbox = this.resultOption.toolbox as ToolboxComponentOption;
      if (toolbox.feature && toolbox.feature.myExcelView) {
        toolbox.feature.myExcelView.onclick = callback;
      } else {
        console.error("myExcelView is not defined in toolbox feature");
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
    feature.dataZoom.title = { zoom: lang === 'zh-cn' ? '区域缩放' : 'Zoom', back: lang === 'zh-cn' ? '区域缩放还原' : 'Zoom Reset' };
    feature.restore.title = lang === 'zh-cn' ? '还原' : 'Restore';
    feature.myThemeButton.title = lang === 'zh-cn' ? '切换到' + (this.swichThemeIcon === THEME_DARK ? '黑夜' : '白天') : 'switch to ' + (this.swichThemeIcon === THEME_DARK ? 'dark' : 'light');
    feature.myEnlargeShrinkButton.title = lang === 'zh-cn' ? (this.enlargeShrink === MODE_ENLARGE ? '缩小' : '放大') : (this.enlargeShrink === MODE_ENLARGE ? 'Shrink' : 'Enlarge');
    feature.myExcelView.title = lang === 'zh-cn' ? '数据视图' : 'Data View';
    feature.myDeleteButton.title = lang === 'zh-cn' ? '删除' : 'Delete';
    feature.mySaveAsImage.title = lang === 'zh-cn' ? '' : ''; // 这里不写按钮名称，否则保存的图片上会显示按钮名称
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
    this.seriesOptionArray.forEach((item: SeriesOptionType) => {
      item.seriesData.length > 0 && showYCount++;
    });
    if (showYCount === 0 || maxShowYCount === 0) {
      (this.resultOption.grid as GridComponentOption).left = this.gridLeftInit;
    } else {
      (this.resultOption.grid as GridComponentOption).left = this.gridLeftInit + this.offsetNum * (maxShowYCount - 1);
    }
    return this;
  }

  /**
   * @description 统一设置所有echarts实例的Y轴的显示
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
    console.log('graphics', graphics);
    const xAxisSeq1 = (graphics && graphics[0].xAxisSeq) || Math.floor(this.xAxisData.length / 3);
    // const xAxisSeq1 = (graphics && graphics[0].xAxisSeq) || 0;
    const xAxisSeq2 = (graphics && graphics[1].xAxisSeq) || Math.floor(this.xAxisData.length / 3) * 2;
    const xAxisX1 = this.xAxisData[xAxisSeq1];
    const xAxisX2 = this.xAxisData[xAxisSeq2];
    myChart.setOption({
      // 绘制markLine的graphic line
      graphic: [
        {
          ...this.getGraphicRectTemplate(myChart, GRAPHIC_RECT1_ID, xAxisSeq1, xAxisX1),
          ondrag: (e: any) => onPointDragging(this.computedTwoGraphicRect(e.target.x, myChart, GRAPHIC_RECT1_ID)),
          // draggable: false, // 禁止拖拽
        },
        {
          ...this.getGraphicRectTemplate(myChart, GRAPHIC_RECT2_ID, xAxisSeq2, xAxisX2),
          ondrag: (e: any) => onPointDragging(this.computedTwoGraphicRect(e.target.x, myChart, GRAPHIC_RECT2_ID)),
          // draggable: false, // 禁止拖拽
        }
      ],
    });
    return [
      { graphicId: GRAPHIC_RECT1_ID, positionX: myChart.convertToPixel({ xAxisId: XAXIS_ID }, xAxisSeq1), xAxisSeq: xAxisSeq1, xAxisX: xAxisX1 },
      { graphicId: GRAPHIC_RECT2_ID, positionX: myChart.convertToPixel({ xAxisId: XAXIS_ID }, xAxisSeq2), xAxisSeq: xAxisSeq2, xAxisX: xAxisX2 }
    ]
  }

  setMyGraphic = (myChart: any, xAxisSeq: number, option: GraphicComponentOption) => {
    const GRAPHIC_RECT1_ID = 'rect1'; // 矩形图形元素1的id
    const xAxisX = this.xAxisData[xAxisSeq];
    const positionX = myChart.convertToPixel({ xAxisId: XAXIS_ID }, xAxisSeq); // 图形元素的X轴坐标转为像素值
    myChart.setOption({
      // 绘制markLine的graphic line
      graphic: [
        {
          ...this.getGraphicRectTemplate_1(myChart, xAxisSeq),
          // ondrag: (e: any) => onPointDragging(this.computedTwoGraphicRect(e.target.x, myChart, GRAPHIC_RECT1_ID)),
          id: GRAPHIC_RECT1_ID,
          position: [positionX, 0],
          info: xAxisX,
          textContent: {
            style: {
              text: xAxisX,
            }
          },
          draggable: false, // 禁止拖拽
          ...option
        }
      ],
    });

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
  getGraphicRectTemplate = (myChart: any, graphicId: string, xAxisSeq: number, graphicXAxisX: string) => {
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

  //todo: 待实现 
  getGraphicRectTemplate_1 = (myChart: any, xAxisSeq: number) => {
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
    return {
      id: '',
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
      position: [0, 0],
      draggable: 'horizontal',// 这个属性让圆点可以被拖拽。
      //设置长方形的样式，透明度设置为0时，该长方形不可见
      //  invisible: true,// 这个属性让长方形不可见（但是不影响他响应鼠标事件）。
      info: '',
      textContent: {
        type: 'text',
        style: {
          text: '',
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
   * @param positionX 当前拖拽线条的X值,距离echarts左侧边框距离（包含grid）
   * @param myChart echarts实例 
   * @param currentDragGraphicId 当前拖拽的图形的id 
   * @param notDragGraphicId 未拖动的图形的id 
   * @returns
   */
  computedTwoGraphicRect = (positionX: number, myChart: any, currentDragGraphicId: string): GraphicLocationInfoType => {
    const xAxisSeq = myChart.convertFromPixel({ xAxisId: XAXIS_ID }, positionX); // 图形元素x轴坐标序号：从0开始
    const currentDragGraphicXAxisX: string = this.xAxisData[xAxisSeq];
    return {
      graphicId: currentDragGraphicId,
      positionX,
      xAxisSeq,
      xAxisX: currentDragGraphicXAxisX
    };
  }

  /**
   * @description 设置字体大小和其他自适应
   * @param myChart echarts实例
   * @returns this 链式调用
   */
  setFontSizeAndMoreAuto = (height: number, useGraphicLocation: boolean = true) => {
    // console.log('setFontSizeAndMoreAuto', height);
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
    const grid = this.resultOption.grid as GridComponentOption;
    grid.top = usedStandards.grid.top;
    grid.bottom = usedStandards.grid.bottom;
    // toolbox
    const toolbox = this.resultOption.toolbox as ToolboxComponentOption;
    toolbox.top = usedStandards.toolbox.top;
    toolbox.itemSize = usedStandards.toolbox.itemSize;
    toolbox.itemGap = usedStandards.toolbox.itemGap;
    // xAxis
    const xAxis = (this.resultOption.xAxis as Array<any>)[0];
    xAxis.axisLabel.fontSize = usedStandards.fontSize;
    xAxis.nameTextStyle.fontSize = usedStandards.fontSize;
    // yAxis
    (this.resultOption.yAxis as Array<YAXisComponentOption>).forEach((yAxis: any) => {
      yAxis.axisLabel.fontSize = usedStandards.fontSize;
      yAxis.nameTextStyle.fontSize = usedStandards.fontSize;
    });
    usedStandards.echartsHeight = height;
    console.log('usedStandards----------------------------', usedStandards);
    this.usedStandards = usedStandards;
    return this;
  }

  /**
   * @description 根据xAxisName的文本宽度设置grid的right属性
   * @param width 容器宽度
   * @returns 
   */
  setGridRightByXAxisName = (width: number) => {
    // 计算文本宽度
    function calculateTextWidth(text: string, fontSize: number) {
      // 创建一个canvas元素
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context === null) return 0;

      // 设置字体样式
      context.font = `${fontSize}px Arial`;

      // 测量文本宽度
      const metrics = context.measureText(text);
      return metrics.width;
    }

    function setGridrightAndxAxis(grid: GridComponentOption, xAxis: any, right: number) {
      grid.right = right;
      xAxis.nameTextStyle.align = 'left';
      xAxis.nameTextStyle.padding = 0;
      xAxis.nameGap = 5;
    }
    console.log("容器宽度：" + width);
    const xAxis = (this.resultOption.xAxis as Array<any>)[0];
    const grid = this.resultOption.grid as GridComponentOption;
    const name = xAxis.name;
    // 如果没有设置xAxis.name，则不重新设置grid.right
    if (name === '') return this;
    // 根据文字的fontsize，计算所有文字的宽度
    const fontSize = xAxis.nameTextStyle.fontSize;
    const textWidth = calculateTextWidth(name, fontSize);
    // 获取grid的原始right值
    let rightValue = grid.right as number | string;
    if (typeof rightValue === 'string') {
      if (rightValue.endsWith('%')) {
        rightValue = width * parseFloat(rightValue.slice(0, -1)) / 100 as number;
      } else {
        rightValue = 10;
      }
    }
    console.log("原始right值：" + rightValue);
    console.log("计算后的文本宽度：" + textWidth);
    if (textWidth === 0) return this;
    if (rightValue <= textWidth) {
      // 计算后的文本有宽度，并且原始right值小于文本宽度，则将grid.right设置为文字的宽度加上一定的偏移量
      if (textWidth - rightValue < 10) {
        setGridrightAndxAxis(grid, xAxis, textWidth + 10);
      } else {
        setGridrightAndxAxis(grid, xAxis, textWidth + 15);
      }
    } else {
      if (rightValue - textWidth < 5) {
        // 原始right值大于文本宽度，并且差值小于5，则偏移量设置为10
        setGridrightAndxAxis(grid, xAxis, textWidth + 15);
      } else if (rightValue - textWidth < 10) {
        setGridrightAndxAxis(grid, xAxis, textWidth + 10);
      } else {
        // ...
      }
    }
    return this;
  }

  getXAxisData = () => {
    return this.xAxisData;
  }

  getResultOption = () => {
    return this.resultOption;
  }
}

/**
 * @description 根据主题进行颜色判断
 * 1.有主题按钮时，则颜色值必须是数组，且长度为2，否则抛出异常
 * 2.没有主题按钮时，则颜色值可以是字符串或者数组，如果是数组，取第一个元素作为颜色值
 * @param colorValue 
 * @param hasThemeButton 
 * @returns 
 */
const colorJudge = (colorValue: Array<string> | string, hasThemeButton: boolean) => {
  if (hasThemeButton) {
    // 有主题按钮时，则颜色值必须是数组，且长度为2，否则抛出异常
    if (Array.isArray(colorValue) && colorValue.length === 2) {
      return colorValue;
    } else {
      throw new Error('color属性值必须是长度为2的数组');
    }
  } else {
    // 没有主题按钮时，则颜色值可以是字符串或者数组，如果是数组，取第一个元素作为颜色值
    if (Array.isArray(colorValue)) {
      return colorValue[0];
    } else {
      return colorValue;
    }
  }
}

/**
 * @description 递归合并option，主要是grid、toolbox、xAxis等属性的合并
 * 1.自定义配置优先级更高, 相同属性值进行合并, 不同属性值直接赋值
 * 2.颜色属性判断是否符合要求, 单独处理
 * @param target 目标对象
 * @param extraOption 自定义的额外配置
 * @param hasThemeButton 是否有主题按钮
 */
export const mergeDeepOption = (target: any, extraOption: { [key: string]: any } | undefined, hasThemeButton: boolean) => {
  if (!extraOption) return target;
  for (const key in extraOption) {
    if (!Reflect.has(extraOption, key)) continue;
    if (key === COLOR_KEY) {
      // 1.颜色属性处理
      const colorValue = extraOption[key] as Array<string> | string;
      const colorJudgeResult = colorJudge(colorValue, hasThemeButton);
      hasThemeButton ? (target[COLOR_CACHE_KEY] = colorJudgeResult) : (target[COLOR_KEY] = colorJudgeResult);
      continue;
    }
    if (!Reflect.has(target, key)) {
      // 2.新属性，目标对象中不存在该属性，直接赋值
      target[key] = extraOption[key];
      continue;
    }
    // 3.属性存在
    if (typeof extraOption[key] === 'object' && extraOption[key] !== null) {
      // 自定义属性值是对象或者数组，归一化
      let customOptionValue = extraOption[key];
      if (Array.isArray(extraOption[key])) {
        // 如果是数组，取第一个元素作为自定义属性值
        customOptionValue = extraOption[key][0];
      }
      // 递归合并
      if (typeof target[key] === 'object') {
        if (Array.isArray(target[key])) {
          // 如果是数组，取第一个元素作为自定义属性值
          target[key][0] = mergeDeepOption(target[key][0], customOptionValue, hasThemeButton);
        } else {
          // 自定义属性值是对象，目标对象也是对象，递归合并
          target[key] = mergeDeepOption(target[key], customOptionValue, hasThemeButton);
        }
      }
    } else {
      // 属性值是简单类型，直接赋值
      target[key] = extraOption[key];
    }
  }
  return target;
}

// 设置模版option
export const setMergedOptionTemplate = (extraOption: { [key: string]: any } | undefined) => {
  // 判断是否有主题按钮
  function judgeHasThemeButton(extraOption: any) {
    const myThemeButton = extraOption?.toolbox?.feature?.myThemeButton;
    if (myThemeButton && Reflect.has(myThemeButton, 'show') && myThemeButton.show === false) {
      return false;
    }
    return true;
  }
  // 这里必须对optionTemplate进行深拷贝，否则一个页面修改了optionTemplate后会影响其他其他页面使用
  const res = mergeDeepOption(ObjUtil.deepCopy(optionTemplate), extraOption, judgeHasThemeButton(extraOption));
  // console.log('mergedOptionTemplate-----------', res);
  if (res && Object.keys(res).length !== 0) {
    mergedOptionTemplate = res;
    return;
  }
  mergedOptionTemplate = optionTemplate;
}