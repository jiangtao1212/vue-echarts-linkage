<template>
  <div class="btn-container">
    <el-button type="primary" size="small" @click="addLinkageBtnClick">新增echarts实例</el-button>
    <el-button type="primary" size="small" @click="addLotEmptyLinkageBtnClick">批量新增空白echarts</el-button>
    <el-button type="primary" size="small" @click="updateAllLinkageBtnClick">批量更新echarts</el-button>
    <el-button type="primary" size="small" @click="updateAllLinkageTimeBtnClick">批量更新echarts(时间分析)</el-button>
    <el-button type="primary" size="small" @click="clearAllEchartsData">批量清除echarts数据</el-button>
    <el-button type="primary" size="small" @click="replaceAllEchartsData">批量替换echarts数据</el-button>
    <el-button type="primary" size="small" @click="addLinkageLineSeriesBtnClick">新增line-series</el-button>
    <el-button type="primary" size="small" @click="addLinkageBarSeriesBtnClick">新增bar-series</el-button>
    <el-button type="primary" size="small" @click="realTimeUpdateLengthBtnClick">实时更新(长度)</el-button>
    <el-button type="primary" size="small" @click="realTimeUpdateTimeBtnClick">实时更新(时间)</el-button>
    <el-button type="primary" size="small" @click="realTimeUpdateCancelBtnClick">实时更新-关闭</el-button>
    <el-button type="primary" size="small" @click="downloadImg">下载图片</el-button>
    <!-- <el-button type="primary" size="small" @click="updateVisualMapBtnClick">修改映射数据</el-button> -->
    <div class="drag-rect drag-rect-line" draggable="true"><span>可拖拽折线系列</span></div>
    <div class="drag-rect drag-rect-bar" draggable="true"><span>可拖拽柱状系列</span></div>
    <div class="drag-rect drag-rect-switch" draggable="true"><span>可拖拽开关量系列</span></div>
  </div>
  <!-- 可自定义配置显示列数(cols) | 最大图表数(echarts-max-count) | 空白图表数(empty-echart-count) -->
  <!-- <div class="h-80vh overflow-y-auto"> class="h-100vh !w-98%" -->
  <EchartsLinkag ref="echartsLinkageRef" :cols="1" :echarts-max-count="10" :empty-echart-count="2"
    :echarts-colors="['#000', 'blue', 'green', 'yellow', 'goldenrod', 'pink']" language="zh-cn" grid-align theme="light"
    :is-linkage="true" :use-graphic-location="false" id="echarts-linkage-view" @drop-echart="dropEchart"
    @listener-graphic-location="listenerGraphicLocation" />
  <!-- </div> -->
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RandomUtil } from "@/utils/index";
import EchartsLinkag from "@/components/echarts-linkage/index.vue";
import type { OneDataType, SeriesTagType, DropEchartType, ListenerGrapicLocationType } from '@/components/echarts-linkage/types/index';


const echartsLinkageRef = ref<InstanceType<typeof EchartsLinkag>>();
let seriesType = 'line' as 'line' | 'bar';
let switchFlag = false;

// 新增按钮
const addLinkageBtnClick = () => {
  const seriesData = RandomUtil.getSeriesData(1000);
  const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
  const oneDataType: OneDataType = {
    name: `新增图表${maxEchartsIdSeq + 1}`,
    yAxisName: `[${Math.floor(Math.random() * 10) > 5 ? 'mm' : '℃'}]`,
    type: 'line',
    seriesData: seriesData,
    // markLineArray: [RandomUtil.getRandomDataFromInterval(0, 1000), RandomUtil.getRandomDataFromInterval(0, 1000)]
    visualMapSeries: { pieces: [{ min: 1000, max: 8000 }] },
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
    if (item.dataType === 'switch') {
      item.seriesData = RandomUtil.getSwitchData(1000);
    } else {
      item.seriesData = RandomUtil.getSeriesData(1000);
    }
  });
  echartsLinkageRef.value?.updateAllEcharts(allDistinctSeriesTagInfo);
}

// 批量更新按钮
const updateAllLinkageTimeBtnClick = () => {
  const allDistinctSeriesTagInfo: SeriesTagType[] = echartsLinkageRef.value?.getAllDistinctSeriesTagInfo() as SeriesTagType[];
  console.log("allDistinctSeriesTagInfo", allDistinctSeriesTagInfo);
  const res: { [key: string]: Array<number[]> } = {};
  allDistinctSeriesTagInfo.forEach((item: SeriesTagType, index: number) => {
    if (item.dataType === 'switch') {
      item.seriesData = RandomUtil.getSwitchData(1000);
    } else {
      item.seriesData = RandomUtil.getSeriesDataWithTime(1000);
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

// 实时更新按钮--长度
let count = 0;
let mySetInterval = 0;
const randomCount = 10;
const realTimeUpdateLengthBtnClick = () => {
  mySetInterval = setInterval(() => {
    const allDistinctSeriesTagInfo: SeriesTagType[] = echartsLinkageRef.value?.getAllDistinctSeriesTagInfo() as SeriesTagType[];
    console.log("allDistinctSeriesTagInfo", allDistinctSeriesTagInfo);
    allDistinctSeriesTagInfo.forEach((item: SeriesTagType, index: number) => {
      let seq = count;
      let imitate: Array<(number | string)[]> = [];
      if (item.dataType === 'switch') {
        imitate = RandomUtil.getSwitchData(randomCount);
      } else {
        imitate = RandomUtil.getSeriesData(randomCount);
      }
      imitate.forEach((item, index) => {
        seq++;
        item[0] = seq;
      });
      item.seriesData = imitate;
    });
    count += randomCount;
    // console.log("count", count);
    // console.log("allDistinctSeriesTagInfo", allDistinctSeriesTagInfo);
    echartsLinkageRef.value?.realTimeUpdate(allDistinctSeriesTagInfo);
  }, 2000);
}

// 实时更新按钮--时间
let countTime = 0;
let mySetIntervalTime = 0;
const realTimeUpdateTimeBtnClick = () => {
  mySetIntervalTime = setInterval(() => {
    const allDistinctSeriesTagInfo: SeriesTagType[] = echartsLinkageRef.value?.getAllDistinctSeriesTagInfo() as SeriesTagType[];
    console.log("allDistinctSeriesTagInfo", allDistinctSeriesTagInfo);
    allDistinctSeriesTagInfo.forEach((item: SeriesTagType, index: number) => {
      let imitate: Array<(number | string)[]> = [];
      if (item.dataType === 'switch') {
        imitate = RandomUtil.getSwitchData(randomCount);
      } else {
        const startTime = new Date(new Date('2024-10-01 08:00:00').getTime() + countTime * 1000);
        imitate = RandomUtil.getSeriesDataWithTime(randomCount, undefined, undefined, startTime);
      }
      item.seriesData = imitate;
    });
    countTime += randomCount;
    console.log("count", countTime);
    console.log("allDistinctSeriesTagInfo", allDistinctSeriesTagInfo);
    echartsLinkageRef.value?.realTimeUpdate(allDistinctSeriesTagInfo, 50);
  }, 2000);
}

// 实时更新-关闭按钮
const realTimeUpdateCancelBtnClick = () => {
  clearInterval(mySetInterval);
  clearInterval(mySetIntervalTime);
}

// 下载图片
const downloadImg = () => {
  echartsLinkageRef.value?.downloadAllEchartsImg();
}

// 修改映射数据
const updateVisualMapBtnClick = () => {
  const allSeriesTagInfo: Array<{ id: string, series: Array<SeriesTagType> }> = echartsLinkageRef.value?.getAllSeriesTagInfo() as Array<{ id: string, series: Array<SeriesTagType> }>;
  console.log("allSeriesTagInfo", allSeriesTagInfo);
  const id = allSeriesTagInfo[0].id;
  const seriesName = allSeriesTagInfo[0].series[0].name;
  echartsLinkageRef.value?.updateOneEchartsVisualMapSeries(id, [{ pieces: [{ min: 1000, max: 2000 }] }], )
}

// 新增series按钮
const addLinkageSeriesCommon = (type: 'line' | 'bar' = 'line', id?: string) => {
  let seriesData = RandomUtil.getSeriesData(1000);
  if (switchFlag) {
    seriesData = RandomUtil.getSwitchData(1000);
  }
  const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
  id = id || 'echart' + maxEchartsIdSeq;
  const random = Math.floor(Math.random() * 100);
  const oneDataType: OneDataType = {
    name: `新增图表${maxEchartsIdSeq}-${random}`,
    yAxisName: `[${Math.floor(Math.random() * 10) > 5 ? 'mm' : '℃'}]`,
    type: type, seriesData: seriesData,
    visualMapSeries: { pieces: [{ min: 1000, max: 8000 }] }
  };
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

const listenerGraphicLocation = (data: ListenerGrapicLocationType) => {
  console.log("listenerGraphicLocation", data);
}

const init = () => {
  initLisener();
  // addLotEmptyLinkageBtnClick();
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
  column-gap: 5px;

  .drag-rect {
    border-radius: 4px;
    padding: 5px 5px;
    background-image: linear-gradient(to right, #4286f4, #00b4d8);
    border: 1px solid #00b4d8;
    display: flex;
    justify-content: center;
    align-items: center;

    span {
      color: #fff;
      font-size: 12px;
      line-height: 12px;
    }
  }
}

.echarts-linkage-container {
  width: 100vw;
  height: 95vh;
  padding: 10px;
}
</style>
<style scoped lang="less">
.el-button {
  margin-left: 0;
}
</style>
