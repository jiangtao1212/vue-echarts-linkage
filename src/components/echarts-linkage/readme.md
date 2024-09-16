# vue-echarts-linkage

## 1. 介绍

vue-echarts-linkage 是基于 Vue3 + TypeScript + Element Plus 实现的联动组件，可以实现多个图表之间的联动。

组件基于版本

```javascript
"dependencies": {
  "@element-plus/icons-vue": "^2.3.1",
  "@vueuse/core": "^10.11.0",
  "echarts": "^5.5.1",
  "element-plus": "^2.7.8",
  "vue": "^3.4.29",
  ...
},
"devDependencies": {
  "@rushstack/eslint-patch": "^1.8.0",
  "@tsconfig/node20": "^20.1.4",
  "@types/node": "^20.14.5",
  "@vitejs/plugin-vue": "^5.0.5",
  "@vitejs/plugin-vue-jsx": "^4.0.0",
  "@vue/eslint-config-prettier": "^9.0.0",
  "@vue/eslint-config-typescript": "^13.0.0",
  "@vue/tsconfig": "^0.5.1",
  "eslint": "^8.57.0",
  "eslint-plugin-vue": "^9.23.0",
  "less": "^4.2.0",
  "npm-run-all2": "^6.2.0",
  "prettier": "^3.2.5",
  "typescript": "~5.4.0",
  "unocss": "^0.61.9",
  "unplugin-auto-import": "^0.18.2",
  "unplugin-vue-components": "^0.27.3",
  "vite": "^5.3.1",
  "vite-plugin-dts": "^4.0.3",
  "vite-plugin-static-copy": "^1.0.6",
  "vue-tsc": "^2.0.21"
}
```

## 2. 安装及使用组件

### 2.1 安装组件
```bash
# 安装依赖
npm install vue-echarts-linkage
or
pnpm install vue-echarts-linkage

# 全局安装组件
import VueEchartsLinkage from "vue-echarts-linkage";
import "vue-echarts-linkage/dist/style.css";
...
const app = createApp(App);
app.use(VueEchartsLinkage);

# 按需引入组件
import { VueEchartsLinkage } from "vue-echarts-linkage";
import "vue-echarts-linkage/dist/style.css";
```

### 2.2 使用组件

```html
<template>
  ...
  <VueEchartsLinkage 
    ref="echartsLinkageRef" 
    :cols="1" 
    :echarts-max-count="10"
    :echarts-colors="['red', 'blue', 'green', 'yellow', 'goldenrod', 'skyblue']" 
    language="zh-cn"
    grid-align
    ...
    @drop-echart="dropEchart" />
</template>
```

```javascript
import { VueEchartsLinkage, type OneDataType, type seriesTagType, type dropEchartType  } from 'vue-echarts-linkage';
import "vue-echarts-linkage/dist/style.css";
...
const echartsLinkageRef = ref<InstanceType<typeof VueEchartsLinkage>>();
...
// 拖拽回调事件
const dropEchart = (data: dropEchartType) => {
  // 处理拖拽回调后逻辑
  ...
}
```

## 3. 组件属性
| 属性名 | 类型 | 说明 | 默认值 |
| --- | --- | --- | --- |
| cols | `number` | 自定义配置的显示列数 | 1，即单列 |
| echarts-max-count | `number` | 允许的最大图表数 | 7 |
| empty-echart-count | `number` | 初始化生成的空白图表数 | — |
| echarts-colors | `string[]` | legend、series和对应Y轴颜色数组  | ['#0078FF', '#FFAA2E', '#00FF00', '#9D2EFF', '#DA1D80', '#DA4127'] |
| language | `zh-cn / en-us` | 语言设置，目前只支持中文（zh-cn）和英文（en-us）  | zh-cn，即中文 |
| grid-align | `boolean` | 多echarts图表是否对齐 | false |
| theme | `light / dark` | 主题，light为浅色，dark为深色 | light |
| background | `string` | 背景色，一般配合主题使用 | — |
| is-linkage | `boolean` | 是否联动 | true，即联动 |
| use-merged-legend | `boolean` | 是否使用合并图例 | true，即使用合并图例 |

## 4. 组件事件
| 事件名 | 说明 | 参数 |
| --- | --- | --- |
| drop-echart | 拖拽图表回调事件，返回当前拖拽的图表id(data.id) | `(data: dropEchartType)` |

## 5. 组件方法
| 方法名 | 说明 | 参数 |
| --- | --- | --- |
| addEchart | 添加一个echarts图表 | `(data?: OneDataType / OneDataType[]) => void` |
| addEchartSeries | 新增echarts系列，一般配置拖拽回调事件（@drop-echart）使用 | `(id: string, data: OneDataType) => void` |
| deleteEchart | 根据echarts的id删除echarts | `(id: string) => Promise<void>` |
| getDataLength | 获取数据总数 | `() => number` |
| getMaxEchartsIdSeq | 获取最大的id序号 | `() => number` |
| getAllDistinctSeriesTagInfo | 获取所有不重复系列的标签信息 | `() => Array<seriesTagType>` |
| getAllSeriesTagInfo, | 获取所有系列的标签信息 | `() => Array<{ id: string; series: Array<seriesTagType>; }>` |
| updateAllEcharts | 传入所有显示子项数据，更新所有echarts，一般配置 `getAllDistinctSeriesTagInfo()` 使用 | `(newAllSeriesdata: Array<seriesTagType>) => Promise<void>` |
| clearAllEchartsData | 清空所有echarts数据：当mode为'clear'时，清除数据保留当前空白echarts实例，当mode为'delete'时，删除当前实例 | `(mode?: "clear" / "delete") => Promise<void>` |
| replaceAllEchartsData | 替换所有echarts，内部为先清除再添加，保证新旧echarts图表数量和数据不存在关联性 | `(newDataArray: Array<OneDataType[]>) => Promise<void>` |