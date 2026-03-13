

# v-scroll

一个基于 Web Components 的轻量级自定义滚动条组件。使用 **Vite 7** 构建，利用 **Shadow DOM** 封装内部结构，支持通过 **Import Map** 或构建工具别名灵活切换主题。

## 特性

- **原生规范**：基于 Web Components 标准，无框架依赖。
- **Shadow DOM**：内部结构样式隔离，通过 `::part()` 暴露样式钩子。
- **主题分离**：样式通过外部模块引入，支持运行时切换主题。
- **高性能**：使用 `lightningcss` 压缩，利用 `ResizeObserver` 监听尺寸变化。

---

## 安装

```bash
# npm
npm install v-scroll

# pnpm
pnpm add v-scroll

# bun
bun add v-scroll
```

---

## 使用指南

由于组件逻辑依赖外部样式模块（`$/v-scroll.js`），你需要根据项目类型选择对应的配置方式。

### 方式一：构建工具项目 (Vite / Webpack / Rollup)

推荐在构建配置中将样式模块指向实体文件。

**1. 配置别名**

组件代码中引用了 `$/v-scroll.js`，你需要在构建工具中将其别名指向真实的物理文件路径。

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // 将虚拟模块 $/v-scroll.js 指向 node_modules 中的实际主题文件
      '$/v-scroll.js': path.resolve(__dirname, 'node_modules/v-scroll/dist/theme/v-scroll.js')
    }
  }
});
```

**2. 在代码中使用**

```javascript
// main.js
import VScroll from 'v-scroll';

// 注册组件（Web Components 标准流程）
customElements.define('v-scroll', VScroll);
```

```html
<!-- HTML 模板 -->
<v-scroll style="height: 300px;">
  <p>你的滚动内容...</p>
</v-scroll>
```

---

### 方式二：原生 HTML / 静态资源引入

在无构建工具的场景下，需要配合 `Import Map` 使用。

> **重要提示**：浏览器安全策略禁止在 `file://` 协议下使用 ES Modules。请务必使用本地服务器（如 VS Code Live Server 或 `npx serve`）预览页面。

**1. 复制静态资源**

将 `node_modules/v-scroll/dist` 目录复制到你的静态资源目录。
- 示例路径：`/public/v-scroll/` (目录下应包含 `v-scroll.js` 和 `theme/` 文件夹)

**2. 配置 Import Map 并注册**

根据你的服务器环境配置路径。

**情况 A：使用 Vite 开发服务器**
Vite 会自动将 `public` 目录映射到根路径 `/`，因此路径不需要包含 `public`：

```html
<head>
  <script type="importmap">
    {
      "imports": {
        "v-scroll": "./v-scroll/v-scroll.js",
        "$/v-scroll.js": "./v-scroll/theme/v-scroll.js"
      }
    }
  </script>
</head>
```

**情况 B：使用普通服务器 (如 Live Server / Nginx)**
路径通常是相对于 HTML 文件的相对路径：

```html
<head>
  <script type="importmap">
    {
      "imports": {
        "v-scroll": "./public/v-scroll/v-scroll.js",
        "$/v-scroll.js": "./public/v-scroll/theme/v-scroll.js"
      }
    }
  </script>
</head>
```

**3. 完整使用示例**

```html
<body>
  <v-scroll style="height: 400px; width: 300px; border: 1px solid #eee">
    <p>欢迎使用 v-scroll</p>
    <p>内容...</p>
  </v-scroll>

  <script type="module">
    // 1. 导入组件类
    import VScroll from "v-scroll";

    // 2. 手动注册组件 (关键步骤)
    customElements.define('v-scroll', VScroll);
  </script>
</body>
```

---

## 主题与样式定制

组件样式默认注入到页面的 `<head>` 中（全局生效），通过 **CSS 变量** 和 **::part()** 伪类实现深度定制。

### CSS 变量覆盖

通过设置宿主元素的 CSS 变量即可修改外观：

```css
v-scroll {
  --v-scroll-thumb-width: 6px;               /* 滑块宽度 */
  --v-scroll-thumb-bg: rgba(0, 0, 0, 0.3);   /* 滑块默认颜色 */
  --v-scroll-thumb-bg-hover: rgba(0, 0, 0, 0.5); /* 悬停颜色 */
  --v-scroll-thumb-bg-active: rgba(0, 0, 0, 0.8); /* 拖拽颜色 */
  --v-scroll-track-expanded-width: 12px;     /* 展开时轨道宽度 */
}
```

### 结构化样式 (::part)

组件内部结构通过 `part` 属性暴露，可直接控制布局：

```css
/* 滚动容器 */
v-scroll::part(scroll) {
  scrollbar-width: none; /* 隐藏原生滚动条 */
}

/* 滚动条轨道 */
v-scroll::part(bar) {
  background: transparent;
}

/* 滚动条滑块 */
v-scroll::part(thumb) {
  border-radius: 4px;
  background: var(--v-scroll-thumb-bg);
}

/* 交互状态 */
v-scroll[data-scrolling]::part(thumb) {
  opacity: 1;
}

v-scroll[data-dragging]::part(thumb) {
  background: var(--v-scroll-thumb-bg-active);
}
```

---

## 构建产物说明

包发布后的 `dist` 目录结构如下：

```text
dist/
├── v-scroll.js        # 组件主入口 (ES Module)
└── theme/
    └── v-scroll.js    # 主题模块
```

**注意**：
1. 样式文件 (`v-scroll.css`) 已被转换为 JS 模块 (`theme/v-scroll.js`)，**不包含独立的 .css 文件**。
2. 组件在加载时会自动执行 `import CSS from '$/v-scroll.js'` 并注入到文档中。

---

## 开发与构建

```bash
# 安装依赖
bun install

# 开发模式
bun run dev

# 构建生产包
bun run build

# 本地预览构建效果
bun run preview
```

---

## API 参考

### 属性

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `theme` | String | (预留) 主题标识 |
| `disabled` | Boolean | 禁用滚动 |

### 方法

| 方法名 | 参数 | 说明 |
|--------|------|------|
| `scrollTo` | `options` (Number or Object) | 滚动到指定位置，用法同 `Element.scrollTo` |
| `refresh` | - | 手动刷新滚动条尺寸计算 |

### CSS Parts

| Part 名称 | 说明 |
|-----------|------|
| `scroll` | 内部滚动容器 (`overflow: auto`) |
| `bar` | 滚动条轨道容器 |
| `thumb` | 滚动条滑块 |

## License

MIT
```