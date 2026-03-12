## v-scroll

一个基于 Web Components 的自定义滚动条组件，使用 **Vite 7 + lightningcss** 构建，可通过 **Import Map** 灵活切换主题。

---

### 安装

```bash
# npm
npm install v-scroll

# 或 pnpm
pnpm add v-scroll

# 或 bun
bun add v-scroll
```

---

### 快速上手

#### 1. 在页面中配置 Import Map（主题路径）

```html
<script type="importmap">
{
  "imports": {
    "$/": "/dist/theme/"  // 指向 v-scroll 主题模块所在路径
  }
}
</script>
```

> 生产环境中，`"/dist/theme/"` 一般是你部署后 `dist/theme/` 的访问路径。  
> 第三方只需要修改这里的 `"$/"` 映射，就可以切换不同主题目录。

#### 2. 引入组件（ESM）

```js
// 方式一：按需引入（推荐）
import VScroll from 'v-scroll';

// 或方式二：同时导出命名
import VScrollDefault, { VScroll } from 'v-scroll';
```

在 HTML 中直接使用：

```html
<v-scroll style="height: 300px;">
  <p>内容 1</p>
  <p>内容 2</p>
  <!-- 任意可滚动内容 -->
</v-scroll>
```

组件内部会执行：

```js
import CSS from '$/v-scroll.js';
```

并将导入的 CSS 字符串注入到 `document.head` 中（全局 `<style>`），**不写入 Shadow DOM**。

---

### 主题与样式定制

#### Import Map 切换主题

默认构建会输出：

```text
dist/
  v-scroll.js         // 组件 JS 入口（库导出）
  v-scroll.css        // 组件基础样式（直接 import 'v-scroll/style' 使用）
  theme/
    v-scroll.js       // 由插件自动生成的主题模块：export default '...minified CSS...'
```

页面中指定：

```html
<script type="importmap">
{
  "imports": {
    "$/": "/dist/theme/"
  }
}
</script>
```

要切换到其他主题，只要把 `"$/"` 指到另一个目录即可：

```html
<script type="importmap">
{
  "imports": {
    "$/": "/themes/dark/"
  }
}
</script>
```

前提是 `/themes/dark/v-scroll.js` 同样导出 `export default '...css...'`。

#### CSS 变量与 `::part` 定制

`v-scroll` 通过 **CSS 自定义属性 + ::part** 暴露内部结构，外部可以覆盖变量实现样式定制，例如：

```css
/* 基础尺寸与颜色变量（外部可覆盖） */
v-scroll {
  --v-scroll-thumb-width: 4px;
  --v-scroll-track-expanded-width: 14px;
  --v-scroll-thumb-bg: rgba(0,0,0,0.35);
  --v-scroll-thumb-bg-hover: rgba(0,0,0,0.15);
  --v-scroll-thumb-bg-active: rgba(0,0,0,0.6);
  --v-scroll-track-bg: rgba(0,0,0,0.05);
  --v-scroll-track-border-color: rgba(0,0,0,0.1);
  --v-scroll-thumb-radius: 3px;
  --v-scroll-thumb-min-height: 20px;
}

/* 自定义某个实例的主题 */
v-scroll.dark {
  --v-scroll-thumb-bg-hover: rgba(255,255,255,0.3);
  --v-scroll-thumb-bg-active: rgba(255,255,255,0.7);
}
```

交互状态通过宿主属性 + `::part` 控制，例如：

```css
/* 滚动容器 */
v-scroll::part(scroll) { ... }

/* 轨道 */
v-scroll::part(bar) { ... }

/* 滑块，在滚动 / 悬停 / 拖拽时的样式 */
v-scroll[data-scrolling]::part(thumb) { ... }
v-scroll[data-hovering-thumb]::part(thumb) { ... }
v-scroll[data-dragging]::part(thumb) { ... }
```

---

### 构建说明（库作者视角）

> 使用者通常不需要关心本小节，只面向维护 / 二次开发该库的人。

- **构建工具**：Vite 7（ESM）、`lightningcss` 用于 CSS 压缩。
- **入口文件**：`src/main.js` 导出组件；`src/v-scroll.js` 定义 Web Component 逻辑。
- **CSS 模块化插件**（在 `vite.config.js` 中）：
  - 使用 `configResolved` 钩子找到 `src/v-scroll.css`；
  - 借助 `lightningcss.transform({ minify: true })` 去除注释与空白并压缩；
  - dev 模式下：提供虚拟模块响应 `import "$/v-scroll.js"`；
  - build 完成后：自动生成 `dist/theme/v-scroll.js`，内容为 `export default \`...minified css...\`;`。

构建命令：

```bash
# 使用 npm
npm run build

# 使用 bun
bun run vite build
```

构建完成后，就可以把 `dist/` 发布为第三方公共组件包，使用方通过 Import Map 即可定制 / 替换滚动条主题。
