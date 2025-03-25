import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import UnoCSS from 'unocss/vite'
import dts from 'vite-plugin-dts'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    AutoImport({
      resolvers: [ElementPlusResolver()]
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    }),
    UnoCSS(),
    viteStaticCopy({ // 复制文件到打包目录下
      targets: [
        {
          src: 'src/components/echarts-linkage/readme.md',
          dest: ''
        }
      ]
    }),
    dts({
      // ts配置文件路径
      tsconfigPath: './tsconfig.build.json',
      // 动态导入改为静态导入
      staticImport: true,
      // 是否创建类型入口文件
      insertTypesEntry: true,
      // 类型入口文件输出目录，默认为lib.outDir配置的目录
      outDir: 'dist',
      copyDtsFiles: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  publicDir: 'empty',
  build: {
    outDir: 'dist',
    // assetsDir: 'assets',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VueEchartsLinkage',
      // formats: ['es', 'umd'], // 指定输出的格式，这里同时生成 ES 和 UMD 格式
      // the proper extensions will be added
      fileName: 'vue-echarts-linkage',
    },
    // sourcemap: true, // 启用 source map 支持
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: [
        'vue',
        "@element-plus/icons-vue",
        "@vueuse/core",
        "echarts",
        "echarts/core",
        "echarts/charts",
        "echarts/renderers",
        "echarts/components",
        "element-plus",
        "html2canvas",
        "print-js",
        "vue-draggable-plus",
        "vue3-infinite-scroll-better",
        "xlsx"
      ],
      output: {
        // 解决在混合模式下（全局引入+按需引入）的警告
        exports: 'named',
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {
          vue: 'Vue',
          'element-plus': 'elementPlus',
          'echarts': 'echarts',
          'html2canvas': 'html2canvas',
          'print-js': 'printJS',
          'vue-draggable-plus': 'VueDraggablePlus',
          'vue3-infinite-scroll-better': 'infiniteScroll',
          'xlsx': 'xlsx'
        }
      },
      // output: [
      //   {
      //     // ES 模块格式的输出配置
      //     format: 'es',
      //     entryFileNames: 'vue-echarts-linkage.es.js',
      //     dir: 'dist', // 输出目录
      //     exports: 'named',
      //   },
      //   {
      //     // UMD 模块格式的输出配置
      //     format: 'umd',
      //     entryFileNames: 'vue-echarts-linkage.umd.js',
      //     name: 'vue-echarts-linkage',
      //     dir: 'dist',
      //     exports: 'named',
      //     // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
      //     globals: {
      //       vue: 'Vue',
      //       'element-plus': 'elementPlus',
      //       'echarts': 'echarts',
      //       'html2canvas': 'html2canvas',
      //       'print-js': 'printJS',
      //       'vue-draggable-plus': 'VueDraggablePlus',
      //       'vue3-infinite-scroll-better': 'infiniteScroll',
      //       'xlsx': 'xlsx'
      //     }
      //   },
      // ]
    }
  }
})
