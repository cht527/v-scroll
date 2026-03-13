import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { transform } from 'lightningcss'

/**
 * Vite 插件：基于原始 CSS 的模块化构建
 *
 * - 使用 configResolved 钩子拿到 root / outDir
 * - 读取 src/v-scroll.css 源码
 * - 使用 lightningcss 去除注释与空白进行压缩
 * - 将结果包装为 JS 模块：export default '...';
 * - 在构建结束后写入到 dist/theme/v-scroll.js
 */
function vScrollCssPlugin() {
	const virtual_module_id = 'virtual:v-scroll-css'
	const resolved_virtual_module_id = `\0${virtual_module_id}`
	let css_source_path = ''
	let output_dir = 'dist'
	let is_build = false

	return {
		name: 'v-scroll-css-plugin',
		configResolved(config) {
			css_source_path = resolve(config.root, 'src/v-scroll.css')
			output_dir = resolve(config.root, config.build.outDir || 'dist')
			is_build = config.command === 'build'
		},
		// dev 模式下：提供虚拟模块来响应 import "$/v-scroll.js"
		resolveId(id) {
			if (!is_build && (id === '$/v-scroll.js' || id === virtual_module_id)) {
				return resolved_virtual_module_id
			}
		},
		load(id) {
			if (!is_build && id === resolved_virtual_module_id) {
				try {
					const raw_css = readFileSync(css_source_path, 'utf-8')
					const { code } = transform({
						filename: css_source_path,
						code: Buffer.from(raw_css),
						minify: true,
					})
					const minified = code.toString().replace(/`/g, '\\`')
					return `export default \`${minified}\`;`
				} catch (e) {
					console.error('[v-scroll-plugin] 读取 CSS 失败:', e)
					return 'export default "";'
				}
			}
		},
		// build 结束后：生成真正的主题模块文件，供第三方通过 Import Map 使用
		writeBundle() {
			try {
				const raw_css = readFileSync(css_source_path, 'utf-8')
				const { code } = transform({
					filename: css_source_path,
					code: Buffer.from(raw_css),
					minify: true,
				})
				const minified = code.toString().replace(/`/g, '\\`')

				const theme_dir = resolve(output_dir, 'theme')
				if (!existsSync(theme_dir)) {
					mkdirSync(theme_dir, { recursive: true })
				}

				const js_module = `/* Auto-generated from v-scroll.css */\nexport default \`${minified}\`;`
				writeFileSync(resolve(theme_dir, 'v-scroll.js'), js_module)
				console.log('[v-scroll-plugin] 主题文件已生成: dist/theme/v-scroll.js')
			} catch (e) {
				console.error('[v-scroll-plugin] 生成主题文件失败:', e)
			}
		},
	}
}

export default {
	plugins: [vScrollCssPlugin()],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/main.js'),
			name: 'VScroll',
			formats: ['es'],
			fileName: 'v-scroll',
		},
		rollupOptions: {
			// 保留 "$/v-scroll.js" 为外部依赖，方便第三方通过 Import Map 切换主题实现
			external: id => id === '$/v-scroll.js' || id.startsWith('$/'),
		},
	},
}
