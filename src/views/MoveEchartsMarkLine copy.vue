<template>
  <div id="doubleMarkLineMoveChart" style="height: 50vh;width: 80vw" class="mychart"></div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import * as echarts from "echarts";
function drawDoubleMarkLineMoveChart() {
  let symbolSize = 10;
  // 两条markLine的位置
  let markLine1 = 15;
  let markLine2 = 65;
  // 图表数据
  let data = [
    [6, 0],
    [15, 7],
    [21, 10],
    [29, 20],
    [36.5, 30],
    [48.3, 56],
    [58.5, 18],
    [64.2, 18],
    [72, 40],
    [89.1, 76],
  ];
  let myChart: any = echarts.init(document.getElementById('doubleMarkLineMoveChart'));
  myChart.setOption({
    xAxis: { id: 'x1', type: 'value', axisLine: { onZero: false } },
    yAxis: { id: 'y1', type: 'value', axisLine: { onZero: false } },
    series: [
      {
        id: 'series1',
        type: 'line',
        // smooth: true,
        symbolSize: symbolSize,
        data: data,
        markLine: {
          symbol: "none",//去掉警戒线最后面的箭头
          label: { position: "end" },//将警示值放在哪个位置，三个值“start”,"middle","end"  开始  中点 结束
          data: [
            {
              name: 'x轴为15的竖直线',
              xAxis: markLine1,
              silent: true,             //鼠标悬停事件  true没有，false有
              lineStyle: {               //警戒线的样式  ，虚实  颜色
                type: "solid",
                color: "#FA3934",
              },
            },
            {
              name: 'x轴为45的竖直线',
              xAxis: markLine2,
              silent: true,             //鼠标悬停事件  true没有，false有
              lineStyle: {               //警戒线的样式  ，虚实  颜色
                type: "solid",
                color: "#FA3934",
              },
            },
          ]
        }
      }
    ]
  });
  // 给markLine加上拖拽功能：使用 graphic 组件，在每条线右侧，增加一个隐藏的可拖拽的长方形
  // 注意这件事需要在第一次 setOption 后再进行，也就是说，须在坐标系（grid）初始化后才能调用 myChart.convertToPixel
  myChart.setOption({
    // 绘制markLine的graphic line
    graphic: [
      {
        id: 'x1',
        type: 'rect',	//'rect' 表示这个 graphic element 的类型是长方形。
        z: 101,	// 这个属性让长方形可以被拖拽。
        //设置长方形的形状
        shape: {
          width: 2,
          height: 4000,
        },
        // 用 transform 的方式对长方形进行定位。position: [x, y] 表示将长方形平移到 [x, y] 位置。
        // 这里使用了 convertToPixel 这个 API 来得到长方形的位置
        position: [myChart.convertToPixel({ xAxisId: 'x1' }, markLine1), 0],
        draggable: true,// 这个属性让圆点可以被拖拽。
        //设置长方形的样式，透明度设置为0时，该长方形不可见
        //  invisible: true,// 这个属性让长方形不可见（但是不影响他响应鼠标事件）。
        style: {
          fill: 'rgba(0,0,0,0.3)',
          stroke: 'rgba(0,0,0,0.3)',
          lineWidth: 1
        },
        //鼠标悬浮时在图形元素上时鼠标的样式是什么。同 CSS 的 cursor
        // 'move'	光标指示某对象可被移动。
        // 'pointer'	光标呈现为指示链接的指针（一只手）
        cursor: 'pointer',
        ondrag: onPointDraggingx1,// 此长方形的拖拽的响应事件，在拖拽过程中会不断被触发。
      },
      {
        id: 'x2',
        type: 'rect',
        z: 101,
        shape: {
          width: 2,
          height: 4000,
          // r: 10
        },
        position: [myChart.convertToPixel({ xAxisId: 'x1' }, markLine2), 0],
        draggable: true,
        style: {
          fill: 'rgba(0,0,0,0.3)',
          stroke: 'rgba(0,0,0,0.3)',
          lineWidth: 1
        },
        cursor: 'pointer',
        ondrag: onPointDraggingx2
      },
    ],
  })
  // 使用了 convertFromPixel 这个 API。它是 convertToPixel 的逆向过程。
  // myChart.convertFromPixel({xAxisId: 'x1'}, this.position[0]) 表示把当前像素坐标转换成xAxisId为 'x1'的值。
  function onPointDraggingx1() {
    //获取当前拖拽线条的X值
    let markLine1 = myChart.convertFromPixel({ xAxisId: 'x1' }, this.position[0]);
    //获取另一条markLine的X值
    let markLine2 = myChart.convertFromPixel({ xAxisId: 'x1' }, myChart.getOption().graphic[0].elements[1].position[0]);
    // 重新绘制两条markLine
    myChart.setOption({
      series: [{
        id: 'series',
        markLine: {
          data: [
            { xAxis: markLine1 },
            { xAxis: markLine2 },
          ],
        }
      }]
    })
  }

  function onPointDraggingx2() {
    let markLine2 = myChart.convertFromPixel({ xAxisId: 'x1' }, this.position[0]);
    let markLine1 = myChart.convertFromPixel({ xAxisId: 'x1' }, myChart.getOption().graphic[0].elements[0].position[0]);
    myChart.setOption({
      series: [{
        id: 'series1',
        markLine: {
          data: [
            { xAxis: markLine2 },
            { xAxis: markLine1 },
          ],
        }
      }]
    })
  }
}

onMounted(() => {
  drawDoubleMarkLineMoveChart();
})
</script>

<style scoped></style>