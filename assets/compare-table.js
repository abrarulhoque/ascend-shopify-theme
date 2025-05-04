/**
 * 用于产品对比表格
 * 监听 swatch 点击用于切换显示变体图片
 */
if(!customElements.get('compare-table')) {
    customElements.define('compare-table', class  CompareTable extends HTMLElement {
        constructor() {
            super();

            // 如果产品有多个 swatch 属性
            // 通过data-swatch-synergy属性可以限制只监听第一个 swatch 属性
            this.querySelectorAll('[data-swatch-synergy] .color-swatches').forEach(swatches=>{
                swatches.addEventListener('click', this.onSwatchesClick.bind(this));
            });
        }

        onSwatchesClick(event) {
            event.stopPropagation();

            const swatch = event.target.closest('.color-swatch');
            if(!swatch) return;

            const index = swatch.getAttribute('data-index');
            const column = swatch.closest('td').dataset.id;

            const currentSwatch = event.currentTarget.querySelector('.color-swatch.active');
            if(currentSwatch) this.toggleSwatch(currentSwatch, column, false);
            if(swatch !== currentSwatch) this.toggleSwatch(swatch, column);
        }

        /**
         * 切换 swatch 激活状态
         * @param swatch
         * @param column
         * @param active
         */
        toggleSwatch(swatch, column, active= true) {
            const variantImage = this.querySelector(`.product-variant-image[data-index='${column}-${swatch.dataset.index}']`);
            if(!variantImage) return;

            if(active) {
                swatch.classList.add('active');
                variantImage.classList.remove('hidden');
                variantImage.parentElement.classList.add('has-swatch-active');
            } else {
                swatch.classList.remove('active');
                variantImage.classList.add('hidden');
                variantImage.parentElement.classList.remove('has-swatch-active');
            }
        }
    });
}