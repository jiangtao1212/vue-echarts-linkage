/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2025-04-17 09:14:11
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-04-29 15:06:50
 * @FilePath: \vue-echarts-linkage\src\components\echarts-linkage\handleEnlargeShrink.ts
 * @Description: 处理放缩事件
 */

let expandedBox: HTMLElement | null = null; // 当前撑满的div容器
const originalStyles = new WeakMap(); // 用WeakMap存储每个div的初始样式

// 撑满容器
function expandBox(box: HTMLElement, container: HTMLElement) {
  // 记录初始样式
  originalStyles.set(box, {
    position: box.style.position,
    width: box.style.width,
    height: box.style.height,
    top: box.style.top,
    left: box.style.left,
    zIndex: box.style.zIndex,
    // flex: box.style.flex,
    // margin: box.style.margin,
  });

  // 设置撑满容器的样式
  box.style.position = 'absolute';
  box.style.top = '0';
  box.style.left = '0';
  box.style.width = container.clientWidth + 'px';
  console.log('container.clientHeight', container.clientHeight);
  console.log('container.offsetHeight', container.offsetHeight);
  box.style.height = container.clientHeight - 10 + 'px'; // 减去10px，是因为echarts的图表底部有10px的间距
  box.style.zIndex = '99';
  // box.style.flex = 'none';
  // box.style.margin = '10px';
}

// 恢复撑满容器的样式
function restoreBox(box: HTMLElement) {
  const style = originalStyles.get(box);
  if (!style) return;
  box.style.position = style.position;
  box.style.width = style.width;
  box.style.height = style.height;
  box.style.top = style.top;
  box.style.left = style.left;
  box.style.zIndex = style.zIndex;
  // box.style.flex = style.flex;
  // box.style.margin = style.margin
}

/**
 * @description 处理放缩事件
 * @param element 需要放缩的元素
 * @param container 放缩的容器
 * @param enlargeCallback 放大回调
 * @param shrinkCallback 缩小回调
 */
const handleEnlargeShrink = (element: HTMLElement, container: HTMLElement, enlargeCallback?: Function, shrinkCallback?: Function) => {
  if (!element || !container) throw new Error('放缩的元素或容器不存在，请检查！');
  if (expandedBox === element) {
    // 当前div已撑满，需恢复原状，并调用缩小回调
    restoreBox(element);
    expandedBox = null;
    shrinkCallback && shrinkCallback();
  } else {
    // 如果有其他div撑满，先恢复
    if (expandedBox) {
      restoreBox(expandedBox);
    }
    // 撑满当前div，并调用放大回调
    expandBox(element, container);
    expandedBox = element;
    enlargeCallback && enlargeCallback();
  }
}


const getStatus = (element: HTMLElement) => {
  return expandedBox === element;
}

export default {
  handleEnlargeShrink,
  getStatus,
};
