/**
 * ProductInfo类
 * 监听【购物车变化】和【产品变体切换】
 * 处理数量规则的边界修正问题
 */
if (!customElements.get("product-info")) {
  customElements.define(
    "product-info",
    class ProductInfo extends HTMLElement {
      cartUpdateUnsubscriber = undefined;
      variantChangeUnsubscriber = undefined;

      constructor() {
        super();

        // 记录最近浏览
        if (!!window.localStorage) this.addRecentlyViewedProduct();

        this.quantityForm = this.querySelector(".quantity-selector"); // 数量选择器容器
        this.input = this.querySelector(".quantity-input"); // 商品数量选择器
        if (!this.quantityForm || !this.input) return;

        this.currentVariant = this.querySelector("input.product-variant-id");
        this.submitButton = this.querySelector('button[type="submit"]'); // 添加购物车按钮

        // 初始化数量边界修正
        this.setQuantityBoundries();

        // 订阅购物车变化
        // 快速产品预览无需订阅
        if (!this.dataset.originalSection) {
          // 订阅购物车更新 -> 获取最新的数量规则，并修正
          this.cartUpdateUnsubscriber = webvista.subscribe(
            PUB_SUB_EVENTS.cartUpdate,
            this.fetchQuantityRules.bind(this),
          );
        }

        // 订阅产品变体变化
        this.variantChangeUnsubscriber = webvista.subscribe(
          PUB_SUB_EVENTS.variantChange,
          (event) => {
            if (event.data.sectionId !== this.dataset.section) return;

            // 当变体发生变化，更新数量规则
            this.updateQuantityRules(event.data.html);

            // 更新输入框的输入边界
            this.setQuantityBoundries();
          },
        );
      }

      disconnectedCallback() {
        if (this.cartUpdateUnsubscriber) {
          this.cartUpdateUnsubscriber();
        }
        if (this.variantChangeUnsubscriber) {
          this.variantChangeUnsubscriber();
        }
      }

      /**
       * Fetch重新获取最新的数量规则
       * 修正选择器边界规则
       */
      fetchQuantityRules() {
        if (!this.currentVariant || !this.currentVariant.value) return;

        webvista.fetchHtml(`${this.dataset.url}?variant=${this.currentVariant.value}&section_id=${this.sectionId}`).then(html=>{
          this.updateQuantityRules(html);
          this.setQuantityBoundries();
        }).catch((e) => {
          webvista.popToast(window["accessibilityStrings"]["unknownError"], "error");
        });
      }

      /**
       * 数量选择器边界值修正
       * 更新 input 输入框的 Min 和 Max 值
       * 当【购物车发生变化】或者【产品属性选择器变化】的时候触发更新
       */
      setQuantityBoundries() {
        const data = {
          cartQuantity: this.input.dataset.cartQuantity
            ? parseInt(this.input.dataset.cartQuantity)
            : 0, // 已经添加购物车数量
          min: this.input.dataset.min ? parseInt(this.input.dataset.min) : 1, // 单次可添加购物车的最小值
          max: this.input.dataset.max ? parseInt(this.input.dataset.max) : null, // 单次结账购物车中某个产品SKU的最大值
          step: this.input.step ? parseInt(this.input.step) : 1,
        };

        let min = data.min;
        // 可添加最大值 = 可购买的最大值 - 购物车中已添加的值
        const max = data.max === null ? data.max : data.max - data.cartQuantity;
        if (max !== null) min = Math.min(min, max);

        // 可输入最小值 <= step
        if (data.cartQuantity >= data.min) min = Math.min(min, data.step);

        this.input.min = min;
        this.input.max = max;
        this.input.value = min;
        webvista.publish(PUB_SUB_EVENTS.quantityUpdate, undefined);
      }

      /**
       * 更新选择器数量规则
       * .quantity-input 数量输入框，更新 data-cart-quantity, data-min, data-max, step
       * .quantity-label 当前变体已经添加购物车数量
       * @param html 源 html
       */
      updateQuantityRules(html) {
        const quantityFormSource = html.querySelector(".quantity-selector");
        const selectors = [".quantity-input", ".quantity-label"];

        for (let selector of selectors) {
          const current = this.quantityForm.querySelector(selector);
          const updated = quantityFormSource.querySelector(selector);

          if (!current || !updated) continue;

          if (selector === ".quantity-input") {
            const attributes = [
              "data-cart-quantity",
              "data-min",
              "data-max",
              "step",
            ];
            for (let attribute of attributes) {
              const valueUpdated = updated.getAttribute(attribute);
              if (valueUpdated !== null)
                current.setAttribute(attribute, valueUpdated);
            }
          } else {
            current.innerHTML = updated.innerHTML;
          }
        }
      }

      /**
       * 添加最近浏览记录
       */
      addRecentlyViewedProduct() {
        if (!this.dataset.id) return;

        const recentlyViewedData = webvista.retrieveData(RECENTLY_VIEWED_KEY) || [];
        const index = recentlyViewedData.indexOf(this.dataset.id);
        if (index !== -1) {
          recentlyViewedData.splice(index, 1); // 删除已经存在的记录
        }
        recentlyViewedData.push(this.dataset.id); // 添加新记录

        // 移出前面的元素，保持最多10个子元素
        if (recentlyViewedData.length > 10) {
          recentlyViewedData.splice(0, recentlyViewedData.length - 10);
        }

        webvista.storeData(RECENTLY_VIEWED_KEY, recentlyViewedData);
      }

      get sectionId() {
        return this.dataset.section;
      }
    },
  );
}
