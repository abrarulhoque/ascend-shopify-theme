if(!customElements.get('tool-bar')) {
    customElements.define('tool-bar', class ToolBar extends HTMLElement {
        constructor() {
            super();

            this.VISIBILITY_DURATION = 3000; // 显示状态持续时间

            this.ifShow = false; // 是否已经显示
            this.ifHoveringIn = false; // 是否鼠标正在该元素上悬停
            this.ifToTopShow = false; // toTop 是否显示

            this.toTop = this.querySelector('.to-top');

            this.toTop.addEventListener('click', this.scrollToTop.bind(this));
            window.addEventListener('scroll', this.onScroll.bind(this));

            this.addEventListener('mouseenter', this.onMouseEnter.bind(this));
            this.addEventListener('mouseleave', this.onMouseLeave.bind(this));
            this.show();
        }

        show() {
            if(!this.ifShow) this.classList.remove('tool-bar--collapse');

            this.ifShow = true;
            if(this.timer) clearTimeout(this.timer);
            if(this.ifHoveringIn) return; // 如果鼠标正在悬停

            this.timer = setTimeout(this.hide.bind(this), this.VISIBILITY_DURATION);
        }

        hide() {
            if(this.ifShow) this.classList.add('tool-bar--collapse');
            this.ifShow = false;
        }

        onScroll() {
            this.show();
            this.calculateScrollRatio();
        }

        onMouseEnter() {
            this.ifHoveringIn = true;
            this.show();
        }

        onMouseLeave() {
            this.ifHoveringIn = false;
            this.timer = setTimeout(this.hide.bind(this), 1000);
        }

        // 计算页面滚动的比率
        calculateScrollRatio() {
            // 获取页面的滚动高度
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

            // 获取视窗高度
            const windowHeight = window.innerHeight;

            // 获取整个文档的总高度
            const docHeight = Math.max(
                document.body.scrollHeight, document.documentElement.scrollHeight,
                document.body.offsetHeight, document.documentElement.offsetHeight,
                document.body.clientHeight, document.documentElement.clientHeight
            );

            // 计算整个文档的可滚动高度（总高度减去一个视窗高度）
            const scrollableHeight = docHeight - windowHeight;

            // 计算滚动比率
            const scrollPercentage = Math.min(1, scrollTop / scrollableHeight);
            if(scrollPercentage > 0.1) {
                if(!this.ifToTopShow) this.classList.add('to-top-active');
                this.ifToTopShow = true;
            }else {
                if(this.ifToTopShow) this.classList.remove('to-top-active');
                this.ifToTopShow = false;
            }

            this.toTop.querySelector('.border-progress path')?.setAttribute('stroke-dashoffset', 1 - scrollPercentage)
        }

        scrollToTop(event) {
            event.preventDefault();

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    });
}