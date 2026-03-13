import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { transform } from 'lightningcss'

// --- 插件 1: 处理 CSS (你原有的插件) ---
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
// --- 插件 2: 自动处理 HTML 路径 (新增) ---
function htmlTransformPlugin() {
	return {
		name: 'html-transform-plugin',
		// 仅在构建结束后执行
		closeBundle() {
			// 读取根目录的 index.html
			const html_path = resolve('index.html')
			if (!existsSync(html_path)) {
				console.error('[html-transform] index.html 不存在')
				return
			}
			let html = readFileSync(html_path, 'utf-8')
			// 自动替换路径逻辑：
			// 1. 将源码入口改为构建产物入口
			html = html.replace('./src/main.js', './v-scroll.js')
			// 2. 修正 Import Map 路径 (因为 dist 是根目录，所以要去掉 dist 前缀)
			html = html.replace('./dist/theme/', './theme/')
			// 写入 dist 目录
			const out_path = resolve('dist', 'index.html')
			writeFileSync(out_path, html)
			console.log('[html-transform] index.html 已处理并输出到 dist/')
		},
	}
}
export default {
	plugins: [vScrollCssPlugin(), htmlTransformPlugin()],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/main.js'),
			name: 'VScroll',
			formats: ['es'],
			fileName: 'v-scroll',
		},
		rollupOptions: {
			external: id => id === '$/v-scroll.js' || id.startsWith('$/'),
		},
	},
}
