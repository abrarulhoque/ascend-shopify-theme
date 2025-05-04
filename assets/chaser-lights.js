/**
 * Chaser Light
 * 追逐灯，依次点亮的效果
 */

if(!customElements.get('chaser-lights')) {
    customElements.define('chaser-lights', class ChaserLights extends HTMLElement {
        constructor() {
            super();

            if(!this.hasAttribute('data-run')) return;

            this.lights = Array.from(this.querySelectorAll('.chaser-light'));
            if(this.lights.length < 1) return;

            if(this.hasAttribute('data-interval')) {
                this.loopInterval = Math.max(1, parseInt(this.getAttribute('data-interval'))); // 点亮间隔
            }else {
                this.loopInterval = 1;
            }

            this.observer = new IntersectionObserver((entries, observer)=>{
                entries.forEach(entry=>{
                    if(entry.isIntersecting) {
                        this.start();
                    }else {
                        this.stop();
                    }
                });
            });
            this.observer.observe(this);
        }

        disconnectedCallback() {
            if(this.observer) this.observer.disconnect();
        }

        /**
         * 开始追逐
         */
        start() {
            this.current = 0;
            this.timer = setInterval(()=>{
                if(this.current >= this.lights.length) {
                    this.stop(); // 关闭之前的循环
                    return this.loopTimer = setTimeout(this.start.bind(this), this.loopInterval * 1000); // 开启新的循环
                }

                this.lights.find(element=>element.classList.contains('active'))?.classList.remove('active');
                this.lights[this.current].classList.add('active');
                this.current++;
            }, this.loopInterval * 1000);
        }

        /**
         * 停止追逐
         */
        stop() {
            if(this.timer) clearInterval(this.timer);
            if(this.loopTimer) clearTimeout(this.loopTimer);
        }
    });
}