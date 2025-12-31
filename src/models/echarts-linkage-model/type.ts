/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2025-12-31 16:57:00
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-12-31 17:04:26
 * @FilePath: \vue-echarts-linkage\src\models\echarts-linkage-model\type.ts
 * @Description: 联动图表模型相关类型
 */
import type {
  TooltipFormatterCallback,
  TooltipFormatterCallbackParams
} from "@/models/my-echarts/index";

import type {
  VisualMapSeriesType, SeriesDataType, SegementType,
  ThemeType, SeriesType, ExtraTooltipType, EnlargeShrinkType,
  SeriesClassType
} from "@/components/echarts-linkage/types/index";

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
 * @param yAxisAlignTicks y轴对齐方式，默认true
 * @param seriesYAxisIndex series的y轴索引
 * @param visualMapSeries 视觉映射系列
 * @param dataType series数据类型
 * @param seriesLinkMode 是否为连接模式
 */
export type SeriesOptionType = {
  type?: SeriesClassType, // 图表类型, line 折线图， bar 柱状图 --- 默认值为line折线图
  name?: string, // 图表名称
  smooth?: true,
  seriesData: SeriesDataType, // 数据系列
  seriesDataCache: SeriesDataType, // 缓存数据系列
  xAxisName?: string, // x轴名称
  yAxisName?: string, // y轴名称
  yAxisShow?: boolean; // y轴是否显示
  yAxisMin?: number; // y轴下限
  yAxisMax?: number; // y轴上限
  yAxisAlignTicks?: boolean; // y轴对齐方式，默认true
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
 */
export type EchartsLinkageModelType = {
  segment?: SegementType,
  echartsColors?: Array<string>,
  useMergedLegend?: boolean,
  seriesOptionArray: Array<SeriesOptionType>,
  theme: ThemeType,
  extraTooltip?: ExtraTooltipType,
  enlargeShrink?: EnlargeShrinkType,
  tooltipFormatter?: string | TooltipFormatterCallback<TooltipFormatterCallbackParams>,
}

// EchartsLinkageModelType 去除 segment、echartsColors、useMergedLegend
export type OmittedEchartsLinkageModelType = Omit<EchartsLinkageModelType, 'segment' | 'echartsColors' | 'useMergedLegend'>;

/**
 * @description 视觉映射显示在tooltip中的模式
 * @param {string} pieces 视觉映射显示在tooltip中的模式，pieces：显示视觉映射的pieces区间内容；baseLine：显示视觉映射的基准线内容；not：不显示视觉映射内容
 */
export type VisualMapShowOnToolTipModeType = 'pieces' | 'baseLine' | 'not';