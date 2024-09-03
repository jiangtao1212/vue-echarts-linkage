<template>
  <div class="btn-container">
    <el-button type="primary" @click="addLinkageBtnClick()">新增echarts实例</el-button>
    <el-button type="primary" @click="addLinkageLineSeriesBtnClick()">新增line-series</el-button>
    <el-button type="primary" @click="addLinkageBarSeriesBtnClick()">新增bar-series</el-button>
    <div class="drag-rect drag-rect-line" draggable="true"><span>可拖拽进line-series图表</span></div>
    <div class="drag-rect drag-rect-bar" draggable="true"><span>可拖拽进bar-series图表</span></div>
  </div>
  <!-- 自定义配置显示列数为2，最大图表数为10 -->
  <VueEchartsLinkage ref="echartsLinkageRef" :cols="2" :echarts-max-count="10" />
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RandomUtil } from "@/utils/index";
import { VueEchartsLinkage } from 'vue-echarts-linkage';
import "vue-echarts-linkage/dist/style.css";
import type { OneDataType } from 'echartsLinkageType';

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

const initLisener = () => {
  const dragRectLine: HTMLElement = document.querySelector('.drag-rect-line') as HTMLElement;
  const dragRectBar: HTMLElement = document.querySelector('.drag-rect-bar') as HTMLElement;
  const echartsLinkageContainer: HTMLElement = document.querySelector('.echarts-linkage-container') as HTMLElement;

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
  echartsLinkageContainer.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
  });
  echartsLinkageContainer.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();
    console.log("drop");
    const data = e.dataTransfer!.getData('text');
    // console.log(e);
    const id = (e.target as HTMLElement).parentElement!.offsetParent!.id;
    addLinkageSeriesCommon(seriesType, id);
  });
}

const init = () => {
  initLisener();
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
.el-button+.el-button {
  margin-left: 0;
}
</style>
