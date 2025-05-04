/**
 * 自定义 Web Component，实现水平无缝滚动效果。
 * 支持通过 `data-direction` 属性设置滚动方向（向左或向右）。
 * 使用 `IntersectionObserver` 来优化性能，仅在组件首次进入视口时初始化滚动。
 * 组件响应窗口尺寸变化，自动调整滚动内容以适配新尺寸。
 * 利用 `DocumentFragment` 批量克隆元素，以减少DOM操作的性能开销。
 */

if (!customElements.get("scroll-seamless")) {
  customElements.define(
    "scroll-seamless",
    class ScrollSeamless extends HTMLElement {
      constructor() {
        super();

        this.listContainer = this.querySelector(".scroll-list");
        this.scrollDirection = this.getAttribute("data-direction") || "left";
        this.speed = parseInt(this.getAttribute("data-speed")) || 40; // 速度，单位时间移动像素
        this.currentTrans = 0; // 设计模式时，选中block移动的距离（为了让隐藏的block可见）
        this.lastWindowWidth = window.innerWidth;

        this.observeInView();
        if (window.Shopify.designMode || window.debug) {
          this.debounceWindowSizeChangeHandler = webvista.debounce(
            this.onWindowSizeChange.bind(this),
            500,
          );
          window.addEventListener(
            "resize",
            this.debounceWindowSizeChangeHandler,
          );
        }
      }

      disconnectedCallback() {
        if (this.debounceWindowSizeChangeHandler) {
          window.removeEventListener(
            "resize",
            this.debounceWindowSizeChangeHandler,
          );
        }
      }

      /**
       * 初始化
       */
      init() {
        this.getAllItems();
        if (this.items.length < 1) return;

        this.getOriginalTotalWidth();
        this.cloneItems();
        this.getAllItems();
        this.getGap();

        const transformDistance = this.originalWidth + this.gap;
        if (this.scrollDirection === "left") {
          this.style.setProperty("--from-x", `0`);
          this.style.setProperty("--end-x", `-${transformDistance}px`);
        } else {
          this.style.setProperty(
            "--from-x",
            `${this.clientWidth - this.scrollWidth}px`,
          );
          this.style.setProperty(
            "--end-x",
            `${this.clientWidth - this.scrollWidth + transformDistance}px`,
          );
        }

        this.style.setProperty(
          "--scroll-speed",
          `${transformDistance / this.speed}s`,
        );

        this.setAttribute("data-init", "true");
      }

      /**
       * 处理屏幕尺寸变化
       */
      onWindowSizeChange() {
        const currentWidth = window.innerWidth;
        if (currentWidth === this.lastWindowWidth) return;
        this.lastWindowWidth = currentWidth;

        if (!this.hasAttribute("data-init")) return;
        this.removeAttribute("data-init");

        // 移除克隆单元
        setTimeout(() => {
          this.classList.add(
            "hidden",
          ); /* 先隐藏，可以减少浏览器对Dom的渲染和重排 */
          this.querySelectorAll(".item-clone").forEach((item) => item.remove());
          this.classList.remove("hidden");

          this.init();
        });
      }

      /**
       * 监听进入视口
       */
      observeInView() {
        const observer = new IntersectionObserver(
          (entries, observer) => {
            if (entries[0].isIntersecting) {
              this.init();
              observer.disconnect();
            }
          },
          {
            root: null,
            rootMargin: "100px 0px 100px 0px",
          },
        );

        observer.observe(this);
      }

      /**
       * 补充剩余空间, 使轮播单元占据全屏宽度
       * 循环克隆
       */
      cloneItems() {
        const times = Math.ceil(this.clientWidth / this.originalWidth);
        let fragment = document.createDocumentFragment();
        for (let i = 0; i < times; i++) {
          this.items.forEach((item) => {
            const cloneItem = item.cloneNode(true);
            cloneItem.removeAttribute("data-shopify-editor-block"); // 移除Shopify编辑属性
            cloneItem.classList.add("item-clone");

            fragment.appendChild(cloneItem);
          });
        }

        this.listContainer.appendChild(fragment);

        webvista.initLazyImages(); // 图片懒加载监听
      }

      /**
       * 获取所有滚动单元
       */
      getAllItems() {
        this.items = Array.from(this.querySelectorAll(".scroll-item")); // 重新获取 items
      }

      /**
       * 获取初始单元总宽度，需要在 Padding 之前获取
       */
      getOriginalTotalWidth() {
        this.originalWidth =
          this.items[this.items.length - 1].offsetLeft -
          this.items[0].offsetLeft +
          this.items[this.items.length - 1].offsetWidth;
      }

      /**
       * 获取单元之间的间距
       * 需要在 Padding 之后获取，Padding 后一定存在至少 2 个单元
       */
      getGap() {
        if (this.items.length < 2) {
          this.gap = 32;
        } else {
          this.gap =
            this.items[1].offsetLeft -
            this.items[0].offsetLeft -
            this.items[0].offsetWidth;
        }
      }

      // 将子单元移动到可见区域
      moveItemVisible(item) {
        if (this.items.indexOf(item) === -1) return;

        const containerRect = this.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        let offset;
        if (itemRect.right > containerRect.right) {
          offset = containerRect.right - itemRect.right;
        } else if (itemRect.left < containerRect.left) {
          offset = containerRect.left - itemRect.left;
        } else {
          return;
        }

        this.currentTrans = this.currentTrans + offset;

        // 通过css的translateX移动this元素
        this.listContainer.style.transform = `translateX(${this.currentTrans}px)`;
      }
    },
  );
}
