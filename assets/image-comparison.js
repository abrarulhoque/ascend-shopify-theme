if(!customElements.get('image-comparison')) {
    customElements.define('image-comparison', class ImageComparison extends HTMLElement {
        constructor() {
            super();
            this.PADDING = 16;
            this.KEY_STEP = 2; // 键盘移动比例
            this.lastWindowWidth = window.innerWidth;
            this.ifVertical = this.hasAttribute('data-vertical'); // 纵向对比

            this.observer = new IntersectionObserver((entries, observer) => {
                if(entries[0].isIntersecting) {
                     this.init();
                     observer.disconnect();
                }
            }, {
                rootMargin: '-150px 0px -150px 0px',
            });

            this.observer.observe(this);
        }

        disconnectedCallback() {
            if(this.observer) this.observer.disconnect();
        }

        init() {
            this.currentRatio = 50;

            this.getBasicMetrics();

            this.enableTransition(); // 启用动画过度
            this.updateRatio();

            this.dragButton = this.querySelector('button');
            if(this.dragButton) {
                this.dragButton.addEventListener('mousedown', this.onDragStart.bind(this), {passive: true});
                this.dragButton.addEventListener('touchstart', this.onDragStart.bind(this), {passive: true});

                this.addEventListener('mousemove', this.onDragMove.bind(this));
                this.addEventListener('mouseup', this.onDragEnd.bind(this), {passive: true});
                this.addEventListener('mouseleave', this.onDragEnd.bind(this), {passive: true});

                this.addEventListener('touchmove', this.onDragMove.bind(this));
                this.addEventListener('touchend', this.onDragEnd.bind(this), {passive: true});

                // 监听键盘按键
                this.addEventListener('keydown', (event)=> {
                    const key = event.code ? event.code.toUpperCase() : '';

                    if(this.ifVertical) {
                        // 监听上下按键
                        if (key === 'ARROWUP') {
                            event.preventDefault();
                            this.onKeyMove('up');
                        }

                        if (key === 'ARROWDOWN') {
                            event.preventDefault();
                            this.onKeyMove('down');
                        }
                    } else {
                        // 监听左右按键
                        if (key === 'ARROWLEFT') {
                            event.preventDefault();
                            this.onKeyMove('left');
                        }

                        if (key === 'ARROWRIGHT') {
                            event.preventDefault();
                            this.onKeyMove('right');
                        }
                    }
                });
            }

            // 添加屏幕尺寸变化监听
            if(window.Shopify.designMode || window.debug) {
                this.debounceWindowSizeChangeHandler = webvista.debounce(this.onWindowSizeChange.bind(this), 500);
                window.addEventListener('resize', this.debounceWindowSizeChangeHandler);
            }

            // 禁用动画过度，等待时间要与动画时间一致
            setTimeout(()=>{
                this.disableTransition();
            }, 500);
        }

        /**
         * 获取基础信息
         */
        getBasicMetrics () {
            this.rect = this.getBoundingClientRect(); // 容器尺寸，位置信息
            this.rectSize = this.ifVertical ? this.rect.height : this.rect.width; // 容器尺寸
            this.safeRatio = [100 * this.PADDING / this.rectSize, 100 - 100 * this.PADDING / this.rectSize]; // 安全移动比例，将移动限制在这个区间中
        }

        /**
         * 渲染比例
         */
        updateRatio() {
            this.currentRatio = this.limitRatio(this.currentRatio);
            this.style.setProperty('--change-ratio', `${this.currentRatio}%`);
        }

        onDragStart(event) {
            this.isDragging = true;

            this.rect = this.getBoundingClientRect(); // 每次开始拖动都要重新获取
            this.rectStart = this.ifVertical ? this.rect.top : this.rect.left; // 容器起始位置
            this.classList.add('button--is-dragging');
        }

        onDragMove(event) {
            if (!this.isDragging) return;
            event.preventDefault();

            let currentPos;
            if(event['touches']) {
                currentPos = this.ifVertical ? event['touches'][0].clientY : event['touches'][0].clientX;
            }else {
                currentPos = this.ifVertical ? event.clientY : event.clientX;
            }

            const positionToStart = currentPos - this.rectStart;
            this.currentRatio = 100 * positionToStart / this.rectSize;
            
            requestAnimationFrame(()=>{
                this.updateRatio();
            });
        }

        onDragEnd(event) {
            if (!this.isDragging) return;

            this.isDragging = false;
            this.classList.remove('button--is-dragging');
        }

        /**
         * 处理键盘移动
         * @param direction
         */
        onKeyMove(direction= 'right') {
            let dic = 1;
            if(direction === 'left' || direction === 'up') {
                dic = -1;
            }

            this.currentRatio = this.currentRatio + dic * this.KEY_STEP;

            requestAnimationFrame(()=>{
                this.updateRatio();
            });
        }

        /**
         * 处理屏幕尺寸变化
         */
        onWindowSizeChange() {
            const currentWidth = window.innerWidth;
            if(currentWidth !== this.lastWindowWidth) {
                this.getBasicMetrics();
                this.updateRatio();

                this.lastWindowWidth = currentWidth;
            }
        }

        /**
         * 限制安全移动区间
         * @param ratio
         * @returns {number}
         */
        limitRatio(ratio) {
            return Math.min(Math.max(ratio, this.safeRatio[0]), this.safeRatio[1]);
        }

        /**
         * 启用动画过度
         */
        enableTransition() {
            this.classList.add('enable-transition');
        }

        /**
         * 禁用动画过度
         */
        disableTransition() {
            this.classList.remove('enable-transition');
        }
    });
}