if(!customElements.get('text-lens-zoom')) {
    customElements.define('text-lens-zoom', class StickyScrollAppear extends StickyScroll {
        handleScrollEffect() {
            super.handleScrollEffect();

            const opacityChangeRatio = 1 - this.changeRatio;
            const scaleChangeRatio = 1 + this.changeRatio * 5;

            this.style.setProperty('--opacity-change-ratio', opacityChangeRatio.toString());
            this.style.setProperty('--scale-change-ratio', scaleChangeRatio.toString());
        }
    });
}
