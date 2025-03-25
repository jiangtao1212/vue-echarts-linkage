<template>
  <div class="btn-container">
    <div class="btn_click">
      <el-button type="primary" size="small" @click="addLinkageBtnClick">新增echarts实例</el-button>
      <el-button type="primary" size="small" @click="testBaseLineBtnClick">测试基准线</el-button>
      <el-button type="primary" size="small" @click="addLotEmptyLinkageBtnClick">批量新增空白echarts</el-button>
      <el-button type="primary" size="small" @click="updateAllLinkageBtnClick">批量更新echarts</el-button>
      <el-button type="primary" size="small" @click="updateAllLinkageTimeBtnClick">批量更新echarts(时间分析)</el-button>
      <el-button type="primary" size="small" @click="clearAllEchartsData">批量清除echarts数据</el-button>
      <!-- <el-button type="primary" size="small" @click="replaceAllEchartsData">批量替换echarts数据</el-button> -->
      <el-button type="primary" size="small" @click="replaceAllEchartsData1">批量替换echarts数据(多卷)</el-button>
      <el-button type="primary" size="small" @click="addLinkageLineSeriesBtnClick">新增line-series</el-button>
      <el-button type="primary" size="small" @click="addLinkageBarSeriesBtnClick">新增bar-series</el-button>
      <el-button type="primary" size="small" @click="downloadImg">下载图片</el-button>
      <el-button type="primary" size="small" @click="updateVisualMapBtnClick">修改映射数据</el-button>
    </div>
    <div class="btn_realtime">
      <el-button type="primary" size="small" @click="realTimeUpdateLengthBtnClick">实时更新(长度)</el-button>
      <el-button type="primary" size="small" @click="realTimeUpdateTimeBtnClick">实时更新(时间)</el-button>
      <el-button type="primary" size="small" @click="realTimeUpdateCancelBtnClick">实时更新-关闭</el-button>
      <el-button type="primary" size="small" @click="realTimeUpdateIntervalBtnClick">模拟简单频繁更新</el-button>
      <span>--</span>
      <el-button type="primary" size="small" @click="updateTemplateBtnClick()">模拟模板更新</el-button>
      <el-button type="primary" size="small" @click="updateTemplateBtnClick('template')">模拟模板更新（叠加）</el-button>
      <el-button type="primary" size="small" @click="replaceAllEchartsData">模拟数据更新（非模版）</el-button>
      <el-button type="primary" size="small" @click="getTemplateTagsOptionBtnClick">获取模板信息</el-button>
    </div>
    <div class="btn_drag">
      <div class="drag-rect drag-rect-line" draggable="true"><span>可拖拽系列(折线)</span></div>
      <div class="drag-rect drag-rect-bar" draggable="true"><span>可拖拽系列(柱状)</span></div>
      <div class="drag-rect drag-rect-switch" draggable="true"><span>可拖拽系列(开关量)</span></div>
    </div>
    <div class="btn_theme">
      <el-button-group>
        <el-button type="primary" size="small" @click="changeAllEchartsTheme('light')">
          <el-icon><img :src="LightSvg" class="w-100% h-100%" /></el-icon>白天模式</el-button>
        <el-button type="primary" size="small" @click="changeAllEchartsTheme('dark')">
          <el-icon><img :src="DarkSvg" class="w-100% h-100%" /></el-icon>黑夜模式</el-button>
      </el-button-group>
    </div>
  </div>

  <!-- 可自定义配置显示列数(cols) | 最大图表数(echarts-max-count) | 空白图表数(empty-echart-count) -->
  <!-- <div class="h-80vh overflow-y-auto"> class="h-100vh !w-98%" -->
  <EchartsLinkag ref="echartsLinkageRef" id="echarts-linkage-view" :cols="1" :echarts-max-count="10"
    :empty-echart-count="3" :segment="{ mode: 'percent', value: 50 }"
    :echarts-colors="['#000', 'blue', 'green', 'yellow', 'goldenrod', 'pink']" language="zh-cn" grid-align
    :theme="theme" :is-linkage="true" :use-graphic-location="false" :is-echarts-height-change="false"
    :echarts-height-fixed-count="4" :extra-option="extraOption" :groups="[[1, 3], [2, 4]]" @drop-echart="dropEchart"
    @listener-graphic-location="listenerGraphicLocation" @delete-echart="deleteEchart"
    @listener-excel-view="listenerExcelView" />
  <!-- </div> -->
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RandomUtil } from "@/utils/index";
import EchartsLinkag from "@/components/echarts-linkage/index.vue";
import type {
  OneDataType, SeriesTagType, DropEchartType, DeleteEchartType,
  ListenerGrapicLocationType, SeriesDataType, ListenerExcelViewType, excelViewType, excelViewHeadType, ThemeType,
} from '@/components/echarts-linkage/types/index';
import type { DragItemType } from '@/components/drag/type/index';
import DarkSvg from "@/assets/svg/dark.svg";
import LightSvg from "@/assets/svg/light.svg";

const echartsLinkageRef = ref<InstanceType<typeof EchartsLinkag>>();
let seriesType = 'line' as 'line' | 'bar';
let switchFlag = false;
const theme = ref<ThemeType>('light');

// 额外的配置项
const extraOption = {
  // grid: {
  //   right: '1.8%', // 只有right属性会影响图表的布局，其他都是内部动态计算出来的
  // },
  // toolbox: {
  //   feature: {
  //     myThemeButton: {
  //       show: false
  //     },
  //     myExcelView: {
  //       show: false
  //     },
  //     mySaveAsImage: {
  //       show: false
  //     },
  //     // myDeleteButton: {
  //     //   show: false
  //     // }
  //   }
  // },
  // xAxis: [
  //   {
  //     name: '[米]',
  //     axisLabel: {
  //       // myThemeButton主题按钮显示时，显示颜色值必选是数组，且长度大于等于2，否则会报错抛出异常
  //       // myThemeButton主题按钮不显示时，显示颜色值可以是数组，也可以是字符串
  //       // color: ['#F0F', '#0FF']
  //       // color: ['#F0F']
  //       // color: '#0FF'
  //     }
  //   }
  // ],
}

// 新增按钮
const addLinkageBtnClick = () => {
  const seriesData = RandomUtil.getSeriesData(1000);
  const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
  const oneDataType: OneDataType = {
    name: `新增图表${maxEchartsIdSeq + 1}`,
    yAxisName: `[${Math.floor(Math.random() * 10) > 5 ? 'mm' : '℃'}]`,
    // xAxisName: '[mm]',
    xAxisName: '[时间]',
    type: 'line',
    seriesData: seriesData,
    // markLineArray: [RandomUtil.getRandomDataFromInterval(0, 1000), RandomUtil.getRandomDataFromInterval(0, 1000)],
    visualMapSeries: {
      pieces: [{ min: 5000, max: 8000 }],
      piecesOnTooltip: { show: true, value: '自定义pieces' }
    },
    // 多卷首尾连接设置
    // seriesLink: {
    //   isLinkMode: true,
    //   head: [{ lebel: '宽度', prop: 'width' }, { lebel: '高度', prop: 'height' }],
    //   linkName: '卷号',
    //   linkData: [
    //     { label: 'P202410210001', data: RandomUtil.getSeriesData(1000), custum: { width: 1000, height: 100000 } },
    //     { label: 'P202410210002', data: RandomUtil.getSeriesData(1000) },
    //     { label: 'P202410210003', data: RandomUtil.getSeriesData(1000) },
    //     { label: 'P202410210004', data: RandomUtil.getSeriesData(1000) },
    //   ]
    // },
  };
  echartsLinkageRef.value!.addEchart(oneDataType);
}

// 测试基准线按钮点击
const testBaseLineBtnClick = () => {
  const seriesData = RandomUtil.getSeriesData(1000);
  // const baseLineData = RandomUtil.getSeriesData(1000); 
  const baseLineData = JSON.parse(JSON.stringify(seriesData));
  for (let i = 0; i < 10; i++) {
    baseLineData[i][1] = 100000;
  }
  const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
  const oneDataType1: OneDataType = {
    name: `新增图表${maxEchartsIdSeq + 1}`,
    yAxisName: `[${Math.floor(Math.random() * 10) > 5 ? 'mm' : '℃'}]`,
    type: 'line',
    seriesData: seriesData,
    visualMapSeries: {
      pieces: [],
      baseLine: {
        mode: 'below',
        value: baseLineData,
      }
    },
  };
  echartsLinkageRef.value!.addEchart([oneDataType1]);
}

// 批量新增空白echarts，携带legend数据
const addLotEmptyLinkageBtnClick = () => {
  for (let i = 0; i < 7; i++) {
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
  const linkCount = Math.floor(Math.random() * 3) + 1; // 首尾连接的数量
  allDistinctSeriesTagInfo.forEach((item: SeriesTagType, index: number) => {
    if (item.dataType === 'switch') {
      item.seriesData = RandomUtil.getSwitchData(1000);
    } else {
      const seriesData = RandomUtil.getSeriesData(1000);
      const baseLineData = JSON.parse(JSON.stringify(seriesData));
      // for (let i = 0; i < 100; i++) {
      //   baseLineData[i][1] = 100000;
      // }
      item.seriesData = seriesData;
      // item.seriesLink = {
      //   isLinkMode: true,
      //   linkData: getRandomCountLinkData(linkCount)
      // };
      // item.visualMapSeries = {
      //   pieces: [{ min: 5000, max: 8000 }],
      //   baseLine: {
      //     mode: 'below',
      //     value: baseLineData,
      //   }
      // };
      // item.yAxisMin = 600;
      // item.yAxisMax = 800;
    }
  });
  echartsLinkageRef.value?.updateAllEcharts(allDistinctSeriesTagInfo);
}

// 批量更新按钮--简单更新
const updateSimpleBtnClick = (interval = 0) => {
  const allDistinctSeriesTagInfo: SeriesTagType[] = echartsLinkageRef.value?.getAllDistinctSeriesTagInfo() as SeriesTagType[];
  // console.log("allDistinctSeriesTagInfo", allDistinctSeriesTagInfo);
  // const defaultValue = RandomUtil.getRandomDataFromInterval(0, 1000);
  const defaultValue = interval;
  allDistinctSeriesTagInfo.forEach((item: SeriesTagType, index: number) => {
    if (item.dataType === 'switch') {
      item.seriesData = RandomUtil.getSwitchData(1000);
    } else {
      const seriesData = RandomUtil.getSeriesData(1000, undefined, undefined, defaultValue);
      item.seriesData = seriesData;
    }
  });
  echartsLinkageRef.value?.updateSimpleEcharts(allDistinctSeriesTagInfo);
}

// 随机获取首尾连接数据
const getRandomCountLinkData = (count: number) => {
  const res: Array<{ label: string, data: SeriesDataType }> = [];
  for (let i = 0; i < count; i++) {
    const label = `P20241021000${i + 1}`;
    const data = RandomUtil.getSeriesData(1000);
    res.push({ label, data });
  }
  return res;
}

// 批量更新按钮---时间
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

// 批量替换echarts实例数据-多卷
const replaceAllEchartsData1 = () => {
  const res: Array<OneDataType[]> = [];
  const data1 = getRandomCountLinkData(2);
  for (let i = 0; i < 3; i++) {
    const oneDataTypeArray: OneDataType[] = [];
    if (i === 0) {
      const oneDataType: OneDataType = {
        name: `开卷机外径`,
        type: 'line',
        seriesData: [],
        customData: `开卷机外径`,
        xAxisName: '[m]',
        yAxisName: `[mm]`,
        seriesLink: {
          isLinkMode: true,
          linkData: getRandomCountLinkData(2)
        }
      };
      oneDataTypeArray.push(oneDataType);
      const oneDataType1: OneDataType = {
        name: `带头剪切实际值M`,
        type: 'line',
        seriesData: RandomUtil.getSeriesData(1000),
        customData: `开卷机外径`,
        xAxisName: '[m]',
        yAxisName: `[mm]`,
        seriesLink: {
          isLinkMode: true,
          linkData: data1
        }
      };
      oneDataTypeArray.push(oneDataType1);

    } else if (i === 1) {
      const oneDataType: OneDataType = {
        name: `带头剪切实际值M`,
        type: 'line',
        seriesData: RandomUtil.getSeriesData(1000),
        customData: `开卷机外径`,
        xAxisName: '[m]',
        yAxisName: `[mm]`,
        seriesLink: {
          isLinkMode: true,
          linkData: data1
        }
      };
      oneDataTypeArray.push(oneDataType);
    } else if (i === 2) {
      const oneDataType: OneDataType = {
        name: `液压站油箱液位`,
        type: 'line',
        seriesData: [],
        customData: `液压站油箱液位`,
        xAxisName: '[m]',
        yAxisName: `[mm]`,
        seriesLink: {
          isLinkMode: true,
          linkData: getRandomCountLinkData(2)
        }
      };
      oneDataTypeArray.push(oneDataType);
    }
    res.push(oneDataTypeArray);
  }
  console.log("res", res);
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

// 实时更新-间隔按钮
const realTimeUpdateIntervalBtnClick = () => {
  let interval = 0;
  mySetInterval = setInterval(() => {
    interval += 1000;
    updateSimpleBtnClick(interval);
  }, 1000);
}

// 切换主题按钮
const changeAllEchartsTheme = (themeValue: ThemeType) => {
  theme.value = themeValue;
  // echartsLinkageRef.value?.changeAllEchartsTheme(themeValue);
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
  const seriesName = allSeriesTagInfo[0].series[1].name;
  echartsLinkageRef.value?.updateOneEchartsVisualMapSeries(id, [{ seriesName: seriesName, pieces: [{ min: 1000, max: 3000 }] }]);
}

/**
 * @description 组装模板tag数据
 * @param mode 'template' | 'normal' 合并模式 | 普通模式
 * @returns 
 */
const packageTemplateTagsArray = (mode: 'template' | 'normal') => {
  let templateTagsArray: Array<DragItemType[]> = [];
  if (mode === 'template') {
    const templateTags1 = [
      { name: 'STD1-波形1', id: '1', followId: '2', isDrag: true, isShow: false },
      { name: 'STD1-牌坊1', id: '2', followId: '2', isDrag: true, isShow: true },
      { name: 'STD1-电机1', id: '3', followId: '3', isDrag: true, isShow: true },
      { name: 'STD1-齿轮1', id: '4', followId: '3', isDrag: true, isShow: false },
    ] as DragItemType[];
    const templateTags2 = [
      { name: 'STD1-波形3', id: '1', followId: '2', isDrag: true, isShow: false },
      { name: 'STD1-牌坊3', id: '2', followId: '2', isDrag: true, isShow: false },
      { name: 'STD1-电机3', id: '3', followId: '3', isDrag: true, isShow: true },
      { name: 'STD1-齿轮3', id: '4', followId: '2', isDrag: true, isShow: false },
    ] as DragItemType[];
    const templateTags3 = [
      { name: 'STD1-波形4', id: '1', followId: '1', isDrag: true, isShow: true },
      { name: 'STD1-牌坊4', id: '2', followId: '3', isDrag: true, isShow: false },
      { name: 'STD1-电机4', id: '3', followId: '3', isDrag: true, isShow: true },
      { name: 'STD1-齿轮4', id: '4', followId: '4', isDrag: true, isShow: true },
    ] as DragItemType[];
    templateTagsArray = [templateTags1, templateTags2, templateTags3];
  } else {
    const templateTags1 = [
      { name: 'STD1-波形1', id: '1', followId: '1', isDrag: true, isShow: true },
      { name: 'STD1-牌坊1', id: '2', followId: '2', isDrag: true, isShow: true },
      { name: 'STD1-电机1', id: '3', followId: '3', isDrag: true, isShow: true },
      { name: 'STD1-齿轮1', id: '4', followId: '4', isDrag: true, isShow: true },
    ] as DragItemType[];
    const templateTags2 = [
      { name: 'STD1-波形3', id: '1', followId: '1', isDrag: true, isShow: true },
      { name: 'STD1-牌坊3', id: '2', followId: '2', isDrag: true, isShow: true },
      { name: 'STD1-电机3', id: '3', followId: '3', isDrag: true, isShow: true },
      { name: 'STD1-齿轮3', id: '4', followId: '4', isDrag: true, isShow: true },
    ] as DragItemType[];
    const templateTags3 = [
      { name: 'STD1-波形4', id: '1', followId: '1', isDrag: true, isShow: true },
      { name: 'STD1-牌坊4', id: '2', followId: '2', isDrag: true, isShow: true },
      { name: 'STD1-电机4', id: '3', followId: '3', isDrag: true, isShow: true },
      { name: 'STD1-齿轮4', id: '4', followId: '4', isDrag: true, isShow: true },
    ] as DragItemType[];
    templateTagsArray = [templateTags1, templateTags2, templateTags3];
  }
  return templateTagsArray;
}

// 模拟模板更新
const updateTemplateBtnClick = (mode: "template" | "normal" = 'normal') => {
  const templateTagsArray = packageTemplateTagsArray(mode);
  const res: Array<OneDataType[]> = [];
  for (let i = 0; i < templateTagsArray.length; i++) {
    const templateTags = templateTagsArray[i];
    const oneDataTypeArray: OneDataType[] = [];
    for (let j = 0; j < templateTags.length; j++) {
      const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
      const oneDataType: OneDataType = {
        name: templateTags[j].name,
        type: 'line',
        seriesData: RandomUtil.getSeriesData(1000),
        customData: `新增图表${maxEchartsIdSeq + 1}-${Math.floor(Math.random() * 1000)}`,
        xAxisName: '[m]',
        yAxisName: `[${Math.floor(Math.random() * 10) > 5 ? 'mm' : '℃'}]`,
        dragItemOption: templateTags[j],
      };
      oneDataTypeArray.push(oneDataType);
    }
    res.push(oneDataTypeArray);
  }
  echartsLinkageRef.value?.replaceAllEchartsData(res);
}

// 获取模板信息
const getTemplateTagsOptionBtnClick = () => {
  const templateTagsOption = echartsLinkageRef.value?.getTemplateTagsOption() as Array<Array<DragItemType>>;
  console.log("templateTagsOption", templateTagsOption);

  const res: Array<OneDataType[]> = [];
  for (let i = 0; i < templateTagsOption.length; i++) {
    const templateTags = templateTagsOption[i];
    const oneDataTypeArray: OneDataType[] = [];
    for (let j = 0; j < templateTags.length; j++) {
      const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
      const oneDataType: OneDataType = {
        name: templateTags[j].name,
        type: 'line',
        seriesData: RandomUtil.getSeriesData(1000),
        customData: `新增图表${maxEchartsIdSeq + 1}-${Math.floor(Math.random() * 1000)}`,
        xAxisName: '[m]',
        yAxisName: `[${Math.floor(Math.random() * 10) > 5 ? 'mm' : '℃'}]`,
        dragItemOption: templateTags[j],
      };
      oneDataTypeArray.push(oneDataType);
    }
    res.push(oneDataTypeArray);
  }
  echartsLinkageRef.value?.replaceAllEchartsData(res);
}

// 新增series按钮
const addLinkageSeriesCommon = (type: 'line' | 'bar' = 'line', id?: string) => {
  let seriesData = RandomUtil.getSeriesData(1000);
  const baseLineData = JSON.parse(JSON.stringify(seriesData));
  if (Math.random() > 0.5) {
    for (let i = 0; i < 10; i++) {
      baseLineData[i][1] = 100000;
    }
  }
  if (switchFlag) {
    seriesData = RandomUtil.getSwitchData(6000);
  }
  const maxEchartsIdSeq = echartsLinkageRef.value!.getMaxEchartsIdSeq();
  id = id || 'echart' + maxEchartsIdSeq;
  const random = Math.floor(Math.random() * 100);
  const aaa = RandomUtil.getRandomDataFromInterval(100, 500) + '';
  const bbb = RandomUtil.getRandomDataFromInterval(600, 800) + '';
  const oneDataType: OneDataType = {
    name: `新增图表${maxEchartsIdSeq}-${random}`,
    // xAxisName: '[m]',
    yAxisName: `[${Math.floor(Math.random() * 10) > 5 ? 'mm' : '℃'}]`,
    // yAxisMin: 100,
    // yAxisMax: 1000,
    type: type,
    markLineArray: [
      { label: { show: true, position: 'insideMiddleTop', formatter: aaa }, xAxis: aaa },
      { label: { show: true, position: 'insideMiddleTop', formatter: bbb }, xAxis: bbb }
    ],
    seriesData: seriesData,
    // visualMapSeries: {
    //   pieces: [{ min: 5000, max: 8000 }],
    //   baseLine: {
    //     mode: 'below',
    //     value: baseLineData,
    //     isShowOnToolTip: true,
    //   }
    // },
    visualMapSeries: {
      pieces: [{
        min: 100, //name.includes('温度')?myData.temp[1]:myData.vibration[1],
        max: 3000, //name.includes('温度')?200:10
        color: '#efab2e'
      }, {
        min: 5000,
        max: 8000,
        color: '#ff002e'
      }],
      piecesOnTooltip: {
        show: true,
        value: 500 + ',' + 1000
      }
    },
    // 多卷首尾连接设置
    // seriesLink: {
    //   isLinkMode: true,
    //   linkData: [
    //     { label: 'P202410210001', data: RandomUtil.getSeriesData(1000) },
    //     { label: 'P202410210002', data: RandomUtil.getSeriesData(1000) },
    //     { label: 'P202410210003', data: RandomUtil.getSeriesData(1000) },
    //     { label: 'P202410210004', data: RandomUtil.getSeriesData(1000) },
    //   ]
    // },
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

// 删除echarts实例的回调事件
const deleteEchart = (data: DeleteEchartType) => {
  // id: 删除的实例id，remainCount: 剩余实例数量
  const { id, remainCount } = data;
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

// 监听图形位置变化事件
const listenerGraphicLocation = (data: ListenerGrapicLocationType) => {
  console.log("listenerGraphicLocation", data);
}

// 监听excel数据视图按钮点击事件
const listenerExcelView = (data: ListenerExcelViewType) => {
  console.log("listenerExcelView", data);
  const { id, seriesLink, callback } = data;
  console.log("id", id);
  console.log("seriesLink", seriesLink);
  let params: excelViewType;
  if (seriesLink && seriesLink.isLinkMode) {
    const primaryKeyValues = seriesLink?.linkData.map(item => item.label); // 提取主键值
    params = { // 多卷
      headXname: '长度',
      preAdd: [
        { name: '卷号', value: primaryKeyValues, isPrimaryKey: true },
        { name: '宽度', value: [1000, 1500] },
        { name: '厚度', value: [0.35, 0.40] },
      ] as excelViewHeadType[],
    }
  } else {
    params = { // 单卷
      headXname: '长度',
      preAdd: [{ name: '卷号', value: 'P202410210001', isPrimaryKey: true } as excelViewHeadType],
      postAdd: [{ name: '备注', value: '备注信息' } as excelViewHeadType],
    }
  }
  callback(params);
}

const init = () => {
  initLisener();
  // addLotEmptyLinkageBtnClick();
  // testInitAllReplace();
}

// 初始化时测试all-replace
const testInitAllReplace = () => {
  // replaceAllEchartsData();
  // updateTemplateBtnClick();
  // updateTemplateBtnClick('template');
}

onMounted(() => {
  init();
});
</script>

<style scoped lang="less">
.btn-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;

  .btn_click {
    // height: fit-content;
    overflow-x: auto;
    overflow-y: hidden;
    display: flex;
    align-items: center;
    column-gap: 5px;
  }

  .btn_realtime,
  .btn_theme {
    display: flex;
    gap: 5px;
  }

  .btn_drag {
    display: flex;
    gap: 5px;

    .drag-rect {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 24px;
      border-radius: 4px;
      padding: 5px 11px;
      background-image: linear-gradient(to right, #4286f4, #00b4d8);
      border: 1px solid #00b4d8;

      span {
        color: #fff;
        font-size: 12px;
        line-height: 12px;
      }
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
