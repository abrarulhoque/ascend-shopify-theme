/**
 * CustomerAddress 类用于管理和操作客户地址相关的 UI 元素。
 * 它提供了添加、编辑和删除客户地址的功能。
 */
class CustomerAddress extends HTMLElement {
  constructor() {
    super();

    this.boundEditHandler = this.onEditButtonClick.bind(this);
    this.boundDeleteHandler = this.onDeleteButtonClick.bind(this);
  }

  connectedCallback() {
    this.editButtons = this.querySelectorAll('.customer-address-edit-button');
    this.deleteButtons = this.querySelectorAll('.customer-address-delete-button');

    this.editButtons.forEach(button => button.addEventListener('click', this.boundEditHandler));
    this.deleteButtons.forEach(button => button.addEventListener('click', this.boundDeleteHandler));
  }

  disconnectedCallback(){
    if(this.editButtons) this.editButtons.forEach(button=> button.removeEventListener('click', this.boundEditHandler));
    if(this.deleteButtons) this.deleteButtons.forEach(button=> button.removeEventListener('click', this.boundDeleteHandler));
  }

  /**
   * 编辑和添加地址
   * @param event
   */
  onEditButtonClick(event) {
    const sideDrawer = this.querySelector(event.currentTarget.dataset.target);
    if(!sideDrawer) return;

    this.initCountrySelector(sideDrawer);
    sideDrawer.open(event.currentTarget);
  }

  /**
   * 删除地址
   * @param event
   */
  onDeleteButtonClick(event) {
    if(confirm(event.currentTarget.dataset.confirmMessage)) {
      Shopify.postLink(event.currentTarget.dataset.target, {
        parameters: { _method: 'delete' },
      });
    }
  }

  /**
   * 初始化国家选择器
   * @param wrapper
   */
  initCountrySelector(wrapper = null) {
    if(!wrapper) return;
    if (Shopify && Shopify.CountryProvinceSelector) {

      new Shopify.CountryProvinceSelector(wrapper.querySelector('select[name="address[country]"]')?.id, wrapper.querySelector('select[name="address[province]"]')?.id, {
        hideElement: wrapper.querySelector('.address-province-select')?.id,
      });
    }
  }
}

customElements.define('customer-address', CustomerAddress);