---
name: v-scroll Development Protocol
description: 严格的 v-scroll 组件开发规范与构建标准。
version: 1.0.0
---

# v-scroll Development Protocol

本项目遵循极简主义与现代 JavaScript 最佳实践。所有代码贡献必须严格遵守以下规范。

## 1. 环境与工作流

- **依赖管理**: 使用 Bun。
  ```bash
  bun i
  ```
- **构建验证**: 任何代码修改后必须执行构建脚本以确保无误。
  ```bash
  ./build.sh
  ```

## 2. JavaScript 编码规范

### 函数定义
- **强制使用箭头函数**。禁止使用 `function` 关键字。
- 函数命名使用 **小驼峰风格** (`camelCase`)。
  ```javascript
  // Correct
  const calculateRect = (w, h) => w * h;

  // Wrong
  function calculateRect(w, h) { return w * h; }
  ```

### 变量与声明
- **常量**: 必须全大写 (`UPPER_CASE`)。
- **变量**: 必须使用下划线风格 (`snake_case`)，命名要极简。
- **合并声明**: 连续的 `const` 声明必须合并。
  ```javascript
  // Correct
  const MAX_SIZE = 100,
        default_width = 20,
        getArea = (x) => x * x;

  // Wrong
  const MAX_SIZE = 100;
  const default_width = 20;
  ```

### 模块语法
- **导入**: 仅导入函数，避免直接导入模块对象。
  ```javascript
  // Correct
  import { readFileSync } from 'fs';

  // Wrong
  import fs from 'fs';
  ```
- **导出**: 直接导出默认函数或变量，除非需要在 `import.meta.main` 中调用，否则不要先声明再导出。
  ```javascript
  // Correct
  export default () => { ... };

  // Wrong
  const main = () => { ... };
  export default main;
  ```

### 异步处理
- **强制使用 `async/await`**。禁止使用 `.then()` 链式调用。

## 3. 架构设计

- **纯函数优先**: 逻辑必须封装为纯函数。
- **禁止类**: 除 Web Component 必要的类声明外，禁止使用 `class` 关键字构建逻辑。
- **代码复用**: 避免重复代码结构，将通用逻辑提取为独立的工具函数。

## 4. 样式规范

- 使用浏览器原生支持的 **CSS Nesting** (嵌套) 语法，减少代码冗余，禁止使用预处理器 (SCSS/Less)。
```