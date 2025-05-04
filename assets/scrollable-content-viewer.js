/**
 * ScrollableContentViewer 类
 *
 * 这个自定义的HTMLElement类用于创建一个可滚动的内容查看器。它允许用户通过拖拽和导航按钮（前进和后退）来查看那些超出可视区域的内容。
 * 主要用于处理那些内容宽度超出其父容器宽度的场景，提供了一种直观且用户友好的方式来查看额外的内容。
 *
 * 特点：
 * 1. 自动初始化：当div中的内容超出可视区域时，会自动初始化这个组件。
 * 2. 可拖拽查看：用户可以通过拖拽来查看隐藏的内容区域。
 * 3. 前进和后退按钮：通过这些按钮可以轻松地在内容中前进或后退。
 * 4. 平滑滚动和过渡效果：提供平滑的滚动体验，增强用户交互感。
 * 5. 动态内容适应：能够灵活地适应动态变化的内容宽度。
 *
 * 使用场景：
 * - 适用于需要展示宽幅内容（如图像、表格、文本）的区域，特别是当这些内容不能在一屏内完全展示时。
 * - 可用于报表、图库、文章阅读等多种场景，增强内容展示和用户体验。
 */
if(!customElements.get('scrollable-content-viewer')) {
    customElements.define('scrollable-content-viewer', class ScrollableContentViewer extends HTMLElement {
        constructor() {
            super();
            this.initScrollableStatus = false; // 组件安装状态

            this.DRAG_THRESHOLD = 100;
            this.TRANSITION_DURING = 300;

            this.currentTranslate = 0;
            this.isClicking = false;
            this.isDragging = false; // 是否有拖动
            this.lastWindowWidth = window.innerWidth;

            this.scrollableWrapper = this.querySelector('.scrollable-content-wrapper');
            if (!this.scrollableWrapper) return;

            // 前后切换按钮
            this.prevButton = this.querySelector('button[name="previous"]');
            this.nextButton = this.querySelector('button[name="next"]');

            this.install();

            // 添加屏幕尺寸变化监听
            if(window.Shopify.designMode || window.debug) {
                this.debounceWindowSizeChangeHandler = webvista.debounce(this.onWindowSizeChange.bind(this), 500);
                window.addEventListener('resize', this.debounceWindowSizeChangeHandler);
            }
        }

        disconnectedCallback() {
           //移除屏幕尺寸变化监听
           if(this.debounceWindowSizeChangeHandler) window.removeEventListener('resize', this.debounceWindowSizeChangeHandler);
        }

        // 安装组件
        install() {
            if(this.initScrollableStatus) return;

            this.updateScrollableMetrics(); // 获取基础数据
            this.updateInfo();
            if(this.maxTranslateValue <= 0) return; // 不需要组件功能

            const onNavButtonClickFunction = webvista.debounce(this.onNavButtonClick.bind(this), 200);
            this.boundOnNavButtonClick = (event) => {
                event.preventDefault();

                const direction = event.currentTarget.name;
                onNavButtonClickFunction(direction);
            };

            if(this.prevButton) this.prevButton.addEventListener('click', this.boundOnNavButtonClick);
            if(this.nextButton) this.nextButton.addEventListener('click', this.boundOnNavButtonClick);

            // 绑定拖拽
            if(this.hasAttribute('data-draggable')) {
                this.boundDragStart = this.onDragStart.bind(this);
                this.boundDragMove = this.onDragMove.bind(this);
                this.boundDragEnd = this.onDragEnd.bind(this);

                // PC 端
                this.addEventListener('mousedown', this.boundDragStart, {passive: true});
                // 手机端
                this.addEventListener('touchstart', this.boundDragStart, {passive: true});
            }

            this.enableTransition();
            this.toggleStatus(true);
        }

        // 重新安装
        reInstall() {
            if(this.initScrollableStatus) this.uninstall();
            this.install();
        }

        // 卸载组件
        uninstall() {
            this.clearTranslation(); // 清除位移之前的位移变换

            // 移除导航按钮的事件监听器
            if (this.prevButton) {
                this.prevButton.removeEventListener('click', this.boundOnNavButtonClick);
            }
            if (this.nextButton) {
                this.nextButton.removeEventListener('click', this.boundOnNavButtonClick);
            }

            // 移除拖拽相关的事件监听器，防止重复定义
            if (this.hasAttribute('data-draggable')) {
                if(this.boundDragStart) {
                    this.removeEventListener('mousedown', this.boundDragStart);
                    this.removeEventListener('touchstart', this.boundDragStart);
                }
                if(this.boundDragMove) {
                    this.removeEventListener('mousemove', this.boundDragMove);
                    this.removeEventListener('touchmove', this.boundDragMove);
                }

                if(this.boundDragEnd) {
                    this.removeEventListener('mouseup', this.boundDragEnd);
                    this.removeEventListener('touchend', this.boundDragEnd);
                }
            }

            // 取消任何未完成的 requestAnimationFrame 调用
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }

            this.toggleStatus(false);
        }

        /**
         * 获取基础定位数据
         */
        updateScrollableMetrics() {
            const wrapperRect = this.scrollableWrapper.getBoundingClientRect();

            const firstChildRect = this.scrollableWrapper.firstElementChild.getBoundingClientRect(); // 第一个子元素
            const lastChildRect = this.scrollableWrapper.lastElementChild.getBoundingClientRect(); // 最后一个子元素

            this.scrollableClientSize = wrapperRect.width; // 滚动容器宽度
            this.scrollableTotalSize = lastChildRect.right - firstChildRect.left; // 内容总宽度
            this.maxTranslateValue = this.scrollableTotalSize - this.scrollableClientSize; // 可滚动距离
        }

        /**
         * 轮播安装状态切换
         * @param status
         */
        toggleStatus(status = false) {
            this.initScrollableStatus = status;
            this.classList.toggle('scrollable--installed', status);
        }

        /**
         * 导航按钮点击处理函数
         * @param direction
         */
        onNavButtonClick(direction = "next") {
            this.slideContentByScreen(direction);
        }

        /**
         * 处理屏幕尺寸变化
         */
        onWindowSizeChange() {
            const currentWidth = window.innerWidth;
            if(currentWidth !== this.lastWindowWidth) {
                this.reInstall();

                this.lastWindowWidth = currentWidth;
            }
        }

        /**
         * 滑动一个屏幕
         * @param direction
         */
        slideContentByScreen(direction = 'next') {
            if(!this.initScrollableStatus) return;

            if(direction === 'next') {
                this.currentTranslate = webvista.ceilToMultiple(this.currentTranslate + 5, this.scrollableClientSize);
            } else {
                this.currentTranslate = webvista.floorToMultiple(this.currentTranslate - 5, this.scrollableClientSize);
            }
            
            this.enableTransition();
            this.applyTranslation();

            this.updateInfo();
        }

        /**
         * 滚动到指定子元素位置
         */
        slideContentByItem(itemElement) {
            if(!itemElement || !this.initScrollableStatus || itemElement.parentElement !== this.scrollableWrapper) return;

            const itemRect = itemElement.getBoundingClientRect();
            const firstElementRect = this.scrollableWrapper.firstElementChild.getBoundingClientRect();

            this.currentTranslate = itemRect.left - firstElementRect.left - firstElementRect.width / 2;

            this.enableTransition();
            this.applyTranslation();

            this.updateInfo();
        }

        /**
         * 应用位移变换
         * 可单独使用，但是不改变索引值
         */
        applyTranslation() {
            this.correctTranslate(); // 纠正 currentTranslate 的值

            this.scrollableWrapper.style.transform = `translateX(${-this.currentTranslate}px)`;
        }

        /**
         * 纠正位移值
         *
         * 这个方法确保当前的位移值（this.currentTranslate）不会超出设定的边界。
         * 当拖拽时，会应用一个阈值（threshold）来允许一定程度的超出边界，从而实现弹性效果。
         * 如果位移超出了允许的边界，将会被重置到边界值。
         */
        correctTranslate() {
            // 拖拽启用阈值，有弹性效果
            let threshold = 0;
            if(this.isClicking) threshold = this.DRAG_THRESHOLD;
            const boundary = [-threshold, this.maxTranslateValue + threshold];

            if(this.currentTranslate > boundary[1]){
                this.currentTranslate = boundary[1];
                this.setAttribute('data-move-exceed', 'next');
            } else if(this.currentTranslate < boundary[0]){
                this.currentTranslate = boundary[0];
                this.setAttribute('data-move-exceed', 'pre');
            } else {
                this.removeAttribute('data-move-exceed');
            }
        }

        /**
         * 处理拖拽开始事件。
         * @param {MouseEvent|TouchEvent} event - 触发拖拽的事件对象。
         */
        onDragStart(event) {
            document.addEventListener('mousemove', this.boundDragMove);
            document.addEventListener('mouseup', this.boundDragEnd);

            document.addEventListener('touchmove', this.boundDragMove);
            document.addEventListener('touchend', this.boundDragEnd);

            this.isClicking = true;
            this.isDragging = false;

            if(event['touches']) {
                this.dragStartPos = event['touches'][0].clientX;
            }else {
                this.dragStartPos = event.clientX;
            }
            this.currentPos = this.dragStartPos;

            this.preTranslate = this.currentTranslate;
            this.disableTransition(); // 禁用过渡效果
        }

        /**
         * 处理拖拽移动事件。
         * @param {MouseEvent|TouchEvent} event - 触发移动的事件对象。
         */
        onDragMove(event) {
            if (!this.isClicking) return;

            if(event['touches']) {
                this.currentPos = event['touches'][0].clientX;
            }else {
                this.currentPos = event.clientX;
            }

            const dragOffset = this.dragStartPos - this.currentPos;
            
            if(Math.abs(dragOffset) > 1) {
                event.preventDefault();

                this.isDragging = true;
                this.classList.add('scrollable--is-dragging');

                // 取消之前的动画帧请求
                if (this.rafId) {
                    cancelAnimationFrame(this.rafId);
                }

                this.rafId = requestAnimationFrame(() => {
                    this.currentTranslate = this.preTranslate + dragOffset;
                    this.applyTranslation(); // 更新元素的位置
                });
            }
        }

        /**
         * 处理拖拽结束事件。
         * @param {MouseEvent|TouchEvent} event - 触发拖拽结束的事件对象。
         */
        onDragEnd(event) {
            document.removeEventListener('mousemove', this.boundDragMove);
            document.removeEventListener('mouseup', this.boundDragEnd);

            document.removeEventListener('touchmove', this.boundDragMove);
            document.removeEventListener('touchend', this.boundDragEnd);

            this.isClicking = false;
            // 没有移动
            if(!this.isDragging) return;

            event.stopPropagation();

            this.classList.remove('scrollable--is-dragging');

            // 取消正在执行的动画
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
            }

            this.slideContentByScreen(this.dragStartPos - this.currentPos > 0 ? 'next': 'previous');
        }

        /**
         * 更新组件信息
         */
        updateInfo() {
            if(this.prevButton) this.prevButton.toggleAttribute('disabled', this.currentTranslate <= 0);
            if(this.nextButton) this.nextButton.toggleAttribute('disabled', this.currentTranslate >= this.maxTranslateValue);
        }

        // 禁用过渡效果
        disableTransition() {
            this.scrollableWrapper.style.transition = '';
        }

        // 启用过渡效果
        enableTransition() {
            this.scrollableWrapper.style.transition = `transform ${this.TRANSITION_DURING}ms`;
        }

        /**
         * 清除位移变换
         */
        clearTranslation() {
            this.currentTranslate = 0;
            this.scrollableWrapper.style = '';
        }
    });
}