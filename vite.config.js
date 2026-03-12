import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { transform } from "lightningcss";
import { resolve } from "path";

/**
 * Vite 插件：基于原始 CSS 的模块化构建
 *
 * - 使用 configResolved 钩子拿到 root / outDir
 * - 读取 src/v-scroll.css 源码
 * - 使用 lightningcss 去除注释与空白进行压缩
 * - 将结果包装为 JS 模块：export default '...';
 * - 在构建结束后写入到 dist/theme/v-scroll.js
 */
function vScrollCSSPlugin() {
	const virtualModuleId = "virtual:v-scroll-css";
	const resolvedVirtualModuleId = "\0" + virtualModuleId;
	let cssSourcePath = "";
	let outputDir = "dist";
	let isBuild = false;

	return {
		name: "v-scroll-css-plugin",
		configResolved(config) {
			cssSourcePath = resolve(config.root, "src/v-scroll.css");
			outputDir = resolve(config.root, config.build.outDir || "dist");
			isBuild = config.command === "build";
		},
		// dev 模式下：提供虚拟模块来响应 import "$/v-scroll.js"
		resolveId(id) {
			if (!isBuild && (id === "$/v-scroll.js" || id === virtualModuleId)) {
				return resolvedVirtualModuleId;
			}
		},
		load(id) {
			if (!isBuild && id === resolvedVirtualModuleId) {
				try {
					const rawCss = readFileSync(cssSourcePath, "utf-8");
					const { code } = transform({
						filename: cssSourcePath,
						code: Buffer.from(rawCss),
						minify: true,
					});
					const minified = code.toString().replace(/`/g, "\\`");
					return `export default \`${minified}\`;`;
				} catch (e) {
					console.error("[v-scroll-plugin] 读取 CSS 失败:", e);
					return 'export default "";';
				}
			}
		},
		// build 结束后：生成真正的主题模块文件，供第三方通过 Import Map 使用
		writeBundle() {
			try {
				const rawCss = readFileSync(cssSourcePath, "utf-8");
				const { code } = transform({
					filename: cssSourcePath,
					code: Buffer.from(rawCss),
					minify: true,
				});
				const minified = code.toString().replace(/`/g, "\\`");

				const themeDir = resolve(outputDir, "theme");
				if (!existsSync(themeDir)) {
					mkdirSync(themeDir, { recursive: true });
				}

				const jsModule = `/* Auto-generated from v-scroll.css */\nexport default \`${minified}\`;`;
				writeFileSync(resolve(themeDir, "v-scroll.js"), jsModule);
				console.log("[v-scroll-plugin] 主题文件已生成: dist/theme/v-scroll.js");
			} catch (e) {
				console.error("[v-scroll-plugin] 生成主题文件失败:", e);
			}
		},
	};
}

export default {
	plugins: [vScrollCSSPlugin()],
	build: {
		lib: {
			entry: resolve(__dirname, "src/main.js"),
			name: "VScroll",
			formats: ["es"],
			fileName: "v-scroll",
		},
		rollupOptions: {
			// 保留 "$/v-scroll.js" 为外部依赖，方便第三方通过 Import Map 切换主题实现
			external: (id) => id === "$/v-scroll.js" || id.startsWith("$/"),
		},
	},
};
