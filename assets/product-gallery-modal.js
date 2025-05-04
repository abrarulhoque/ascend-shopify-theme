if (!customElements.get('product-gallery-modal')) {
  customElements.define('product-gallery-modal', class ProductGalleryModal extends ModalDialog {
      constructor() {
          super();

          this.slider = this.querySelector('slider-component');
          this.tip = this.querySelector('.modal-tip');
      }

      show(opener) {
        super.show(opener);
        setTimeout(()=>this.showActiveMedia(), 50);

        // 显示操作提示
        if(this.timer) clearTimeout(this.timer);
        this.tip.classList.add('active');
        this.timer = setTimeout(()=>{
          this.tip.classList.remove('active');
        }, 5000);
      }

      showActiveMedia() {
        const mediaId = this.openedBy.getAttribute('data-media-id');
        if(!mediaId) return;

        if(this.slider && this.slider.initSliderStatus) {
            const currentSlideElement = this.slider.querySelector(`.slider-slide[data-media-id='${mediaId}']`);
            if(!currentSlideElement) return;

            this.slider.slideByElement(currentSlideElement);

            const deferredMedia = currentSlideElement.querySelector('.deferred-media');
            if(deferredMedia) {
                const deferredMedia = currentSlideElement.querySelector('.deferred-media');
                deferredMedia.loadContent();
            }
        }
      }
    }
  )
}
