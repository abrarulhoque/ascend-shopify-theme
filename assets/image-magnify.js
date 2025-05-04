if(!customElements.get('image-magnify')) {
  customElements.define('image-magnify', class ImageMagnify extends HTMLElement {
    constructor() {
      super();

      this.image = this.querySelector('img');
      this.scale = parseFloat(this.getAttribute('data-scale')) || 1.5;
      this.boundHandleImageMove = this.handleImageMove.bind(this);
      this.enableMove = false;

      // 添加鼠标事件监听器
      this.addEventListener('mousedown', this.enableZoom.bind(this));
      this.addEventListener('mouseup', this.disableZoom.bind(this));
      this.addEventListener('mouseleave', this.disableZoom.bind(this));

      // 添加触摸事件监听器
      this.addEventListener('touchstart', this.enableZoom.bind(this));
      this.addEventListener('touchend', this.disableZoom.bind(this));
      this.addEventListener('touchcancel', this.disableZoom.bind(this));
    }

    enableZoom(event) {
      event.stopPropagation();
      event.preventDefault();

      this.classList.add('image-zoom-in');
      this.enableMove = true;
      this.image.style.transformOrigin = 'center';
      this.image.style.transition = 'transform 300ms ease';
      this.image.style.transform = `scale(${this.scale}) translate(0, 0)`;

      this.rect = this.getBoundingClientRect();
      this.centerPos = [
        (this.rect.right - this.rect.left) / 2 + this.rect.left,
        (this.rect.bottom - this.rect.top) / 2 + this.rect.top
      ];

      // 等待Scale动画完成后
      this.image.addEventListener('transitionend', ()=>{
        this.image.style.transition = '';

        this.imageRect = this.image.getBoundingClientRect();

        // 获取最大可移动的 X 距离
        this.maxTransX = this.imageRect.left < this.rect.left
          ? this.rect.left - this.imageRect.left
          : 0;

        // 获取最大可移动的 Y 距离
        this.maxTransY = this.imageRect.top < this.rect.top
          ? this.rect.top - this.imageRect.top
          : 0;

        // 添加移动事件监听器
        this.addEventListener('mousemove', this.boundHandleImageMove);
        this.addEventListener('touchmove', this.boundHandleImageMove);
      }, { once: true });
    }

    disableZoom() {
      this.enableMove = false;
      this.classList.remove('image-zoom-in');

      // 恢复原样
      this.image.style.transition = 'transform 300ms ease';
      this.image.style.transform = 'scale(1) translate(0, 0)';

      // 移除移动事件监听器
      this.removeEventListener('mousemove', this.boundHandleImageMove);
      this.removeEventListener('touchmove', this.boundHandleImageMove);
    }

    handleImageMove(event) {
      if (!this.enableMove) return;
      event.stopPropagation();
      event.preventDefault();

      let clientX, clientY;

      // 判断事件类型以获取正确的坐标
      if (event.type.startsWith('touch')) {
        const touch = event.touches[0] || event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      this.currentPos = [clientX, clientY];
      let transX = 0;
      let transY = 0;

      if (this.maxTransX > 0) {
        transX = this.centerPos[0] - clientX;
        transX = Math.sign(transX) * Math.min(Math.abs(transX), this.maxTransX) / 1.25;
      }

      if (this.maxTransY > 0) {
        transY = this.centerPos[1] - clientY;
        transY = Math.sign(transY) * Math.min(Math.abs(transY), this.maxTransY) / 1.25;
      }

      this.image.style.transform = `scale(${this.scale}) translate(${transX}px, ${transY}px)`;
    }
  });
}