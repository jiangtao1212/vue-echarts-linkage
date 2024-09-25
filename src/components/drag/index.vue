<template>
  <div class="drag-container">
    <div class="main" :class="id">
      <VueDraggable v-for="(data, index) in dataAbout.list" :key="data.key" v-show="data.value.length > 0"
        class="flex flex-col items-start gap-1 drag-column" :data-info="data.value.length > 0 ? data.value[0].name : ''"
        :style="{ height: data.value.length * 20 + (data.value.length - 1) * 4 + 'px', minwidth: '20px' }"
        v-model="dataAbout.list[index].value" :animation="150" :sort="false" ghostClass="ghost"
        :group="groupComputed(data)" :disabled="groupComputed(data) !== group" @update="onUpdate" @add="onAdd"
        @start="onStart" @end="onEnd" @remove="remove" @sort="sore" @move="move" @change="change">
        <div v-for="item in dataAbout.list[index].value" :key="item.id"
          class="cursor-move h-5 line-height-5 pl-3px pr-3px border-rd-1 text-2.7 flex justify-center items-center"
          :class="{ 'vague': !item.isShow, 'no-drag': groupComputed(data) !== group }"
          @contextmenu.prevent="clickObjFun.handleContextMenu($event, item.id)">
          <el-popover fixed="right" placement="right" :width="80" v-if="!dataAbout.isDeleteItemHandle"
            :popper-style="{ 'min-width': '80px', 'display': dataAbout.visible === item.id ? 'block' : 'none' }"
            trigger="contextmenu">
            <template #reference>
              <div class="flex justify-center items-center gap-1" :class="{ 'dark': theme === 'dark' }"
                :style="{ '--color': colors[(+item.id - 1) % colors.length] }">
                <div class="w-6 h-2px line" style="--height: 1.5rem;"></div>
                <span class="cursor-move-item" :style="{ '--move-item-font-size': computedItemFontSize }">{{ item.name }}</span>
              </div>
            </template>
            <div class="flex flex-col justify-center items-center gap-1">
              <el-button type="primary" size="small" @click="clickObjFun.deleteItemDefault(item.id)">移除</el-button>
              <el-button type="primary" size="small" class="!ml-0"
                @click="clickObjFun.resetItemDefault(item.name)">重置</el-button>
            </div>
          </el-popover>
        </div>
      </VueDraggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onBeforeUnmount, watch, watchEffect, nextTick, computed } from 'vue';
import { useDebounceFn } from "@vueuse/core";
import { VueDraggable } from 'vue-draggable-plus';
import { type DragExposedMethods, type DragItemType, type DragListDataType, type DragItemDataProps } from "./type/index";

const emit = defineEmits(['update', 'deleteItem']);

/**
 * @description: 组件props类型
 * @param {Array<DragItemDataProps>} data - 原始数据
 * @param {string} id - 唯一标识
 * @param {Array<string>} colors - 颜色数组
 * @param {string} group - 组名
 * @param {'light' | 'dark'} theme - 主题
 * @param {string | number} itemFontSize - 子项字体大小
 */
export type PropsType = {
  data: Array<DragItemDataProps>,
  id: string,
  colors?: Array<string>,
  group: string,
  theme?: 'light' | 'dark',
  itemFontSize?: string | number,
}

const props = withDefaults(defineProps<PropsType>(), {
  data: () => [],
  id: '',
  colors: () => ['#0078FF', '#FFAA2E', '#00FF00', '#9D2EFF', '#DA1D80', '#DA4127'],
  group: 'people',
  theme: 'light',
  itemFontSize: '12px',
});

// 计算item的字体大小
const computedItemFontSize = computed(() => {
  console.log('computedItemFontSize', props.itemFontSize);
  if (typeof props.itemFontSize === 'number') {
    return props.itemFontSize + 'px';
  }
  return props.itemFontSize;
});

// 响应式数据
const dataAbout = reactive({
  list: [] as Array<DragListDataType>,
  visible: "", // 右键菜单显示项
  isDeleteItemHandle: false, // 是否为删除子项操作
});

// 数据，非响应式
const dataConst = {
  dropEffect: 'move', // 拖动的实时效果
  dataCache: [], // 缓存数据
}

// 点击相关的对象方法
const clickObjFun: { [key: string]: Function } = {};

// 这里设置其他右键菜单关闭---原因是：默认右键点击时，el-popover默认不能关闭上次的右键菜单，
clickObjFun.handleContextMenu = function (event: any, id: string) {
  // 处理右键点击
  console.log('处理右键点击', id);
  dataAbout.visible = id;
}

// 重置当前子项默认状态 --- 单列唯一
clickObjFun.resetItemDefault = function (selectedItem: string) {
  let resData = {};
  const dataOrigin = dataAbout.list;
  // 1.找到当前子项数据
  outer: for (let i = 0; i < dataOrigin.length; i++) {
    const itemArray = dataOrigin[i].value;
    for (let j = 0; j < itemArray.length; j++) {
      if (itemArray[j].name === selectedItem) {
        resData = itemArray[j];
        break outer;
      }
    }
  }
  // 2.重置当前子项数据
  dataAbout.list = resetDefaultCommon(JSON.parse(JSON.stringify(resData)));
  // 3.右键菜单关闭
  dataAbout.visible = "";
  // 4.发送更新数据事件
  emit('update', JSON.parse(JSON.stringify(dataAbout.list)));
}

// 移除当前子项
clickObjFun.deleteItemDefault = async function (itemId: string) {
  console.group('移除当前子项');
  console.log('itemId', itemId);
  console.log('dataAbout.list', JSON.parse(JSON.stringify(dataAbout.list)));
  let dataOrigin = JSON.parse(JSON.stringify(dataAbout.list));
  // 1.删除当前子项
  dataOrigin.forEach((item: DragListDataType) => item.value = item.value.filter((value: DragItemType) => value.id !== itemId));
  // 2.调整各个子项id，大于当前子项的id减1，使其保持连续
  dataOrigin.forEach((item: DragListDataType) => {
    item.value.forEach((value: DragItemType, index: number) => {
      if (value.id > itemId) {
        value.id = (+value.id - 1).toString();
      }
    });
  });
  const count = dataOrigin.reduce((acc: number, cur: DragListDataType) => acc + cur.value.length, 0);
  // 3.新建空列表，填充对应数据
  const resetData: Array<DragListDataType> = new Array(count);
  for (let i = 0; i < count; i++) {
    resetData[i] = JSON.parse(JSON.stringify({ key: (i + 1).toString(), value: [] }));
  }
  resetData.forEach((item1: DragListDataType) => {
    const key = item1.key;
    dataOrigin.forEach((item2: DragListDataType, index: number) => {
      if (item2.value.length > 0 && item2.value[0].id === key) {
        item1.value = item2.value;
      }
    });
  });
  console.log('resetData', resetData);
  console.groupEnd();
  dataAbout.list = JSON.parse(JSON.stringify(resetData));
  // 4.右键菜单关闭
  dataAbout.visible = "";
  // 5.发送删除数据事件，参数为：删除的子项所在的列表数据，删除的子项索引(从0开始)
  emit('deleteItem', resetData, +itemId - 1);
  // 6.右键菜单先全部删除，浏览器渲染之后再重新生成，这是为了解决响应式数据变化而el-popover的绝对定位位置不变的问题
  dataAbout.isDeleteItemHandle = true;
  await nextTick();
  dataAbout.isDeleteItemHandle = false;
}

// groupComputed方法，用于组装group和判断是否为可拖动列表
const groupComputed = (data: DragListDataType) => {
  return data.value.length > 0 && data.value[0].isDrag ? props.group : props.group + '-no-drag';
};

function change(e: any) {
  // console.log('change', e);
}

function move(e: any) {
  // console.log('move', e);
}

function sore(e: any) {
  // console.log('sort')
  // return false;
}

function onUpdate() {
  console.log('update')
}

function onAdd(e: any) {
  // console.log('add')
}

function remove() {
  // console.log('remove')
}

// 开始拖动时，缓存数据，为了在拖动结束时还原数据做准备
const onStart = (e: any) => {
  // console.log('start');
  dataConst.dataCache = JSON.parse(JSON.stringify(dataAbout.list)); // 深拷贝
}

// 延迟函数
function delay(time = 100) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * @description 拖动结束时，进行数据处理
 * 1.停顿100ms；
 * 2.判断是否拖动到非可放置区域；
 *  2.1 是，则还原数据，并且返回；
 *  2.2 否，往下执行。
 * 3 判断是否拖动到重置框中；
 *  3.1 是，则进行重置列表操作；
 *  3.2 否，则进行排序操作。
 * 4.发送更新数据事件。
 * @param e 事件对象
 */
const onEnd = async (e: any) => {
  // console.group('end');
  await delay(100); // 停顿100ms，注：这里必须进行停顿，因为此时监听的drag事件中的数据由于使用了防抖函数，可能还未更新到最新数据。（测试下来，这里快了50ms左右，所以这里设置100ms停顿）
  // console.log(e)
  // 1.若拖动到非可放置区域，则还原数据
  // 2.非拖动状态（pullMode为undefined），则还原数据 --- 暂不开放
  if (dataConst.dropEffect === 'none') { //  dataConst.dropEffect === 'none' || !e.pullMode
    dataAbout.list = JSON.parse(JSON.stringify(dataConst.dataCache));
    return;
  }
  if (dragResetDefaultFlag(e)) { // 拖动到重置框中，进行重置列表操作
    console.log(e);
    resetDefault(e);
  } else { // 拖动到其他列表中，进行排序操作
    sortEnd(e);
    adjustOrder();
  }
  // console.groupEnd();
  emit('update', JSON.parse(JSON.stringify(dataAbout.list))); // 发送更新数据事件
}

/**
 * @autor jiangtao
 * @description 在拖动结束时，找到拖动的元素所在的数组，并将该元素拖动到数组的最后
 * 注意：这里不能在onAdd中进行排序，因为onAdd中移动是异步的，此时还未更新到最新数据，导致排序错误。
 * 因此，这里在onEnd中进行排序。
 * @param e 事件对象
 */
const sortEnd = (e: any) => {
  // console.group('sortEnd');
  const listData: Array<any> = JSON.parse(JSON.stringify(dataAbout.list)); // 深拷贝
  // console.log('JSON.stringify(dataAbout.list)', JSON.stringify(dataAbout.list));
  // console.log('sortEnd', listData);
  // console.log('e', e);
  const dragText = e.item.innerText; // 拖动的元素文本，A1
  const from_innerText = e.from.innerText; // 拖动的元素原始所在的列表文本（已去除拖动元素） B1\nC3
  const to_innerText = e.to.innerText; // 拖动的元素目标所在的列表文本（已添加拖动元素）  A1\nD4\nE5
  const tt = to_innerText.split('\n');
  // 处理数据, 找到拖动的元素，拖动到数组最后
  handleData: for (let i = 0; i < listData.length; i++) {
    let itemArray = listData[i].value;
    for (let j = 0; j < itemArray.length; j++) {
      if (dragText === itemArray[j].name && j !== itemArray.length - 1) {
        const data = itemArray[j];
        itemArray.splice(j, 1);
        itemArray.push(data);
        break handleData;
      }
    }
  }
  // console.log('sortEnd', listData);
  // console.groupEnd();
  dataAbout.list = listData;
}

/**
 * 调整顺序，确保列表中的第一个元素和默认列表是对应的。
 * 例如：[{ name: 'xxx-2', id: '2' }, { name: 'xxx-1', id: '1' }]列表，该列表就应该在总list数组中的第二个位置
 */
const adjustOrder = () => {
  // 注意：这里需要拷贝两次，然后整理最终的数据，再赋值给dataAbout.list，
  //（先循环清空响应式数据，再循环赋值会导致顺序出现问题，原因是两个for循环同时执行，响应式数据渲染出现问题）
  // 猜测v-if可能会解决这个问题，没有尝试，因为在这里v-if和v-for在一起使用会有问题，同时频繁的v-if切换会影响性能
  const copyData1: Array<any> = JSON.parse(JSON.stringify(dataAbout.list)); // 深拷贝
  const copyData2: Array<any> = JSON.parse(JSON.stringify(dataAbout.list)); // 深拷贝
  // console.log(dataAbout.list);
  // console.log(copyData1);

  copyData1.forEach(item => item.value.length = 0); // 模拟清空
  copyData2.forEach((itemArray: any, index: number) => {
    if (itemArray.value.length === 0) return;
    copyData1.forEach(item => {
      if (item.key === itemArray.value[0].id) {
        item.value.push(...itemArray.value);
      }
    });
  });
  dataAbout.list = copyData1;
}

// 判断是否拖动到重置框中
const dragResetDefaultFlag = (e: any) => {
  let flag = true; // 标识，默认是true，表示拖动到重置框中
  const id = e.originalEvent.toElement.id;
  // if (!id || !idArray.includes(id)) flag = false; // 没有拖动到重置框中
  if (!id || e.pullMode) flag = false; // 没有拖动到重置框中
  return flag;
}

/**
 * 重置默认列表：元素拖动到重置框中，源列表中移除拖动的元素，默认列表中显示拖动的元素
 * @param e 事件对象
 */
const resetDefault = (e: any) => {
  console.log('resetDefault');
  // 拖动的元素数据
  let dragData: any = {};
  const symbolKeys = Object.getOwnPropertySymbols(e.item);
  symbolKeys.forEach(symbol => {
    dragData = e.item[symbol]; // Symbol(cloneElement), 输出 { name: 'xxx-1', id: '1' }
  });
  console.log('dragData', dragData);
  dataAbout.list = resetDefaultCommon(dragData);
}

/**
 * 
 * @param dragData 拖动的元素数据
 * @returns 处理后的列表数据
 */
const resetDefaultCommon = (dragData: any) => {
  const listData: Array<any> = JSON.parse(JSON.stringify(dataAbout.list)); // 深拷
  console.groupCollapsed('dragData', dragData);
  // 处理数据
  let originIndex = 0; // 源列表索引，从0开始
  let dragItemIndex = 0; // 拖动的元素索引，从0开始
  // let dragItemId: string = '1'; // 拖动的元素id
  let dragItemNextId: string = '1'; // 拖动的元素后一个元素id
  let newArray = []; // 新的数组
  handleData: for (let i = 0; i < listData.length; i++) {
    let itemArray = listData[i].value;
    for (let j = 0; j < itemArray.length; j++) {
      if (JSON.stringify(dragData) === JSON.stringify(itemArray[j]) && itemArray.length > 1) { // 源列表中最少有两个元素
        const itemArrayCache = JSON.parse(JSON.stringify(itemArray));
        if (j === 0) { // 若拖动的是第一个元素，则将源列表中第二个直至最后一个元素都添加到第二个元素所在的默认列表中
          dragItemNextId = itemArrayCache[1].id;
          originIndex = i;
          dragItemIndex = 0;
          newArray = itemArrayCache.splice(1);
          console.log(itemArray);
          console.log(newArray);
        } else {
          originIndex = i;
          dragItemIndex = j;
          // 源列表中移除拖动的元素
          itemArrayCache.splice(j, 1);
          // 对应的默认列表中显示拖动的元素
          // listData.forEach(item => {
          //   if (item.key === dragData.id) {
          //     item.value.push(dragData);
          //   }
          // });
        }
        break handleData;
      }
    }
  }
  if (dragItemIndex === 0) {
    listData[originIndex].value.splice(1);
    listData.forEach(item => {
      if (item.key === dragItemNextId) {
        item.value.push(...newArray);
      }
    });
  } else {
    listData[originIndex].value.splice(dragItemIndex, 1);
    listData.forEach(item => {
      if (item.key === dragData.id) {
        item.value.push(dragData);
      }
    });
  }
  console.log(listData);
  console.groupEnd();
  return listData;
}

/**
 * @description 监听拖动事件，实时更新dropEffect
 * 注：这里必须使用防抖函数，否则dropEffect获取的值一直是none。
 * 原因是e.dataTransfer.dropEffect的值是异步更新的，实际上此时的e值只是{"isTrusted":true}，其他属性还未更新，所以获取的值一直是none。
 * @param e 事件对象
 */
const debouncedFn = useDebounceFn((e: any) => {
  dataConst.dropEffect = e.dataTransfer.dropEffect;
  // console.log('dropEffect', e.dataTransfer.dropEffect);
}, 100);

// 处理子项点击逻辑 -- 点击切换显示隐藏legend效果
const handleItemClick = (data: Array<DragListDataType>, selectedItem: string) => {
  const dataOrigin = data;
  outer: for (let i = 0; i < dataOrigin.length; i++) {
    const itemArray = dataOrigin[i].value;
    for (let j = 0; j < itemArray.length; j++) {
      if (itemArray[j].name === selectedItem) {
        if (j === 0) { // 点击的元素是当前列中第一个，隐藏当前列
          const isShow = !dataOrigin[i].value[j].isShow;
          dataOrigin[i].value.forEach(item => item.isShow = isShow);
        } else { // 点击的元素不是当前列中第一个，只隐藏当前元素
          itemArray[j].isShow = !itemArray[j].isShow;
        }
        break outer;
      }
    }
  }
  return JSON.parse(JSON.stringify(dataOrigin));
}
// 处理子项点击逻辑 -- 点击切换显示隐藏legend效果
const handleItemClickFun = (e: any) => {
  console.log('click', e);
  console.log('click', e.target);
  if (!e.target.classList.contains('cursor-move') && !e.target.classList.contains('cursor-move-item')) return;
  console.log('click点击了子级元素:', e.target.textContent);
  const text = e.target.textContent;
  const handleData = handleItemClick(dataAbout.list, text);
  emit('update', handleData);
}

// 初始化事件监听
const initEventListeners = () => {
  // 1.监听拖动事件
  const container: HTMLDivElement = document.querySelector(".drag-container") as HTMLDivElement;
  container.addEventListener('drag', debouncedFn);
  // 2.监听鼠标点击事件--点击切换显示隐藏legend效果，通过改变series系列的show属性实现
  const selectors = props.id ? `.${props.id}.main` : '.main';
  const main = document.querySelector(selectors) as HTMLDivElement;
  main.addEventListener('click', handleItemClickFun);
}

// 移除事件监听
const removeEventListener = () => {
  // 1.移除拖动事件监听
  const container: HTMLDivElement = document.querySelector(".drag-container") as HTMLDivElement;
  container.removeEventListener('drag', debouncedFn);
  // 2.移除鼠标点击事件--点击切换显示隐藏legend效果
  const selectors = props.id ? `.${props.id}.main` : '.main';
  const main = document.querySelector(selectors) as HTMLDivElement;
  main.removeEventListener('click', handleItemClickFun);
}

// 组装子项数据
const packageItem = (name: string, id: string, isShow: boolean = true, isDrag: boolean = true): DragItemType => {
  return { name, id, isShow, isDrag }
}


// 获取所有数据 --- 导出方法
const getAllData = (): Array<DragListDataType> => {
  return JSON.parse(JSON.stringify(dataAbout.list));
}

// 子组件暴露变量和方法
const exposedMethods: DragExposedMethods = {
  getAllData
};
defineExpose(exposedMethods);

watch(() => props.data, (newVal, oldVal) => { // TAG: 这里需要注意，第二次触发，打印的newVal和oldVal都是同一个数组，原因是父级对数组进行了push操作，并没有改变数组的地址，所以这里虽然会触发watch，但newVal和oldVal都是同一个数组。
  // 解决方法：在父级使用JSON.stringify()对数组进行赋值，这里数组地址就改变了，newVal和oldVal就不会是同一个数组了。
  // console.log('watch', newVal, oldVal);
  if ((!oldVal || oldVal?.length === 0) && newVal.length > 0) { // 初始化数据
    dataAbout.list = newVal.map((item, index) => {
      return { key: (index + 1).toString(), value: [packageItem(item.name, (index + 1).toString(), true, item.isDrag)] };
    });
  }
  if (dataAbout.list.length > 0 && newVal.length === dataAbout.list.length + 1) { // 新增数据，默认加在最后
    const index = newVal.length;
    dataAbout.list.push({ key: index.toString(), value: [packageItem(newVal[index - 1].name, index.toString(), true, newVal[index - 1].isDrag)] });
  }
  // console.log('dataAbout.list', dataAbout.list);
}, { deep: true, immediate: true });

onMounted(() => {
  initEventListeners();
});

//销毁
onBeforeUnmount(() => {
  removeEventListener();
});
</script>

<style scoped lang="less">
@import '@/assets/styles/mixin.less';

.main {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 5px;

  .drag-column,
  .drag-column>div {
    z-index: 10;
  }

  .drag-column::after {
    content: attr(data-info);
    display: block;
    width: 100%;
    height: 100%;
    // padding-left: 0 17px;
    margin-top: -20px;
    opacity: 0;
    z-index: 1;
  }

  .cursor-move {

    &:hover {
      background-color: #f5f5f5;
      cursor: pointer;
    }
    &:hover:has(.dark) {
      background-color: #8E84CB;
    }

    &.no-drag:hover {
      cursor: default;
    }

    &.vague {
      opacity: 0.5;
    }

    .line {
      background-color: var(--color);
      position: relative;
    }

    .line::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 50%;
      height: calc(var(--height) / 2);
      border-radius: 50%;
      border: 2px solid var(--color);
      background-color: #FFFFFF;
    }

    .dark .line::after {
      background-color: var(--color);
    }

    .cursor-move-item {
      color: #333;
      font-size: var(--move-item-font-size);
      font-weight: 450;
      font-family: Arial, sans-serif;
      background-color: transparent;
    }

    .dark .cursor-move-item {
      color: #EDF0F9;
    }
  }
}
</style>