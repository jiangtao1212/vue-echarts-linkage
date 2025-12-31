<template>
  <div class="yaxis-limit-container">
    <div class="yaxis-limits">
      <template v-for="item in yAxisLimits" :key="item.seriesName">
        <div class="yaxis-limit-item">
          <div class="header flex justify-center items-center">
            <span class="font-bold text-1rem color-#333">{{ item.seriesName }}</span>
          </div>
          <div class="content">
            <div class="content-item flex items-center gap-5px">
              <span class="w-5rem flex justify-end">启用：</span>
              <el-switch class="h-1.5rem" v-model="item.isYAxisLimitEnabled" inline-prompt active-text="是"
                inactive-text="否" />
            </div>
            <div class="content-item flex items-center gap-5px">
              <span class="w-5rem flex justify-end">Y轴最小值：</span>
              <el-input type="number" v-model="item.yAxisMinLimit" :disabled="!item.isYAxisLimitEnabled" class="!w-5rem"
                size="small" />
            </div>
            <div class="content-item flex items-center gap-5px">
              <span class="w-5rem flex justify-end">Y轴最大值：</span>
              <el-input type="number" v-model="item.yAxisMaxLimit" :disabled="!item.isYAxisLimitEnabled" class="!w-5rem"
                size="small" />
            </div>
          </div>
        </div>
      </template>
    </div>
    <div class="flex justify-end items-center">
      <el-button @click="cancelHandle">取消</el-button>
      <el-button type="primary" @click="confirmHandle">确定</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, type PropType } from 'vue';
import type { YAxisLimitType } from './type';
import { ElMessage } from 'element-plus';
import { CloneUtils } from '@/utils/index';

const emit = defineEmits(['cancel', 'confirm']);

const props = defineProps({
  yAxisLimits: {
    type: Array as PropType<YAxisLimitType[]>,
    default: () => ([]),
  },
  dialogVisible: {
    type: Boolean,
    default: false,
  }
});

// Y轴区间限制数据
const yAxisLimits = ref<YAxisLimitType[]>(props.yAxisLimits);

// 取消按钮点击事件
const cancelHandle = () => {
  emit('cancel');
}

// 确定按钮点击事件
const confirmHandle = () => {
  let isError = false;
  outer: for (let index = 0; index < yAxisLimits.value.length; index++) {
    const item = yAxisLimits.value[index];
    if (!item.isYAxisLimitEnabled) continue; // 如果未启用Y轴区间限制，则跳过
    if (Number(item.yAxisMinLimit) >= Number(item.yAxisMaxLimit)) {
      ElMessage.warning(`【${item.seriesName}】的Y轴设定最小值不能大于或等于最大值，请重新输入！`);
      isError = true;
      break outer;
    }
  }
  if (isError) return;
  const data: YAxisLimitType[] = CloneUtils.deepClone(yAxisLimits.value);
  emit('confirm', data);
}

// 更新数据
const updateYAxisLimits = () => {
  yAxisLimits.value = props.yAxisLimits;
}

// 监听是否打开子画面
watch(() => props.dialogVisible, (newVal) => {
  if (!newVal) return;
  updateYAxisLimits();
}, { immediate: true });

</script>

<style scoped lang="less">
@import '@/assets/styles/mixin.less';
@import '@/assets/styles/common.less';

.yaxis-limit-container {
  .flex-column(flex-start, normal);
  gap: 1rem;

  .yaxis-limits {
    .flex-row(flex-start, center);
    gap: 10px;
    width: 100%;
    overflow-x: auto;
    padding-bottom: .5rem;
    // 隐藏滚动条，但还需要占位，否则悬停的时候高度会变化，画面会闪烁
    // 注意：Firefox 的滚动条样式控制有限，无法实现"透明但占位"的效果
    // 这里 Firefox 使用 thin 保持最小占位
    scrollbar-width: thin;

    .yaxis-limit-item {
      .flex-column(flex-start, center);
      gap: 10px;
      border: 1px solid #ccc;
      border-radius: 5px;
      padding: 5px 10px;
    }

    .header {
      // 不允许换行
      white-space: nowrap;
    }

    .content {
      width: 100%;
      min-width: 10rem;
      // 不允许换行
      white-space: nowrap;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

  }
}
</style>