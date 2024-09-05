import type { App } from 'vue'
import './assets/main.css'
import 'virtual:uno.css'
import VueEchartsLinkage from '@/components/echarts-linkage/index.vue';
export { type ExposedMethods, type OneDataType, type seriesIdDataType, type DataAboutType, type seriesTagType, type dropEchartType } from '@/components/echarts-linkage/types/index';

/**
 * 1.按需引入组件
 * ...
 * import { VueEchartsLinkage } from 'vue-echarts-linkage';
 * import "vue-echarts-linkage/dist/style.css";
 */
export { VueEchartsLinkage };

/**
 * 2.全局注册组件
 * 这里默认导出一个vue支持的install方法
 * 可以在main.ts中使用以下方式全局导入组件
 *
 * import VueEchartsLinkage from 'vue-echarts-linkage';
 * import "vue-echarts-linkage/dist/style.css";
 * .....
 * app.use(VueEchartsLinkage);
 */
export default {
  install(app: App) {
    app.component("VueEchartsLinkage", VueEchartsLinkage);
    // 如果还有更多的组件需要注册，可以在这里继续添加
    //  app.component("XXX1", XXX1);
    //  app.component("XXX2", XXX2);
  }
}


