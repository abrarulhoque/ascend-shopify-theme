if(!customElements.get('image-hotspots')) {
    customElements.define('image-hotspots', class ImageHotspots extends HTMLElement {
        constructor() {
            super();

            this.addEventListener('click', (event)=>{
                if(event.target.classList.contains('spot')) {
                    this.onSpotClick(event.target);
                } else if(!webvista.isMobileScreen()) {
                    this.closeAllActive();
                }
            });

            // 取消产品卡片的 click 冒泡
            this.querySelectorAll('.spot-product').forEach((productCard)=>{
                productCard.addEventListener('click', event => event.stopPropagation());
            });

            // 监听 Esc 按键关闭
            this.addEventListener('keydown', (event)=> {
                if(event.code && event.code.toUpperCase() === 'ESCAPE') {
                    this.closeAllActive();
                }
            });
        }

        /**
         * 处理 spot 点击
         * @param spot
         */
        onSpotClick(spot) {
            this.activeSpot = spot; // 获取当前活跃spot
            this.closeAllActive();

            const hasOpen = spot.getAttribute('aria-expanded') === 'true';
            if(!hasOpen) {
                spot.setAttribute('aria-expanded', 'true');
                const productCard = document.getElementById(spot.getAttribute('data-target'));
                if(!productCard) return;

                productCard.removeAttribute('aria-hidden');
                webvista.trapFocus(productCard);
            }
        }

        /**
         * 关闭所有激活的
         */
        closeAllActive() {
            this.querySelectorAll('.spot[aria-expanded=true]').forEach(spot=>{
                spot.setAttribute('aria-expanded', 'false');
                document.getElementById(spot.getAttribute('data-target'))?.setAttribute('aria-hidden', 'true');
            });

            // 焦点已到活跃spot上
            if(this.activeSpot) webvista.removeTrapFocus(this.activeSpot);
        }
    });
}