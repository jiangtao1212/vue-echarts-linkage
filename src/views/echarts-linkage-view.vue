<template>
  <div class="btn-container">
    <el-button type="primary" @click="addLinkageBtnClick()">新增echarts实例</el-button>
    <el-button type="primary" @click="addLotEmptyLinkageBtnClick()">批量新增空白echarts实例-多series</el-button>
    <el-button type="primary" @click="updateAllLinkageBtnClick()">批量更新echarts实例</el-button>
    <el-button type="primary" @click="clearAllEchartsData()">批量清除echarts实例数据</el-button>
    <el-button type="primary" @click="replaceAllEchartsData()">批量替换echarts实例数据</el-button>
    <el-button type="primary" @click="addLinkageLineSeriesBtnClick()">新增line-series</el-button>
    <el-button type="primary" @click="addLinkageBarSeriesBtnClick()">新增bar-series</el-button>
    <div class="drag-rect drag-rect-line" draggable="true"><span>可拖拽进line-series图表</span></div>
    <div class="drag-rect drag-rect-bar" draggable="true"><span>可拖拽进bar-series图表</span></div>
    <div class="drag-rect drag-rect-switch" draggable="true"><span>可拖拽进开关量图表</span></div>
  </div>
  <!-- 可自定义配置显示列数(cols) | 最大图表数(echarts-max-count) | 空白图表数(empty-echart-count) -->
  <EchartsLinkag ref="echartsLinkageRef" :cols="1" :echarts-max-count="10"
    :echarts-colors="['red', 'blue', 'green', 'yellow', 'goldenrod', 'pink']" language="zh-cn"
    grid-align
    theme="light"
    @drop-echart="dropEchart" />
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RandomUtil } from "@/utils/index";
import EchartsLinkag from "@/components/echarts-linkage/index.vue";
import type { OneDataType, SeriesTagType, DropEchartType } from '@/components/echarts-linkage/types/index';

const echartsLinkageRef = ref<InstanceType<typeof EchartsLinkag>>();
let seriesType = 'line' as 'line' | 'bar';
let switchFlag = false;

// 新增按钮
const addLinkageBtnClick = () => {
  const seriesData = RandomUtil.getSeriesData(1300);
  const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
  const oneDataType: OneDataType = {
    name: `新增图表${maxEchartsIdSeq + 1}`,
    type: 'line',
    seriesData: seriesData,
    markLineArray: [RandomUtil.getRandomDataFromInterval(0, 1000), RandomUtil.getRandomDataFromInterval(0, 1000)]
  };
  echartsLinkageRef.value!.addEchart(oneDataType);
}

// 批量新增空白echarts，携带legend数据
const addLotEmptyLinkageBtnClick = () => {
  for (let i = 0; i < 3; i++) {
    const oneDataTypeArray: OneDataType[] = [];
    for (let j = 0; j < 6; j++) {
      const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
      const oneDataType: OneDataType = {
        name: `新增图表${maxEchartsIdSeq + 1}-${Math.floor(Math.random() * 1000)}`,
        type: 'line',
        seriesData: [],
        customData: `新增图表${maxEchartsIdSeq + 1}-${Math.floor(Math.random() * 1000)}`,
        xAxisName: '[m]',
        yAxisName: `[${Math.floor(Math.random() * 10) > 5 ? 'mm' : '℃'}]`,
      };
      oneDataTypeArray.push(oneDataType);
    }
    echartsLinkageRef.value!.addEchart(oneDataTypeArray);
  }
}

// 批量更新按钮
const updateAllLinkageBtnClick = () => {
  const allDistinctSeriesTagInfo: SeriesTagType[] = echartsLinkageRef.value?.getAllDistinctSeriesTagInfo() as SeriesTagType[];
  console.log("allDistinctSeriesTagInfo", allDistinctSeriesTagInfo);
  const res: { [key: string]: Array<number[]> } = {};
  allDistinctSeriesTagInfo.forEach((item: SeriesTagType, index: number) => {
    if (index >= 18) {
      item.seriesData = [];
    } else {
      item.seriesData = RandomUtil.getSeriesData(1000);
    }
  });
  echartsLinkageRef.value?.updateAllEcharts(allDistinctSeriesTagInfo);
}

// 批量清除echarts实例数据
const clearAllEchartsData = () => {
  echartsLinkageRef.value?.clearAllEchartsData();
}

// 批量替换echarts实例数据
const replaceAllEchartsData = () => {
  const res: Array<OneDataType[]> = [];
  for (let i = 0; i < 4; i++) {
    const oneDataTypeArray: OneDataType[] = [];
    for (let j = 0; j < 5; j++) {
      const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
      const oneDataType: OneDataType = {
        name: `新增图表${maxEchartsIdSeq + 1}-${Math.floor(Math.random() * 1000)}`,
        type: 'line',
        seriesData: RandomUtil.getSeriesData(1000),
        customData: `新增图表${maxEchartsIdSeq + 1}-${Math.floor(Math.random() * 1000)}`,
        xAxisName: '[m]',
        yAxisName: `[${Math.floor(Math.random() * 10) > 5 ? 'mm' : '℃'}]`,
      };
      oneDataTypeArray.push(oneDataType);
    }
    res.push(oneDataTypeArray);
  }
  echartsLinkageRef.value?.replaceAllEchartsData(res);
}

// 新增line-series按钮
const addLinkageLineSeriesBtnClick = () => {
  seriesType = 'line';
  addLinkageSeriesCommon(seriesType);
}

// 新增bar-series按钮
const addLinkageBarSeriesBtnClick = () => {
  seriesType = 'bar';
  addLinkageSeriesCommon(seriesType);
}

// 新增series按钮
const addLinkageSeriesCommon = (type: 'line' | 'bar' = 'line', id?: string) => {
  let seriesData = RandomUtil.getSeriesData(1300);
  if (switchFlag) {
    seriesData = RandomUtil.getSwitchData(1300);
  }
  const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
  id = id || 'echart' + maxEchartsIdSeq;
  const random = Math.floor(Math.random() * 100);
  const oneDataType: OneDataType = { name: `新增图表${maxEchartsIdSeq}-${random}`, type: type, seriesData: seriesData };
  if (switchFlag) {
    oneDataType.dataType = 'switch';
    switchFlag = false;
  }
  echartsLinkageRef.value!.addEchartSeries(id, oneDataType);
}

// 拖拽回调事件
const dropEchart = (data: DropEchartType) => {
  addLinkageSeriesCommon(seriesType, data.id);
}

// 监听拖拽事件
const initLisener = () => {
  const dragRectLine: HTMLElement = document.querySelector('.drag-rect-line') as HTMLElement;
  const dragRectBar: HTMLElement = document.querySelector('.drag-rect-bar') as HTMLElement;
  const dragSwitch: HTMLElement = document.querySelector('.drag-rect-switch') as HTMLElement;

  dragRectLine.addEventListener('dragstart', (e: DragEvent) => {
    console.log("dragstart");
    seriesType = 'line';
    e.dataTransfer!.setData('text', "123");
    e.dataTransfer!.dropEffect = 'move';
  });
  dragRectBar.addEventListener('dragstart', (e: DragEvent) => {
    console.log("dragstart");
    seriesType = 'bar';
    e.dataTransfer!.setData('text', "123");
    e.dataTransfer!.dropEffect = 'move';
  });
  dragSwitch.addEventListener('dragstart', (e: DragEvent) => {
    console.log("dragstart");
    seriesType = 'line';
    e.dataTransfer!.setData('text', "123");
    e.dataTransfer!.dropEffect = 'move';
    switchFlag = true;
  });
}

const init = () => {
  initLisener();
  addLotEmptyLinkageBtnClick();
}

onMounted(() => {
  init();
});
</script>

<style scoped lang="less">
.btn-container {
  height: 5vh;
  padding: 10px;
  display: flex;
  align-items: center;
  column-gap: 10px;

  .drag-rect {
    border-radius: 10px;
    padding: 8px 15px;
    background-image: linear-gradient(to right, #4286f4, #00b4d8);
    border: 1px solid #00b4d8;
    display: flex;
    justify-content: center;
    align-items: center;

    span {
      color: #fff;
      font-size: 14px;
      line-height: 14px;
    }
  }
}

.echarts-linkage-container {
  width: 100vw;
  height: 95vh;
}
</style>
<style scoped lang="less">
.el-button {
  margin-left: 0;
}
</style>
