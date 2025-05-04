/**
 * 删除购物车 Item
 */
if(!customElements.get('cart-remove')) {
  customElements.define('cart-remove', class CartRemove extends HTMLElement {
    constructor() {
      super();

      this.addEventListener('click', (event) => {
        event.preventDefault();

        const cartItems = this.closest('cart-items');
        if(cartItems) cartItems.updateQuantity(this.dataset.index, 0);
      });
    }
  });
}

if(!customElements.get('cart-items')) {
  customElements.define('cart-items', class CartItems extends HTMLElement {
    constructor() {
      super();

      // 监听修改事件
      this.debouncedOnChange = webvista.throttle(this.onChange.bind(this), ON_CHANGE_DEBOUNCE_TIMER);
      this.addEventListener('change', this.debouncedOnChange);

      this.sectionId = this.dataset.section;
      this.inDrawer = this.hasAttribute('data-in-drawer'); // 是否在抽屉中
      if(this.inDrawer) {
        // 获取焦点陷进抽屉
        this.drawerTrap = this.closest('[data-trap]');
      }

      this.lineItemStatusElement = document.getElementById(`Cart-Line-Item-Status-${this.sectionId}`); // 辅助设备状态管理
      this.cartItemsContainer = document.getElementById(`Cart-Items-${this.sectionId}`);

      // 判断礼品包装数量和item数量是否一致
      if(this.hasAttribute('data-gift-wrap-id')) {
        // 数量不一致，更新礼品包装数量
        if(parseInt(this.dataset.giftWrapQuantity) !== parseInt(this.dataset.itemQuantity) ) {
          this.updateQuantity(this.dataset.giftWrapIndex, this.dataset.itemQuantity, null, this.dataset.giftWrapId);
        }
      }
    }

    /**
     * 处理变化事件
     * @param event
     */
    onChange(event) {
      this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement, event.target.dataset.quantityVariantId);
    }

    /**
     * 更新购物车数量
     * @param line cart-item Id
     * @param quantity 数量
     * @param focusableElement 可聚焦元素对象
     * @param variantId 变体id
     */
    updateQuantity(line, quantity, focusableElement, variantId) {
      this.enableLoading(line);

      const body = JSON.stringify({
        line,
        quantity,
        sections: this.getSectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname,
      });

      fetch(window['routes']['cart_change_url'], { ...webvista.fetchConfig(), ...{ body } })
          .then((response) => {
            return response.json();
          })
          .then((responseJson) => {
            if (responseJson.errors) {
              // 用于恢复初始值
              // input.value是js属性，会随着input值变化而变化
              // inputElement.getAttribute('value') 是HTML DOM方法，用于获取初始值，这个值不会变化。
              // 为了购物车页面和购物车抽屉都有比较好的布局，每个 cart item 有两个数量输入框
              this.restoreLineItemQuantityInputs(line);
              return this.showError(responseJson.errors);
            }

            const updatedValue = responseJson.items[line - 1] ? responseJson.items[line - 1].quantity : undefined;
            let message = '';
            const items = this.querySelectorAll('.cart-item');

            if (items.length === responseJson.items.length && updatedValue !== parseInt(quantity)) {
              if (typeof updatedValue === 'undefined') {
                message = window['cartStrings']['error'];
              } else {
                message = window['cartStrings']['quantityError'].replace('[quantity]', updatedValue);
              }

              this.restoreLineItemQuantityInputs(line);
              return this.showError(message);
            }

            // 判断是否有包装，如果有的话更新包装数量
            const giftWrapLine = this.dataset.giftWrapIndex;
            const giftWrapping = document.getElementById(`Cart-Gift-Wrapping-${this.sectionId}`);

            if(giftWrapping && giftWrapLine != null && giftWrapLine !== line) {
              // 更新包装
              const item_quantity = responseJson['item_count'] - parseInt(this.dataset.giftWrapQuantity);
              if(item_quantity > 0) {
                this.updateQuantity(giftWrapLine, item_quantity, focusableElement, variantId);
              } else {
                giftWrapping.removeWrapping();
              }
            } else {
              // 处理购物车更新
              this.handleCartUpdate(responseJson, variantId, focusableElement);
            }
          }).catch((error) => {
            // 购物车显示错误
            this.showError(window['cartStrings']['error']);
          }).finally(() => {
            this.disableLoading(line);
          });
    }

    /**
     * 处理变化后的更新
     * 更新网站显示，处理焦点，发送广播
     * @param responseJson
     * @param variantId
     * @param focusableElement 可聚焦的焦点元素
     */
    handleCartUpdate(responseJson, variantId, focusableElement) {
      // 更新内容
      SectionDynamicUpdate.updateSections(this.getSectionsToRender(), responseJson.sections);

      // 重新进入焦点陷阱
      if(this.drawerTrap) {
        webvista.trapFocus(this.drawerTrap, focusableElement);
      } else if(focusableElement) {
        focusableElement.focus();
      }

      // 发送事件广播
      webvista.publish(PUB_SUB_EVENTS.cartUpdate, {
        source: 'cart-items',
        productVariantId: variantId,
        cartData: responseJson,
      });
    }

    /**
     * 还原 Line Item 中的所有输入框的值
     * 还原为属性中的原始值
     */
    restoreLineItemQuantityInputs(line) {
      if(!line) return;

      const quantityInputs = this.querySelectorAll(`.quantity-input[data-index='${line}']`);
      quantityInputs.forEach(input => {
        input.value = input.getAttribute('value');
      });
    }

    /**
     * 返回需要更新的Sections
     * @returns {[{section: string, selector: string, id: string}]}
     */
    getSectionsToRender() {
      const sections = [
        {
          id: 'Cart-Icon-Bubble',
          section: 'cart-icon-bubble',
          selector: '.shopify-section',
        }
      ];

      if(this.inDrawer) {
        sections.push({
          id: 'Cart-Drawer',
          section: this.sectionId,
          selector: '#Cart-Drawer-Details',
        });
      } else {
        sections.push({
          id: 'Main-Cart',
          section: this.sectionId,
          selector: '#Main-Cart-Details',
        });
      }

      return sections;
    }

    /**
     * 显示错误提示
     * @param message
     */
    showError(message = null) {
      if(!message) return;

      webvista.popToast(message, 'error');
    }

    /**
     * Loading 状态
     * @param line line item
     */
    enableLoading(line = null) {
      this.cartItemsContainer.classList.add('cart-items--disabled');

      if(line) {
        const cartItemElement = this.querySelector(`#Cart-Item-${this.sectionId}-${line}`);
        if(!cartItemElement) return;

        cartItemElement.classList.add('loading');
      }

      document.activeElement.blur();
      this.lineItemStatusElement.setAttribute('aria-hidden', "false");
    }

    /**
     * End Loading 状态
     * @param line
     */
    disableLoading(line = null) {
      this.cartItemsContainer.classList.remove('cart-items--disabled');

      if(line) {
        const cartItemElement = this.querySelector(`#Cart-Item-${this.sectionId}-${line}`);
        if(!cartItemElement) return;

        cartItemElement.classList.remove('loading');
      }

      this.lineItemStatusElement.setAttribute('aria-hidden', "true");
    }
  });
}

if(!customElements.get('free-shipping-progress')) {
  customElements.define('free-shipping-progress', class FreeShippingProgress extends HTMLElement {
    /**
     * data-total-amount 购物车总价金额，单位分
     * data-free-threshold 包邮门槛金额，单位元
     * data-confetti 触发彩带庆祝效果
     */
    constructor() {
      super();

      this.renderProgress();
    }

    get progressBar() {
      return this.querySelector('.free-shipping-progress');
    }

    get messageWrapper () {
      return this.querySelector('.free-shipping-message');
    }

    /**
     * 渲染包邮进度条
     */
    renderProgress() {
      const cartTotalAmount = this.dataset.totalAmount;
      const freeThreshold = this.dataset.freeThreshold;

      if(!webvista.isNumeric(cartTotalAmount) || !webvista.isNumeric(freeThreshold)) return;

      const freeThresholdLocal = Math.round(parseInt(freeThreshold) * (Shopify.currency.rate || 1)) * 100; // 门槛金额汇率转换，单位分

      let progress;
      if(cartTotalAmount - freeThresholdLocal >= 0) {
        progress = 100;
        this.messageWrapper.innerHTML = window['cartStrings']['freeShippingUnlockedMessage'];
        this.classList.add('free-has-unlocked');
      } else {
        progress = cartTotalAmount * 100 / freeThresholdLocal;

        const amountToQualify = freeThresholdLocal - cartTotalAmount;
        this.messageWrapper.innerHTML = window['cartStrings']['freeShippingLockedMessage'].replace('[amount]', webvista.formatPriceAmount(amountToQualify, Shopify.currency.active));
      }

      // 进度条进度
      if(this.progressBar) this.progressBar.style.setProperty('--free-shipping-progress', `${progress}%`);

      // 触发庆祝彩带特效
      if(this.hasAttribute('data-confetti')) {
        document.dispatchEvent(new CustomEvent('freeShippingUnlocked', {
          detail: { status: progress >= 100 }
        }));
      }
    }
  });
}

/**
 * 订单备注
 */
if (!customElements.get('cart-note-modal')) {
  customElements.define(
      'cart-note-modal',
      class CartNoteModal extends ModalDialog {
        constructor() {
          super();

          const form  = this.querySelector('form');
          if(!form) return;

          this.submitButton = this.querySelector('button[type=submit]');
          form.addEventListener('submit', this.formSubmit.bind(this));
        }

        /**
         * 处理保存备注
         * @param event
         */
        formSubmit(event) {
          event.preventDefault();
          this.startLoading();

          const formData = new FormData(event.target);
          const formDataJson = Object.fromEntries(formData.entries());
          const body = JSON.stringify(formDataJson);

          fetch(window['routes']['cart_update_url'], { ...webvista.fetchConfig(), ...{ body } })
              .then(response => {
                return response.json();
              })
              .then(response=>{
                if(response.error) {
                  throw new Error('Cart update error');
                }

                webvista.popToast(window['cartStrings']['addToNoteSuccess'], 'success');
                this.hide();
              }).catch(error=> {
                webvista.popToast(window['cartStrings']['addToNoteError'], 'error');
              }).finally(()=>{
                this.endLoading();
              });
        }

        startLoading() {
          this.submitButton.classList.add('loading');
          this.submitButton.setAttribute('disabled', 'disabled');
        }

        endLoading() {
          this.submitButton.classList.remove('loading');
          this.submitButton.removeAttribute('disabled');
        }
      }
  );
}

/**
 * 订单运费预估
 */
if(!customElements.get('shipping-calculator-modal')){
  customElements.define('shipping-calculator-modal', class ShippingCalculatorModal extends ModalDialog {

    static MAX_ATTEMPTS = 3;
    constructor() {
      super();

      this.asyncAttemptCount = 0; // Async请求尝试次数

      const form = this.querySelector('form');
      if(!form) return;

      form.addEventListener('submit', this.prepareRate.bind(this));

      this.submitButton = this.querySelector('button[type=submit]');
      this.successMessageElement = this.querySelector('.alert-success');
    }

    /**
     * 请求查询物流信息
     * @param event
     */
    prepareRate(event){
      event.preventDefault();

      this.hideResults();
      this.startLoading();

      const formData = new FormData(event.target);
      const shipping_address = {
        country: formData.get('country'),
        province: formData.get('province'),
        zip: formData.get('zip')
      };
      const body = JSON.stringify({ shipping_address: shipping_address });

      fetch(`${window['routes']['cart_url']}/prepare_shipping_rates.json`, {...webvista.fetchConfig(), ...{ body }})
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
          })
          .then((response)=>{
            if(response == null || response.ok){
              this.asyncRate({ shipping_address: shipping_address });
            }else {
              throw new Error('Prepare shipping rates error');
            }
          }).catch(error=>{
            this.showError();
          });
    }

    /**
     * 异步查询返回的信息
     * @param params
     */
    asyncRate(params){
      fetch(`${window['routes']['cart_url']}/async_shipping_rates.json?` + this.serialize(params), {...webvista.fetchConfig('json', 'GET')})
          .then((response) => {
            return response.json();
          })
          .then((response) => {
            if(response != null && response['shipping_rates'] != null && response['shipping_rates'].length > 0) {
              this.showResults(response);
            } else {
              if(++this.asyncAttemptCount >= ShippingCalculatorModal.MAX_ATTEMPTS){
                this.showError();
              }  else {
                setTimeout(()=>this.asyncRate(params), 3000);
              }
            }
          }).catch(error=>{
            this.showError();
          });
    }

    startLoading(){
      this.submitButton.classList.add('loading');
      this.submitButton.setAttribute('disabled', 'disabled');
    }

    endLoading(){
      this.submitButton.classList.remove('loading');
      this.submitButton.removeAttribute('disabled');
    }

    showError(){
      this.endLoading();
      webvista.popToast(window['cartStrings']['estimateShippingError'], 'error');
    }

    /**
     * 显示查询到的结果
     * @param result
     */
    showResults(result){
      this.endLoading();

      const rates = result['shipping_rates'];
      if(!rates || rates.length <= 0 || !this.successMessageElement) return;

      // 标题修改
      const countElement = this.successMessageElement.querySelector('.result-count');
      countElement.innerText = rates.length;

      // 显示查询到的物流列表
      const template = this.successMessageElement.querySelector('template').content; // 消息模板
      const fragment = document.createDocumentFragment();
      rates.forEach((rate)=>{
        const clone = document.importNode(template, true);

        clone.querySelector('.presentment-name').textContent = rate['presentment-name'] || rate['name'];
        clone.querySelector('.delivery-price').textContent = rate['price'] + rate['currency'];

        let deliveryDate = rate['delivery_date'];
        if(rate['delivery_range'] && Array.isArray(rate['delivery_range'])) {
          if(rate['delivery_range'].length > 1) {
            deliveryDate = rate['delivery_range'].join(' - ');
          }else {
            deliveryDate = rate['delivery_range'][0];
          }
        }

        if(deliveryDate == null || deliveryDate === '') {
          deliveryDate = 'unknown';
        }
        clone.querySelector('.delivery-date').textContent = deliveryDate;

        fragment.appendChild(clone);
      });

      this.successMessageElement.querySelector('.message-list').appendChild(fragment);

      this.successMessageElement.removeAttribute('hidden');
      this.endLoading();
    }

    hideResults() {
      if(this.successMessageElement) {
        this.successMessageElement.querySelector('.message-list').innerHTML = '';
        this.successMessageElement.setAttribute('hidden', 'true');
      }
    }

    serialize(obj, prefix) {
      const str = Object.keys(obj)
          .filter(key => obj.hasOwnProperty(key))
          .map(key => {
            const k = prefix ? `${prefix}[${key}]` : key;
            const v = obj[key];
            return (v !== null && typeof v === "object") ?
                this.serialize(v, k) :
                `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
          });
      return str.join("&");
    }
  });
}

/**
 * 礼品包装
 */
if(!customElements.get('gift-wrapping')) {
  customElements.define('gift-wrapping', class GiftWrapping extends HTMLElement {
    constructor() {
      super();

      this.giftWrapId = this.dataset.giftWrappingId;
      if(!this.giftWrapId) return;
      this.itemQuantity = Math.max(0, parseInt(this.dataset.itemQuantity)); // 订单中的item总数量

      this.cartItems = document.getElementById(`Cart-Items-Main-${this.dataset.section}`);

      const boundChange = webvista.debounce(this.onChange.bind(this), 1000);
      this.checkInput = this.querySelector('input[type="checkbox"]');
      this.checkInput.addEventListener('change', boundChange);
    }

    onChange(event) {
      if(event.target.checked) {
        this.setWrapping();
      } else {
        this.removeWrapping();
      }
    }

    /**
     * 添加包裹
     */
    setWrapping () {
      const body = JSON.stringify({
        updates: {
          [this.giftWrapId]: this.itemQuantity
        },
        attributes: {
          "gift-wrap": "Yes"
        },
        sections: this.cartItems.getSectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname
      });

      this.fetchData(body);
    }

    /**
     * 移除包裹
     */
    removeWrapping() {
      const body = JSON.stringify({
        updates: {
          [this.giftWrapId]: 0
        },
        attributes: {
          "gift-wrap": ""
        },
        sections: this.cartItems.getSectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname
      });

      this.fetchData(body);
    }

    fetchData(body) {
      this.enableLoading();
      fetch(window['routes']['cart_update_url'], { ...webvista.fetchConfig(), body })
          .then(response => {
            return response.json();
          })
          .then(responseJson=>{
            this.cartItems.handleCartUpdate(responseJson, this.giftWrapId, this.checkInput);
          }).catch(error=> {
            webvista.popToast(window['accessibilityStrings']['unknownError'], 'error');
          }).finally(()=>{
            this.disableLoading();
          });
    }

    enableLoading() {
      this.cartItems.enableLoading();

      this.checkInput.setAttribute('disabled', 'true');
    }

    disableLoading() {
      this.cartItems.disableLoading();

      this.checkInput.removeAttribute('disabled');
    }
  });
}