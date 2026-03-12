# v-scroll

原生 Web Components（ESM）实现的 `<v-scroll>` 自定义滚动条组件。

## 使用

安装并在业务中引入组件（注册 `customElements.define('v-scroll', ...)`）：

```js
import 'v-scroll'
```

然后在页面中直接使用任意 DOM 内容：

```html
<v-scroll style="height:240px">
  <div>...任意内容...</div>
</v-scroll>
```

## 主题（Import Map）

组件内部会执行：

```js
import themeCss from '$/v-scroll.js'
```

你可以在页面配置 importmap，把 `$/` 映射到不同主题路径（即可切换主题）：

```html
<script type="importmap">
  {
    "imports": {
      "$/": "/themes/default/"
    }
  }
</script>
```

默认主题源码在 `src/themes/default/v-scroll.css`，开发/构建时会由 Vite 插件自动生成：

- `public/themes/default/v-scroll.js`（内容是 `export default "....css..."`）

## 外观定制（结构隔离 + ::part）

组件外观通过 `::part` 暴露，可在外部 CSS 覆写：

- `v-scroll::part(track)`
- `v-scroll::part(thumb)`

并支持变量穿透（hover / dragging 状态）：

- `--v-scroll-thumb-bg`
- `--v-scroll-thumb-bg-hover`
- `--v-scroll-thumb-bg-drag`
- `--v-scroll-thumb-min-height`
- `--v-scroll-track-padding`
