<template>
  <div class="yaxis-limit-container">
    <div class="flex items-center gap-5px">
      <span>启用：</span>
      <el-switch v-model="isYAxisLimitEnabled" inline-prompt active-text="是" inactive-text="否" />
    </div>
    <div class="flex items-center gap-5px">
      <span>Y轴最小值：</span>
      <el-input type="number" v-model="yAxisMinLimit" :disabled="!isYAxisLimitEnabled" class="!w-5rem" />
    </div>
    <div class="flex items-center gap-5px">
      <span>Y轴最大值：</span>
      <el-input type="number" v-model="yAxisMaxLimit" :disabled="!isYAxisLimitEnabled" class="!w-5rem" />
    </div>
  </div>
  <div class="flex justify-end items-center">
    <el-button @click="cancelHandle">取消</el-button>
    <el-button type="primary" @click="confirmHandle">确定</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { YAxisLimitType } from './type';
import { ElMessage } from 'element-plus';

const emit = defineEmits(['cancel', 'confirm']);

const props = defineProps({
  isYAxisLimitEnabled: {
    type: Boolean,
    default: false,
  },
  yAxisMinLimit: {
    type: Number,
    default: 0,
  },
  yAxisMaxLimit: {
    type: Number,
    default: 0,
  },
  dialogVisible: {
    type: Boolean,
    default: false,
  }
});

const isYAxisLimitEnabled = ref(props.isYAxisLimitEnabled); // 是否启用Y轴区间限制
const yAxisMinLimit = ref(props.yAxisMinLimit); // Y轴最小值
const yAxisMaxLimit = ref(props.yAxisMaxLimit); // Y轴最大值

// 取消按钮点击事件
const cancelHandle = () => {
  emit('cancel');
}

// 确定按钮点击事件
const confirmHandle = () => {
  if (yAxisMinLimit.value >= yAxisMaxLimit.value) {
    ElMessage.warning('Y轴设定的最小值不能大于或等于Y轴设定的最大值，请重新输入！');
    return; 
  }
  const data: YAxisLimitType = {
    isYAxisLimitEnabled: isYAxisLimitEnabled.value,
    yAxisMinLimit: Number(yAxisMinLimit.value),
    yAxisMaxLimit: Number(yAxisMaxLimit.value),
  }
  emit('confirm', data);
}

// 更新数据
const updateData = () => {
  isYAxisLimitEnabled.value = props.isYAxisLimitEnabled;
  yAxisMinLimit.value = props.yAxisMinLimit;
  yAxisMaxLimit.value = props.yAxisMaxLimit;
}

// 监听是否打开子画面
watch(() => props.dialogVisible, (newVal) => {
  if (!newVal) return;
  updateData();
});

</script>

<style scoped lang="less">
@import '@/assets/styles/mixin.less';
@import '@/assets/styles/common.less';

.yaxis-limit-container {
  .flex-column(center, normal);
  gap: 10px;
}
</style>