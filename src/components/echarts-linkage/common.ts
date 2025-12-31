/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2025-12-31 10:55:53
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2025-12-31 16:31:56
 * @FilePath: \vue-echarts-linkage\src\components\echarts-linkage\common.ts
 * @Description: 公共的数据和方法
 */

// series数据类型
export const SERIES_TYPE_PULSE = 'pulse'; // 脉冲量
export const SERIES_TYPE_SWITCH = 'switch'; // 开关量
export const SERIES_TYPE_MARK_LINE = 'markLine'; // 标记线
export const SERIES_TYPE_DEFAULT = SERIES_TYPE_PULSE; // 默认值为脉冲量

// series图表类型
export const SERIES_CLASS_TYPE_LINE = 'line'; // 折线图
export const SERIES_CLASS_TYPE_BAR = 'bar'; // 柱状图
export const SERIES_CLASS_TYPE_DEFAULT = SERIES_CLASS_TYPE_LINE; // 默认值为折线图

// 主题
export const THEME_LIGHT = 'light'; // 浅色主题
export const THEME_DARK = 'dark'; // 深色主题
export const THEME_DEFAULT = THEME_LIGHT; // 默认主题
// 主题颜色
export const THEME_COLOR = {
  'DARK': { // 黑色主题
    BACKGROUND_COLOR: '#100C2A',
  },
  'LIGHT': { // 白色主题
    BACKGROUND_COLOR: '#fff',
  }
};

// 语言
export const LANGUAGE_ZH_CN = 'zh-cn'; // 中文
export const LANGUAGE_EN_US = 'en-us'; // 英文
export const LANGUAGE_DEFAULT = LANGUAGE_ZH_CN; // 默认语言

// 放缩
export const MODE_ENLARGE = 'enlarge'; // 放大模式
export const MODE_SHRINK = 'shrink'; // 缩小模式
export const MODE_DEFAULT = MODE_ENLARGE; // 默认模式

// 显示图形的图表组
export const USE_GRAPHIC_GROUP_DEFAULT = 'all'; // 默认值，all代表所有图表都使用图形


