if (!customElements.get('localization-form')) {
  customElements.define(
    'localization-form',
    class LocalizationForm extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          input: this.querySelector('input[name="locale_code"], input[name="country_code"]'),
          button: this.querySelector('button'),
          panel: this.querySelector('.disclosure-list-wrapper'),
        };
        this.elements.button.addEventListener('click', this.openSelector.bind(this));
        this.elements.button.addEventListener('focusout', this.closeSelector.bind(this));
        this.addEventListener('keyup', this.onContainerKeyUp.bind(this));

        this.querySelectorAll('a').forEach((item) => item.addEventListener('click', this.onItemClick.bind(this)));
      }

      hidePanel() {
        this.elements.button.setAttribute('aria-expanded', 'false');
        this.elements.panel.setAttribute('hidden', true);
      }

      onContainerKeyUp(event) {
        if (event.code && event.code.toUpperCase() !== 'ESCAPE') return;

        if (this.elements.button.getAttribute('aria-expanded') === 'false') return;
        this.hidePanel();
        event.stopPropagation();
        this.elements.button.focus();
      }

      onItemClick(event) {
        event.preventDefault();

        const form = this.querySelector('form');
        this.elements.input.value = event.currentTarget.dataset.value;
        if (form) form.submit();
      }

      openSelector() {
        this.elements.button.focus();
        this.elements.panel.toggleAttribute('hidden');
        this.elements.button.setAttribute(
          'aria-expanded',
          (this.elements.button.getAttribute('aria-expanded') === 'false').toString()
        );

        // 计算是否超出视口，如果超出，切换为右对齐
        const viewportWidth = window.innerWidth;
        const wrapperRect = this.elements.panel.getBoundingClientRect();
        if(wrapperRect.right - viewportWidth > 0){
          this.elements.panel.style.right =  '0';
          this.elements.panel.style.left = 'auto';
        }
        this.elements.button.classList.add('disclosure--adjusted');

        this.animations = this.elements.panel.getAnimations();
        if (!this.elements.panel.hasAttribute('hidden')) {
          this.animations.forEach((animation) => animation.play());
        } else {
          this.animations.forEach((animation) => animation.cancel());
        }
      }

      closeSelector(event) {
        const isChild =
          this.elements.panel.contains(event.relatedTarget) || this.elements.button.contains(event.relatedTarget);
        if (!event.relatedTarget || !isChild) {
          this.hidePanel();
        }
      }
    }
  );
}
