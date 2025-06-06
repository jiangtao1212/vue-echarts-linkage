import * as echarts from "echarts/core";
import { BarChart, LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TooltipComponent, LegendComponent, ToolboxComponent, DataZoomComponent, VisualMapComponent, GridComponent, GraphicComponent, MarkLineComponent } from 'echarts/components';

// 注册必须的组件
echarts.use([
  BarChart,
  LineChart,
  CanvasRenderer,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent,
  DataZoomComponent,
  VisualMapComponent,
  GridComponent,
  GraphicComponent,
  MarkLineComponent
]);

// import * as echarts from 'echarts';
export default echarts;
export type {
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
} from "echarts";
