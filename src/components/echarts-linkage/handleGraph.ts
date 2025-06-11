/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2025-03-25 14:25:12
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-06-11 09:42:17
 * @FilePath: \vue-echarts-linkage\src\components\echarts-linkage\handleGraph.ts
 * @Description: 处理图形
 */

import echarts from "@/models/my-echarts/index";
import { XAXIS_ID } from "@/models/echarts-linkage-model/staticTemplates"
import type { SeriesIdDataType, GraphicLocationInfoType, ListenerGrapicLocationType, DataAboutType } from './types/index';
import Extension from './extension';

const LISTENER_GRAPHIC_LOCATION = 'listener-graphic-location';
let emit: any;

let animating = false;
// 判断是否需要更新图形
const isNeedUpdateGraphic = (item: SeriesIdDataType, currentEchartsId: string, props: any) => {
  let isNeedUpdate = true;
  if (!props.isLinkage && (item.id !== currentEchartsId)) isNeedUpdate = false; // 非联动状态，只处理当前实例的图形
  if (!item.data || item.data.length === 0 || !item.xAxisdata || item.xAxisdata.length === 0 || item.data[0].name === '') isNeedUpdate = false; // 数据为空，不更新图形
  return isNeedUpdate;
}

/**
 * @description 监听datazoom事件，计算当前实例的图形位置信息，赋值给其他实例，并且触发更新
 * 联动模式下：datazoom事件会在所有图表中触发，所以这里只计算第一个实例的图形，然后赋值给其他实例
 * 非联动模式下：只处理当前实例的图形
 * @param graphicLocation 图形位置信息
 * @param currentEchartsId 当前实例id
 * @param xAxisData x轴数组数据
 */
const datazoomEvent = (graphicLocation: GraphicLocationInfoType[] | undefined, currentEchartsId: string, xAxisData: string[], props: any, dataAbout: DataAboutType) => {
  // console.log('datazoomEvent', graphicLocation, currentEchartsId, xAxisData);
  // console.log('datazoomEvent', params.batch[0].startValue, params.batch[0].endValue); // 这里可以获取当前实例的datazoom范围
  if (props.isLinkage && (dataAbout.data[0].id !== currentEchartsId)) return; // 联动模式下，只需处理计算第一个实例的图形
  if (animating || !graphicLocation) return; // 防止动画过程中重复触发
  animating = true;
  requestAnimationFrame(() => {
    // 联动模式下，datazoom事件会在所有图表中触发，所以这里只计算第一个实例的图形，然后赋值给其他实例
    const element: HTMLElement = document.getElementById(currentEchartsId) as HTMLElement;
    const myChart: echarts.ECharts | undefined = echarts.getInstanceByDom(element);
    const datazoomGraphic = props.isGraphicZoom ? Extension.computerDatazoomGraphicByZoom(myChart, graphicLocation, xAxisData) : Extension.computerDatazoomGraphicNotByZoom(myChart, graphicLocation, xAxisData);
    // 赋值给所有实例，并且触发更新
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      if (!isNeedUpdateGraphic(item, currentEchartsId, props)) return; // 不更新图形
      item.graphics = datazoomGraphic;
      const element: HTMLElement = document.getElementById(item.id) as HTMLElement;
      const myChart: echarts.ECharts = echarts.getInstanceByDom(element) as echarts.ECharts;
      setOptionGraphic(myChart, datazoomGraphic);
    });
    emitGraphicLocation(dataAbout, currentEchartsId);
    animating = false;
  });
}

/**
 * @description 更新图形, 这里只更新当前实例的图形：positionX不变，xAxisSeq和xAxisX根据positionX计算后更新
 * @param graphicLocation 图形位置信息
 * @param currentEchartsId 当前实例id
 * @param xAxisData x轴数组数据
 * @param dataAbout 数据对象
 */
const updateGraphic = (graphicLocation: GraphicLocationInfoType[] | undefined, currentEchartsId: string, xAxisData: string[], dataAbout: DataAboutType) => {
  if (!graphicLocation) return;
  requestAnimationFrame(() => {
    const element: HTMLElement = document.getElementById(currentEchartsId) as HTMLElement;
    const myChart: echarts.ECharts | undefined = echarts.getInstanceByDom(element);
    const datazoomGraphic = Extension.computerDatazoomGraphicByZoom(myChart, graphicLocation, xAxisData);
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      if (item.id !== currentEchartsId) return; // 不是当前实例，不更新图形
      item.graphics = datazoomGraphic;
      const element: HTMLElement = document.getElementById(item.id) as HTMLElement;
      const myChart: echarts.ECharts = echarts.getInstanceByDom(element) as echarts.ECharts;
      setOptionGraphic(myChart, datazoomGraphic);
    });
    emitGraphicLocation(dataAbout, currentEchartsId);
  });
}

/**
 * @description 图形移动联动, 使用requestAnimationFrame优化性能
 * @param params 图形位置信息
 * @param currentEchartsId 当前实例id
 */
const graphicDragLinkage = (graphicLocation: GraphicLocationInfoType, currentEchartsId: string, dataAbout: DataAboutType, props: any) => {
  if (animating) return;
  animating = true;
  requestAnimationFrame(() => {
    dataAbout.data.forEach((item: SeriesIdDataType) => {
      // console.log('graphicDragLinkage', item.id, graphicLocation.graphicId);
      if (!isNeedUpdateGraphic(item, currentEchartsId, props)) return; // 不更新图形
      // 注意：这里必须根据id重新获取最新的echarts实例，否则会导致后续实例渲染出现问题
      const element: HTMLElement = document.getElementById(item.id) as HTMLElement;
      const myChart: echarts.ECharts = echarts.getInstanceByDom(element) as echarts.ECharts;
      let notDragGraphic: GraphicLocationInfoType = {} as any;
      item.graphics && item.graphics.forEach((graphic: GraphicLocationInfoType) => {
        if (graphic.graphicId === graphicLocation.graphicId) {
          graphic.positionX = graphicLocation.positionX;
          graphic.xAxisSeq = graphicLocation.xAxisSeq;
          graphic.xAxisX = graphicLocation.xAxisX;
          graphic = handleGraphicOutOfRange(graphicLocation, myChart, item.xAxisdata as string[]);
        } else {
          notDragGraphic = graphic;
          notDragGraphic.xAxisSeq = myChart.convertFromPixel({ xAxisId: XAXIS_ID }, notDragGraphic.positionX);
          const seq = notDragGraphic.xAxisSeq;
          notDragGraphic.xAxisX = (item.xAxisdata && item.xAxisdata[seq]) ? item.xAxisdata[seq].toString() : '';
          notDragGraphic = handleGraphicOutOfRange(notDragGraphic, myChart, item.xAxisdata as string[]);
        }
      });
      setOptionGraphic(myChart, [graphicLocation, notDragGraphic]);
    });
    emitGraphicLocation(dataAbout, currentEchartsId);
    animating = false;
  });
};

// 处理超出x轴范围的图形
const handleGraphicOutOfRange = (graphicLocation: GraphicLocationInfoType, myChart: echarts.ECharts, xAxisData: string[]) => {
  // console.log('handleGraphicOutOfRange', graphicLocation);
  const xAxisSeq = graphicLocation.xAxisSeq;
  if (xAxisSeq < 0) {
    graphicLocation.xAxisSeq = 0;
    graphicLocation.positionX = myChart.convertToPixel({ xAxisId: XAXIS_ID }, graphicLocation.xAxisSeq);
    graphicLocation.xAxisX = xAxisData[graphicLocation.xAxisSeq];
  } else if (xAxisSeq >= xAxisData.length) {
    graphicLocation.xAxisSeq = xAxisData.length - 1;
    graphicLocation.positionX = myChart.convertToPixel({ xAxisId: XAXIS_ID }, graphicLocation.xAxisSeq);
    graphicLocation.xAxisX = xAxisData[graphicLocation.xAxisSeq];
  }
  return graphicLocation;
}

/**
 * @description 渲染图形
 * @param myChart echarts实例
 * @param graphics 图形元素数组
 */
const setOptionGraphic = (myChart: echarts.ECharts, graphics: GraphicLocationInfoType[]) => {
  myChart.setOption({
    graphic: [
      {
        id: graphics[0].graphicId,
        type: 'rect', // 这里必须要添加图形类型，否则打包后发布新版本再引入会报错
        position: [graphics[0].positionX, 0],
        info: graphics[0].xAxisX,
        textContent: {
          type: 'text',
          style: {
            text: graphics[0].xAxisX,
          }
        },
      },
      {
        id: graphics[1].graphicId,
        type: 'rect',
        position: [graphics[1].positionX, 0],
        info: graphics[1].xAxisX,
        textContent: {
          type: 'text',
          style: {
            text: graphics[1].xAxisX,
          }
        },
      }
    ],
  });
}

// 组装所有图形数据，发送给父组件（1.初始化时调用，2.移动图形时调用）
const emitGraphicLocation = (dataAbout: DataAboutType, currentEchartsId: string = '') => {
  const graphicLocation: ListenerGrapicLocationType = [];
  dataAbout.data.forEach((item: SeriesIdDataType) => {
    let isCurrentHandleEcharts = false;
    if (item.id === currentEchartsId) {
      isCurrentHandleEcharts = true;
    }
    graphicLocation.push({ id: item.id, graphics: item.graphics ? JSON.parse(JSON.stringify(item.graphics)) : [], isCurrentHandleEcharts });
  });
  emit(LISTENER_GRAPHIC_LOCATION, graphicLocation);
}

// 设置emit
const setEmit = (_emit: any) => {
  emit = _emit;
}

export default {
  datazoomEvent,
  graphicDragLinkage,
  updateGraphic,
  setEmit,
  emitGraphicLocation,
  LISTENER_GRAPHIC_LOCATION
}

