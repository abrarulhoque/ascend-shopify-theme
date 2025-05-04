if(!customElements.get('custom-confetti')) {
    customElements.define('custom-confetti', class CustomConfetti extends HTMLElement {
        constructor() {
            super();

            const triggerTiming = this.getAttribute('data-trigger-position') || 'center'; // 触发时机
            const effect = this.getAttribute('data-effect') || 'cannon'; // 效果
            const triggerOnce = this.hasAttribute('data-trigger-once');

            let rootMargin;
            if(triggerTiming === 'bottom') {
                rootMargin = '-90% 0px 0px 0px';
            } else if(triggerTiming === 'top') {
                rootMargin = '0px 0px -90% 0px';
            } else {
                rootMargin = '-45% 0px -45% 0px';
            }

            this.observer =  new IntersectionObserver((entries, observer)=>{
                if(entries[0].isIntersecting) {
                    this.triggerEffect(effect);
                    // 进入触发，只触发一次
                    if(triggerOnce) observer.disconnect();
                }
            }, {
                root: null,
                rootMargin: rootMargin,
                threshold: 0
            });

            this.observer.observe(this);
        }

        disconnectedCallback() {
            if(this.observer) this.observer.disconnect();
        }

        triggerEffect(effect='cannon') {
            if(effect === 'falling-ribbons') {
                webvista.confetti.fallingRibbons();
            } else if(effect === 'firework') {
                webvista.confetti.firework();
            } else if(effect === 'school-pride') {
                webvista.confetti.sideConfetti();
            } else {
                webvista.confetti.cannonConfetti();
            }
        }
    })
}