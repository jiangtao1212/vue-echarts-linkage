<!--
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-09-06 10:05:35
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-09-06 10:16:17
 * @FilePath: \vue-echarts-linkage\src\demo\demo3.vue
 * @Description: 添加测试自定义新增空白echarts实例（一个echarts内多series）
-->

<template>
  <div class="btn-container">
    <el-button type="primary" @click="addLinkageBtnClick()">新增echarts实例</el-button>
    <el-button type="primary" @click="addLotEmptyLinkageBtnClick()">批量新增空白echarts实例-多series</el-button>
    <el-button type="primary" @click="updateAllLinkageBtnClick()">批量更新echarts实例</el-button>
    <el-button type="primary" @click="addLinkageLineSeriesBtnClick()">新增line-series</el-button>
    <el-button type="primary" @click="addLinkageBarSeriesBtnClick()">新增bar-series</el-button>
    <div class="drag-rect drag-rect-line" draggable="true"><span>可拖拽进line-series图表</span></div>
    <div class="drag-rect drag-rect-bar" draggable="true"><span>可拖拽进bar-series图表</span></div>
  </div>
  <!-- 可自定义配置显示列数(cols) | 最大图表数(echarts-max-count) | 空白图表数(empty-echart-count) -->
  <EchartsLinkag ref="echartsLinkageRef" :cols="1" :echarts-max-count="10" @drop-echart="dropEchart" />
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RandomUtil } from "@/utils/index";
import { VueEchartsLinkage, type OneDataType, type seriesTagType, type dropEchartType  } from 'vue-echarts-linkage';
import "vue-echarts-linkage/dist/style.css";

const echartsLinkageRef = ref<InstanceType<typeof VueEchartsLinkage>>();
let seriesType = 'line' as 'line' | 'bar';

// 新增按钮
const addLinkageBtnClick = () => {
  const seriesData = RandomUtil.getSeriesData(1300);
  const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
  const oneDataType: OneDataType = {
    name: `新增图表${maxEchartsIdSeq + 1}`,
    type: 'line', seriesData: seriesData,
    markLineArray: [RandomUtil.getRandomDataFromInterval(0, 1000), RandomUtil.getRandomDataFromInterval(0, 1000)]
  };
  echartsLinkageRef.value!.addEchart(oneDataType);
}

// 批量新增空白echarts，携带legend数据
const addLotEmptyLinkageBtnClick = () => {
  for (let i = 0; i < 3; i++) {
    const oneDataTypeArray: OneDataType[] = [];
    for (let i = 0; i < 6; i++) {
      const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
      const oneDataType: OneDataType = {
        name: `新增图表${maxEchartsIdSeq + 1}-${Math.floor(Math.random() * 100)}`,
        type: 'line',
        seriesData: [],
      };
      oneDataTypeArray.push(oneDataType);
    }
    echartsLinkageRef.value!.addEchart(oneDataTypeArray);
  }
}

// 批量更新按钮
const updateAllLinkageBtnClick = () => {
  const allDistinctSeriesTagInfo: seriesTagType[] = echartsLinkageRef.value?.getAllDistinctSeriesTagInfo() as seriesTagType[];
  console.log('allDistinctSeriesTagInfo', allDistinctSeriesTagInfo);
  const res: { [key: string]: Array<number[]> } = {};
  allDistinctSeriesTagInfo.forEach(item => {
    item.seriesData = RandomUtil.getSeriesData(1000);
  });
  echartsLinkageRef.value?.updateAllEcharts(allDistinctSeriesTagInfo);
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
  const seriesData = RandomUtil.getSeriesData(1300);
  const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
  id = id || 'echart' + maxEchartsIdSeq;
  const random = Math.floor(Math.random() * 100);
  const oneDataType: OneDataType = { name: `新增图表${maxEchartsIdSeq}-${random}`, type: type, seriesData: seriesData };
  echartsLinkageRef.value!.addEchartSeries(id, oneDataType);
}

// 拖拽回调事件
const dropEchart = (data: dropEchartType) => {
  addLinkageSeriesCommon(seriesType, data.id);
}

// 监听拖拽事件
const initLisener = () => {
  const dragRectLine: HTMLElement = document.querySelector('.drag-rect-line') as HTMLElement;
  const dragRectBar: HTMLElement = document.querySelector('.drag-rect-bar') as HTMLElement;

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
