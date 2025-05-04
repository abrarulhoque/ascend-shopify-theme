if (!customElements.get("masonry-layout")) {
  customElements.define(
    "masonry-layout",
    class Masonry extends HTMLElement {
      constructor() {
        super();

        this.items = Array.from(this.querySelectorAll(".testimonial-item"));
        if (this.items.length <= 1) return; // 必须大于1

        this.listWrapper = this.querySelector(".testimonial-list");
        this.hasInited = false; // 初始化状态
        this.currentTrans = 0; // 设计模式时，选中block移动的距离（为了让隐藏的block可见）
        this.lastWindowWidth = window.innerWidth; // 用于监听屏幕宽度变化
        this.column = parseInt(this.dataset.column) || 2; // 电脑端列数
        this.columnMobile = parseInt(this.dataset.columnMobile) || 2; // 手机端列数

        this.itemsTotalHeight = this.getItemsHeight();
        if (this.offsetHeight > this.itemsTotalHeight) return; // 不满足循环条件

        this.speed = parseInt(this.getAttribute("data-speed")) || 40; // 速度，单位时间移动像素

        this.init();

        if(window.Shopify.designMode || window.debug) {
          this.debounceWindowSizeChangeHandler = webvista.debounce(this.onWindowSizeChange.bind(this), 500);
          window.addEventListener('resize', this.debounceWindowSizeChangeHandler);
        }
      }

      /**
       * 屏幕尺寸变化
       */
      onWindowSizeChange() {
        const currentWidth = window.innerWidth;
        if(currentWidth === this.lastWindowWidth) return;
        this.lastWindowWidth = currentWidth;

        this.hasInited = false;
        this.removeAttribute('data-init');
        this.removeCloneItems(); //  移出所有克隆单元

        this.itemsTotalHeight = this.getItemsHeight();
        if (this.offsetHeight > this.itemsTotalHeight) return; // 不满足循环条件

        this.init(); // 重新初始化
      }

      // 初始化
      init() {
        this.cloneItems();

        this.style.setProperty("--from-y", `0`);
        this.style.setProperty("--end-y", `-${this.itemsTotalHeight}px`);
        this.style.setProperty(
          "--scroll-speed",
          `${this.itemsTotalHeight / this.speed}s`,
        );

        this.hasInited = true;
        this.setAttribute("data-init", "true");
      }

      /**
       * 计算总高度
       * @returns {Number}
       */
      getItemsHeight() {
        // 获取第一个和第二个元素的位置
        const gap =
          this.items.length > 1
            ? this.items[1].getBoundingClientRect().top -
              this.items[0].getBoundingClientRect().bottom
            : 0;

        // 计算总高度，包括每个 item 的高度和 gap
        return this.items.reduce((acc, item) => {
          // 使用 getBoundingClientRect 获取更精确的高度
          const itemHeight = item.getBoundingClientRect().height;
          // 每个 item 的高度加上 gap
          return acc + itemHeight + gap;
        }, 0);
      }

      cloneItems() {
        const column = webvista.isMobileScreen() ? this.columnMobile : this.column;
        const padColumns = []; // 补充列

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < column - 1; i++) {
          const reversedItems = Array.from(this.items).reverse();
          padColumns.push(reversedItems);
        }

        // 原始先复制一次
        this.items.forEach((item) => {
          fragment.appendChild(this.cloneItem(item));
        });

        // 补充列复制两次
        padColumns.forEach((items) => {
          for (let j = 0; j < 2; j++) {
            items.forEach((item) => {
              fragment.appendChild(this.cloneItem(item));
            });
          }
        });

        this.listWrapper.appendChild(fragment);

        webvista.initLazyImages();
        webvista.initTooltips();
      }

      cloneItem(item) {
        const clonedItem = item.cloneNode(true);
        clonedItem.removeAttribute("data-shopify-editor-block");
        clonedItem.classList.add("item-clone");

        return clonedItem;
      }

      /**
       * 移出所有克隆单元
       */
      removeCloneItems() {
        this.querySelectorAll('.item-clone').forEach(item=>{
          item.remove();
        });
      }

      // 将子单元移动到可见区域
      moveItemVisible(item) {
        if (this.items.indexOf(item) === -1 || !this.hasInited) return;

        const containerRect = this.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        let offset;
        if (itemRect.bottom > containerRect.bottom) {
          offset = containerRect.bottom - itemRect.bottom;
        } else if (itemRect.top < containerRect.top) {
          offset = containerRect.top - itemRect.top;
        } else {
          return;
        }

        this.currentTrans = this.currentTrans + offset;

        // 通过css的translateX移动this元素
        this.listWrapper.style.transform = `translateY(${this.currentTrans}px)`;
      }
    },
  );
}
