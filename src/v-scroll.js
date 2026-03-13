/**
 * v-scroll 组件
 */
import CSS from '$/v-scroll.js'
import GRAB_SVG_RAW from './assets/grab.svg?raw'
import SCROLL_SVG_RAW from './assets/scroll.svg?raw'

const STYLE_ID = 'v-scroll-global-style',
	THUMB_MIN_HEIGHT = 16,
	SCROLL_HIDE_DELAY = 1500,
	TRACK_MARGIN = 3
const svg_to_data_uri = svgString => {
	const cleaned_svg = svgString.replace(/\n/g, '').replace(/\s+/g, ' ').trim()
	return `data:image/svg+xml,${encodeURIComponent(cleaned_svg)}`
}
const inject_global_style = css => {
	if (typeof document !== 'undefined' && typeof css === 'string' && css.length > 0) {
		if (!document.getElementById(STYLE_ID)) {
			const style_el = document.createElement('style')
			style_el.id = STYLE_ID
			style_el.textContent = css
			document.head.appendChild(style_el)
		}
	}
}
inject_global_style(CSS)
export default class VScroll extends HTMLElement {
	static observedAttributes = ['theme', 'disabled']
	_initialized = false
	_is_dragging = false
	_start_y = 0
	_start_scroll_top = 0
	_thumb_height = 0
	_track_height = 0
	_scroll_ratio = 1
	_track_margin = TRACK_MARGIN
	_view = null
	_scrollbar = null
	_thumb = null
	_resize_observer = null
	_scroll_timer = null
	constructor() {
		super()
		this.attachShadow({ mode: 'open' })
	}
	connectedCallback() {
		if (this._initialized) {
			return
		}
		this._initialized = true
		this._createStructure()
		this._initObservers()
		this._initEventListeners()
		this._initCursors()
		requestAnimationFrame(() => this._updateScrollbar())
	}
	disconnectedCallback() {
		this._destroy()
	}
	_createStructure = () => {
		this._view = document.createElement('div')
		this._view.setAttribute('part', 'scroll')
		const content_wrapper = document.createElement('div')
		content_wrapper.style.display = 'block'
		const slot = document.createElement('slot')
		content_wrapper.appendChild(slot)
		this._scrollbar = document.createElement('div')
		this._scrollbar.setAttribute('part', 'bar')
		this._thumb = document.createElement('div')
		this._thumb.setAttribute('part', 'thumb')
		this._thumb.setAttribute('role', 'slider')
		this._thumb.setAttribute('tabindex', '0')
		this._scrollbar.appendChild(this._thumb)
		this._view.appendChild(content_wrapper)
		// 将滚动条轨道从滚动容器中分离，直接挂在 shadowRoot
		this.shadowRoot.appendChild(this._view)
		this.shadowRoot.appendChild(this._scrollbar)
	}
	_initCursors = () => {
		const default_cursor = `url('${svg_to_data_uri(SCROLL_SVG_RAW)}') 12 12, pointer`,
			dragging_cursor = `url('${svg_to_data_uri(GRAB_SVG_RAW)}') 12 12, grabbing`
		this.style.setProperty('--v-scroll-cursor-default', default_cursor)
		this.style.setProperty('--v-scroll-cursor-dragging', dragging_cursor)
	}
	_initObservers = () => {
		this._resize_observer = new ResizeObserver(this._handleResize)
		this._resize_observer.observe(this._view)
		const slot = this.shadowRoot.querySelector('slot')
		slot.addEventListener('slotchange', this._updateScrollbar)
	}
	_initEventListeners = () => {
		this._view.addEventListener('scroll', this._handleScroll, {
			passive: true,
		})
		this._thumb.addEventListener('pointerdown', this._handlePointerDown)
		this._scrollbar.addEventListener('click', this._handleTrackClick)
		this._thumb.addEventListener('keydown', this._handleKeyDown)
		this._scrollbar.addEventListener('pointerenter', this._handleTrackEnter)
		this._scrollbar.addEventListener('pointerleave', this._handleTrackLeave)
	}
	// --- 交互逻辑 ---
	_handleResize = () => this._updateScrollbar()
	_handleScroll = () => {
		if (this._is_dragging) {
			return
		}
		this._updateThumbPosition(this._view.scrollTop)
		this.setAttribute('data-scrolling', '')
		if (this._scroll_timer) {
			clearTimeout(this._scroll_timer)
		}
		this._scroll_timer = setTimeout(() => this.removeAttribute('data-scrolling'), SCROLL_HIDE_DELAY)
	}
	_handleTrackEnter = () => this.setAttribute('data-hovering-thumb', '')
	_handleTrackLeave = () => this.removeAttribute('data-hovering-thumb')
	// --- 尺寸计算 ---
	_updateScrollbar = () => {
		if (!this._view) {
			return
		}
		const {
				clientHeight: container_height,
				scrollHeight: content_height,
				scrollTop: scroll_top,
			} = this._view,
			is_scrollable = content_height > container_height
		this.setAttribute('data-scrollable', is_scrollable)
		if (is_scrollable) {
			this._track_height = container_height - this._track_margin * 2
			const thumb_ratio = container_height / content_height
			let thumb_height = this._track_height * thumb_ratio
			thumb_height = Math.max(thumb_height, THUMB_MIN_HEIGHT)
			const max_scroll_top = content_height - container_height,
				max_thumb_top = this._track_height - thumb_height
			this._scroll_ratio = max_scroll_top > 0 ? max_thumb_top / max_scroll_top : 0
			this._thumb.style.height = `${thumb_height}px`
			this._thumb_height = thumb_height
			this._updateThumbPosition(scroll_top)
		}
	}
	_updateThumbPosition = scrollTop => {
		const thumb_top = this._track_margin + scrollTop * this._scroll_ratio
		this._thumb.style.top = `${thumb_top}px`
	}
	// --- 拖拽逻辑 ---
	_handlePointerDown = e => {
		e.preventDefault()
		this._is_dragging = true
		this._start_y = e.clientY
		this._start_scroll_top = this._view.scrollTop
		this._thumb.setAttribute('data-dragging', 'true')
		this.setAttribute('data-dragging', 'true')
		this._scrollbar.removeEventListener('pointerleave', this._handleTrackLeave)
		this._thumb.setPointerCapture(e.pointerId)
		document.addEventListener('pointermove', this._handlePointerMove, {
			passive: false,
		})
		document.addEventListener('pointerup', this._handlePointerUp)
		const grab_cursor = this.style.getPropertyValue('--v-scroll-cursor-dragging')
		if (grab_cursor) {
			document.body.style.cursor = grab_cursor
		}
		document.body.style.userSelect = 'none'
	}
	_handlePointerMove = e => {
		if (!this._is_dragging) {
			return
		}
		e.preventDefault()
		const delta_y = e.clientY - this._start_y,
			max_scroll_top = this._view.scrollHeight - this._view.clientHeight
		let new_scroll_top = this._start_scroll_top + delta_y / this._scroll_ratio
		new_scroll_top = Math.max(0, Math.min(new_scroll_top, max_scroll_top))
		this._view.scrollTop = new_scroll_top
		this._updateThumbPosition(new_scroll_top)
	}
	_handlePointerUp = e => {
		if (!this._is_dragging) {
			return
		}
		this._is_dragging = false
		this._thumb.setAttribute('data-dragging', 'false')
		this.removeAttribute('data-dragging')
		this.setAttribute('data-scrolling', '')
		if (this._scroll_timer) {
			clearTimeout(this._scroll_timer)
		}
		this._scroll_timer = setTimeout(() => this.removeAttribute('data-scrolling'), SCROLL_HIDE_DELAY)
		try {
			this._thumb.releasePointerCapture(e.pointerId)
		} catch {}
		document.removeEventListener('pointermove', this._handlePointerMove)
		document.removeEventListener('pointerup', this._handlePointerUp)
		document.body.style.cursor = ''
		document.body.style.userSelect = ''
		this._scrollbar.addEventListener('pointerleave', this._handleTrackLeave)
	}
	_handleTrackClick = e => {
		if (e.target === this._thumb) {
			return
		}
		const rect = this._scrollbar.getBoundingClientRect(),
			click_y = e.clientY - rect.top - this._track_margin,
			target_scroll_top = (click_y - this._thumb_height / 2) / this._scroll_ratio
		this._view.scrollTo({
			top: Math.max(0, target_scroll_top),
			behavior: 'smooth',
		})
	}
	_handleKeyDown = e => {
		const step = 50
		let new_top = this._view.scrollTop
		if (e.key === 'ArrowDown') {
			new_top += step
		} else if (e.key === 'ArrowUp') {
			new_top -= step
		} else if (e.key === 'PageDown') {
			new_top += this._view.clientHeight
		} else if (e.key === 'PageUp') {
			new_top -= this._view.clientHeight
		} else {
			return
		}
		e.preventDefault()
		this._view.scrollTop = new_top
	}
	scrollTo = options =>
		this._view.scrollTo(typeof options === 'number' ? { top: options } : options)
	refresh = () => this._updateScrollbar()
	_destroy = () => {
		if (this._scroll_timer) {
			clearTimeout(this._scroll_timer)
		}
		this._scroll_timer = null
		if (this._resize_observer) {
			this._resize_observer.disconnect()
			this._resize_observer = null
		}
		if (this._view) {
			this._view.removeEventListener('scroll', this._handleScroll)
		}
		document.removeEventListener('pointermove', this._handlePointerMove)
		document.removeEventListener('pointerup', this._handlePointerUp)
		document.body.style.cursor = ''
		document.body.style.userSelect = ''
		this._initialized = false
	}
}
if (!customElements.get('v-scroll')) {
	customElements.define('v-scroll', VScroll)
}
