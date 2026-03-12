import { resolve } from 'path';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
/**
 * Vite 插件：CSS 模块化构建
 * 1. 拦截 import CSS from "$/v-scroll.js" 导入
 * 2. 读取 src/v-scroll.css 源码
 * 3. 压缩并包装为 export default '...' 格式
 * 4. 构建时生成独立的主题文件到 dist/theme/v-scroll.js
 */
function vScrollCSSPlugin() {
  const virtualModuleId = 'virtual:v-scroll-css';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;
  let cssSourcePath = '';
  let outputDir = 'dist';
  return {
    name: 'v-scroll-css-plugin',
    // 1. 利用 configResolved 钩子获取路径配置
    configResolved(config) {
      cssSourcePath = resolve(config.root, 'src/v-scroll.css');
      outputDir = resolve(config.root, config.build.outDir || 'dist');
    },
    // 2. 拦截 $/v-scroll.js 导入，重定向到虚拟模块
    resolveId(id) {
      if (id === '$/v-scroll.js' || id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    // 3. 加载虚拟模块：读取 CSS -> 压缩 -> 包装为 JS
    load(id) {
      if (id === resolvedVirtualModuleId) {
        try {
          let css = readFileSync(cssSourcePath, 'utf-8');
          // 压缩逻辑：去除注释、压缩空白
          css = css
            .replace(/\/\*[\s\S]*?\*\//g, '') // 移除注释
            .replace(/\n/g, ' ')              // 换行转空格
            .replace(/\s+/g, ' ')             // 多个空格压缩为一个
            .replace(/\s*([{};:,>~+])\s*/g, '$1') // 去除符号周围空白
            .replace(/;}/g, '}')              // 优化结尾
            .trim();
          // 包装为 JS 模块导出
          return `export default \`${css}\`;`;
        } catch (e) {
          console.error('[v-scroll-plugin] 读取 CSS 失败:', e);
          return 'export default "";';
        }
      }
    },
    // 4. 构建完成后，生成独立的主题 JS 文件供第三方引用
    writeBundle() {
      try {
        let css = readFileSync(cssSourcePath, 'utf-8');
        // 同样的压缩逻辑
        css = css
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\s*([{};:,>~+])\s*/g, '$1')
          .replace(/;}/g, '}')
          .trim();
        const themeDir = resolve(outputDir, 'theme');
        if (!existsSync(themeDir)) {
          mkdirSync(themeDir, { recursive: true });
        }
        // 写入 dist/theme/v-scroll.js
        // 这就是用户可以通过 Import Map 映射的主题文件
        const themeContent = `/* Auto-generated from v-scroll.css */\nexport default \`${css}\`;`;
        writeFileSync(resolve(themeDir, 'v-scroll.js'), themeContent);
        console.log('[v-scroll-plugin] 主题文件已生成: dist/theme/v-scroll.js');
      } catch (e) {
        console.error('[v-scroll-plugin] 生成主题文件失败:', e);
      }
    }
  };
}
export default {
  plugins: [vScrollCSSPlugin()],
  resolve: {
    alias: {
      // 确保开发环境下 $/ 别名可用
      '$/': resolve(__dirname, 'src/')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      name: 'VScroll',
      formats: ['es'],
      fileName: 'v-scroll'
    },
    rollupOptions: {
      // 注意：不要将 $/ 开头的路径 external 化，否则开发模式下会找不到
      // 但在发布库时，通常需要处理这个依赖。
      // 此处保留默认打包行为，将 CSS 模块代码打包进主文件或独立 chunk
    }
  }
};