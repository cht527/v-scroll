
  /**
   * v-scroll 组件
   */
  import CSS from '$/v-scroll.js';
  import scrollSvgRaw from './assets/scroll.svg?raw';
  import grabSvgRaw from './assets/grab.svg?raw';
  // 工具函数
  function svgToDataUri(svgString) {
    const cleanedSvg = svgString.replace(/\n/g, '').replace(/\s+/g, ' ').trim();
    return `data:image/svg+xml,${encodeURIComponent(cleanedSvg)}`;
  }
  class VScroll extends HTMLElement {
    static observedAttributes = ['theme', 'disabled'];
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._initialized = false;
      this._isDragging = false;
      this._startY = 0;
      this._startScrollTop = 0;
      this._thumbHeight = 0;
      this._trackHeight = 0;
      this._scrollRatio = 1;
      this._trackMargin = 3;
      this._view = null;
      this._scrollbar = null;
      this._thumb = null;
      this._resizeObserver = null;
      this._scrollTimer = null;
      this._handleScroll = this._handleScroll.bind(this);
      this._handleResize = this._handleResize.bind(this);
      this._handlePointerDown = this._handlePointerDown.bind(this);
      this._handlePointerMove = this._handlePointerMove.bind(this);
      this._handlePointerUp = this._handlePointerUp.bind(this);
      this._handleTrackEnter = this._handleTrackEnter.bind(this);
      this._handleTrackLeave = this._handleTrackLeave.bind(this);
    }
    connectedCallback() {
      if (this._initialized) return;
      this._initialized = true;
      this._createStructure();
      this._injectStyles();
      this._initObservers();
      this._initEventListeners();
      requestAnimationFrame(() => this._updateScrollbar());
    }
    disconnectedCallback() {
      this._destroy();
    }
    _createStructure() {
      this._view = document.createElement('div');
      this._view.setAttribute('part', 'scroll');
      const contentWrapper = document.createElement('div');
      contentWrapper.style.display = 'block';
      const slot = document.createElement('slot');
      contentWrapper.appendChild(slot);
      this._scrollbar = document.createElement('div');
      this._scrollbar.setAttribute('part', 'bar');
      this._thumb = document.createElement('div');
      this._thumb.setAttribute('part', 'thumb');
      this._thumb.setAttribute('role', 'slider');
      this._thumb.setAttribute('tabindex', '0');
      this._scrollbar.appendChild(this._thumb);
      this._view.appendChild(contentWrapper);
      this._view.appendChild(this._scrollbar);
      this.shadowRoot.appendChild(this._view);
    }
    _injectStyles() {
      const style = document.createElement('style');
      style.textContent = CSS;
      this.shadowRoot.appendChild(style);
      // 关键样式回退 (收缩 right:2px, 展开 right:0)
      const criticalStyles = document.createElement('style');
      criticalStyles.textContent = `
        :host { display: block; position: relative; height: 100%; width: 100%; }
        [part="scroll"] { height: 100%; overflow: auto; scrollbar-width: none; }
        [part="scroll"]::-webkit-scrollbar { display: none; }
        /* 轨道默认 right: 2px */
        [part="bar"] { 
          position: absolute; right: 2px; top: 0; bottom: 0; 
          width: 4px; background: transparent; 
          pointer-events: none; border-radius: 0;
          box-sizing: border-box;
          border-left: 1px solid transparent;
          transition: width 0.2s ease-out, background 0.2s ease-out, border-color 0.2s ease-out, right 0.2s ease-out;
        }
        :host([data-scrolling]) [part="bar"] { pointer-events: auto; }
        /* 滑块 */
        [part="thumb"] { 
          position: absolute; right: 0; 
          width: 4px; 
          background: rgba(0,0,0,0.35); 
          border-radius: 3px; 
          min-height: 20px; 
          opacity: 0;
          transition: opacity 0.25s ease, background 0.2s ease, right 0.2s ease-out;
        }
        /* 滚动状态 */
        :host([data-scrolling]) [part="thumb"] { opacity: 1; }
        /* 悬停/拖拽状态：right: 0 紧贴右侧 */
        :host([data-hovering-thumb]) [part="bar"] { 
          right: 0; width: 14px; background: rgba(0,0,0,0.05); pointer-events: auto; 
          border-left-color: rgba(0,0,0,0.1); 
        }
        :host([data-hovering-thumb]) [part="thumb"] { opacity: 1; right: 5px; background: rgba(0,0,0,0.15); }
        :host([data-dragging]) [part="bar"] { 
          right: 0; width: 14px; background: rgba(0,0,0,0.05); pointer-events: auto; 
          border-left-color: rgba(0,0,0,0.1); 
        }
        :host([data-dragging]) [part="thumb"] { opacity: 1; right: 5px; background: rgba(0,0,0,0.6); }
      `;
      this.shadowRoot.appendChild(criticalStyles);
      // 光标样式
      const scrollCursor = svgToDataUri(scrollSvgRaw);
      const grabCursor = svgToDataUri(grabSvgRaw);
      const cursorStyle = document.createElement('style');
      cursorStyle.textContent = `
        [part="thumb"] { cursor: url('${scrollCursor}') 12 12, pointer; }
        [part="thumb"][data-dragging="true"] { cursor: url('${grabCursor}') 12 12, grabbing !important; }
        :host([data-dragging="true"]) { cursor: url('${grabCursor}') 12 12, grabbing !important; }
      `;
      this.shadowRoot.appendChild(cursorStyle);
    }
    _initObservers() {
      this._resizeObserver = new ResizeObserver(this._handleResize);
      this._resizeObserver.observe(this._view);
      const slot = this.shadowRoot.querySelector('slot');
      slot.addEventListener('slotchange', () => this._updateScrollbar());
    }
    _initEventListeners() {
      this._view.addEventListener('scroll', this._handleScroll, { passive: true });
      this._thumb.addEventListener('pointerdown', this._handlePointerDown);
      this._scrollbar.addEventListener('click', (e) => this._handleTrackClick(e));
      this._thumb.addEventListener('keydown', (e) => this._handleKeyDown(e));
      this._scrollbar.addEventListener('pointerenter', this._handleTrackEnter);
      this._scrollbar.addEventListener('pointerleave', this._handleTrackLeave);
    }
    // --- 交互逻辑 ---
    _handleResize() { this._updateScrollbar(); }
    _handleScroll() {
      if (this._isDragging) return;
      this._updateThumbPosition(this._view.scrollTop);
      this.setAttribute('data-scrolling', '');
      if (this._scrollTimer) clearTimeout(this._scrollTimer);
      this._scrollTimer = setTimeout(() => {
        this.removeAttribute('data-scrolling');
      }, 1500);
    }
    _handleTrackEnter() { this.setAttribute('data-hovering-thumb', ''); }
    _handleTrackLeave() { this.removeAttribute('data-hovering-thumb'); }
    // --- 尺寸计算 ---
    _updateScrollbar() {
      if (!this._view) return;
      const containerHeight = this._view.clientHeight;
      const contentHeight = this._view.scrollHeight;
      const scrollTop = this._view.scrollTop;
      const isScrollable = contentHeight > containerHeight;
      this.setAttribute('data-scrollable', isScrollable);
      if (isScrollable) {
        this._trackHeight = containerHeight - (this._trackMargin * 2);
        const thumbRatio = containerHeight / contentHeight;
        let thumbHeight = this._trackHeight * thumbRatio;
        thumbHeight = Math.max(thumbHeight, 16);
        const maxScrollTop = contentHeight - containerHeight;
        const maxThumbTop = this._trackHeight - thumbHeight;
        this._scrollRatio = maxScrollTop > 0 ? maxThumbTop / maxScrollTop : 0;
        this._thumb.style.height = `${thumbHeight}px`;
        this._thumbHeight = thumbHeight;
        this._updateThumbPosition(scrollTop);
      }
    }
    _updateThumbPosition(scrollTop) {
      const thumbTop = this._trackMargin + (scrollTop * this._scrollRatio);
      this._thumb.style.top = `${thumbTop}px`;
    }
    // --- 拖拽逻辑 ---
    _handlePointerDown(e) {
      e.preventDefault();
      this._isDragging = true;
      this._startY = e.clientY;
      this._startScrollTop = this._view.scrollTop;
      this._thumb.setAttribute('data-dragging', 'true');
      this.setAttribute('data-dragging', 'true');
      this._scrollbar.removeEventListener('pointerleave', this._handleTrackLeave);
      this._thumb.setPointerCapture(e.pointerId);
      document.addEventListener('pointermove', this._handlePointerMove, { passive: false });
      document.addEventListener('pointerup', this._handlePointerUp);
      document.body.style.userSelect = 'none';
    }
    _handlePointerMove(e) {
      if (!this._isDragging) return;
      e.preventDefault();
      const deltaY = e.clientY - this._startY;
      const maxScrollTop = this._view.scrollHeight - this._view.clientHeight;
      let newScrollTop = this._startScrollTop + (deltaY / this._scrollRatio);
      newScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop));
      this._view.scrollTop = newScrollTop;
      this._updateThumbPosition(newScrollTop);
    }
    _handlePointerUp(e) {
      if (!this._isDragging) return;
      this._isDragging = false;
      this._thumb.setAttribute('data-dragging', 'false');
      this.removeAttribute('data-dragging');
      this.setAttribute('data-scrolling', '');
      if (this._scrollTimer) clearTimeout(this._scrollTimer);
      this._scrollTimer = setTimeout(() => {
        this.removeAttribute('data-scrolling');
      }, 1500);
      try { this._thumb.releasePointerCapture(e.pointerId); } catch {}
      document.removeEventListener('pointermove', this._handlePointerMove);
      document.removeEventListener('pointerup', this._handlePointerUp);
      document.body.style.userSelect = '';
      this._scrollbar.addEventListener('pointerleave', this._handleTrackLeave);
    }
    _handleTrackClick(e) {
      if (e.target === this._thumb) return;
      const rect = this._scrollbar.getBoundingClientRect();
      const clickY = e.clientY - rect.top - this._trackMargin;
      const targetScrollTop = (clickY - this._thumbHeight / 2) / this._scrollRatio;
      this._view.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
    }
    _handleKeyDown(e) {
      const step = 50;
      let newTop = this._view.scrollTop;
      if (e.key === 'ArrowDown') newTop += step;
      else if (e.key === 'ArrowUp') newTop -= step;
      else if (e.key === 'PageDown') newTop += this._view.clientHeight;
      else if (e.key === 'PageUp') newTop -= this._view.clientHeight;
      else return;
      e.preventDefault();
      this._view.scrollTop = newTop;
    }
    scrollTo(options) { this._view.scrollTo(typeof options === 'number' ? { top: options } : options); }
    refresh() { this._updateScrollbar(); }
    _destroy() {
      if (this._scrollTimer) clearTimeout(this._scrollTimer);
      if (this._resizeObserver) this._resizeObserver.disconnect();
      document.removeEventListener('pointermove', this._handlePointerMove);
      document.removeEventListener('pointerup', this._handlePointerUp);
      this._scrollTimer = null;
      this._resizeObserver = null;
      this._initialized = false;
    }
  }
  if (!customElements.get('v-scroll')) { customElements.define('v-scroll', VScroll); }
  export default VScroll;


 

