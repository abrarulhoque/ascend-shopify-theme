if (!customElements.get("product-side-drawer")) {
  /**
   * 快速预览侧边抽屉
   */
  customElements.define(
    "product-side-drawer",
    class ProductSideDrawer extends Drawer {
      constructor() {
        super();

        this.quickViewContent = this.querySelector(".quickview-content");
      }

      /**
       * 打开快速预览
       * @param opener
       */
      show(opener) {
        super.show(opener);

        let productUrl;
        if (opener) {
          productUrl = opener.getAttribute("data-product-url");
        } else if (window.Shopify.designMode) {
          // 设计模式，预览产品
          productUrl = this.getAttribute("data-product-url");
        }

        if (!productUrl) return;

        // 修改产看详情链接
        const productDetailsLink = document.getElementById(
          "Product-Details-Link",
        );
        if (productDetailsLink) productDetailsLink.href = productUrl;

        this.fetchContent(productUrl);
      }

      hide() {
        this.endLoading();

        if (this.fetchController) this.fetchController.abort(); // 暂停未完成的fetch
        this.quickViewContent.innerHTML = "";

        super.hide();
      }

      /**
       * Fetch加载数据
       * @param url
       */
      fetchContent(url) {
        this.startLoading();
        this.fetchController = new AbortController();
        const signal = this.fetchController.signal;

        webvista
          .fetchHtml(url, signal)
          .then((html) => {
            this.handleHTML(html);

            // 进入焦点陷进
            webvista.trapFocus(this);
            this.endLoading();
          })
          .catch((error) => {
            console.log(
              window["accessibilityStrings"]["unknownError"],
              "error",
            );
          });
      }

      startLoading() {
        if (this.openedBy) {
          this.openedBy.setAttribute("aria-disabled", true);
          this.openedBy.classList.add("loading");
        }

        // 占位 Placeholder
        this.quickViewContent.innerHTML =
          this.querySelector("template").innerHTML;
      }

      endLoading() {
        if (this.openedBy) {
          this.openedBy.removeAttribute("aria-disabled");
          this.openedBy.classList.remove("loading");
        }
      }

      handleHTML(html) {
        this.productHtml = html.querySelector('[id^="MainProduct-"]');

        this.preventDuplicatedIDs(); // 修改id，添加original-section
        this.updateProductContainerStyle(); // 修改样式
        this.removeUnnecessaryElements(); // 移除多余的元素
        this.changeGalleryLayout(); // 媒体相册布局变换
        this.updateImageSizes(); // 修改媒体文件尺寸, 提供加载速度

        // 替换html，执行js脚本
        this.setInnerHTML(this.quickViewContent, this.productHtml.innerHTML);

        webvista.initLazyImages(); // 图片懒加载
        webvista.initTooltips(); // 提示工具

        // 初始化快速结账
        if (window.Shopify && Shopify.PaymentButton) {
          Shopify.PaymentButton.init();
        }

        this.preventVariantURLSwitching(); //阻止修改浏览器地址
      }

      /**
       * 替换HTML，执行js
       * @param element
       * @param html
       */
      setInnerHTML(element, html) {
        element.innerHTML = html;

        // Re-injects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
        element.querySelectorAll("script").forEach((oldScriptTag) => {
          const newScriptTag = document.createElement("script");
          Array.from(oldScriptTag.attributes).forEach((attribute) => {
            newScriptTag.setAttribute(attribute.name, attribute.value);
          });
          newScriptTag.appendChild(
            document.createTextNode(oldScriptTag.innerHTML),
          );
          oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
        });
      }

      /**
       * 阻止原来的切换变体选项后【修改浏览器地址】
       */
      preventVariantURLSwitching() {
        const variantPicker =
          this.quickViewContent.querySelector("variant-selects");
        if (!variantPicker) return;

        variantPicker.setAttribute("data-update-url", "false");
      }

      /**
       * 移除不需要的元素
       * 元素标记为[class='quick-add-remove']
       */
      removeUnnecessaryElements() {
        Array.from(
          this.productHtml.querySelectorAll(".quick-add-remove"),
        ).forEach((element) => {
          element.remove();
        });
      }

      /**
       * 修改产品容器的样式
       */
      updateProductContainerStyle() {
        const productContainer =
          this.productHtml.querySelector(".product-container");
        if (productContainer)
          productContainer.className = "product-container isolate";

        const productContainerMain = this.productHtml.querySelector(
          ".product-container-main",
        );
        if (productContainerMain)
          productContainerMain.className = "product-container-main";
      }

      /**
       * 修改元素id, 添加original id
       */
      preventDuplicatedIDs() {
        const sectionId = this.productHtml.dataset.section;
        if (!sectionId) return;

        // 修改元素 id 和 id对应的属性， 比如 aria-control
        const quickAddSectionId = `quickadd-${sectionId}`;
        this.productHtml.innerHTML = this.productHtml.innerHTML.replaceAll(
          sectionId,
          quickAddSectionId,
        );

        // 添加源 id
        this.productHtml
          .querySelectorAll(`[data-section='${quickAddSectionId}']`)
          .forEach((element) => {
            element.dataset.originalSection = sectionId;
          });
      }

      /**
       * 修改媒体文件尺寸，节约资源
       */
      updateImageSizes() {
        const mediaImages =
          this.productHtml.querySelectorAll(".product-media img");
        if (!mediaImages.length) return;

        let mediaImageSizes = "(min-width: 750px) 15rem, calc(100vw - 2rem)";

        mediaImages.forEach((img) => {
          img.setAttribute("sizes", mediaImageSizes);

          // 修改 loading=lazy, 移除 fetchpriority=high; 这两个属性只用于产品页面，使其快速展示出来提高谷歌LCP得分
          img.setAttribute("loading", "lazy");
          img.removeAttribute("fetchpriority");
        });
      }

      /**
       * 修改相册布局，使其垂直布局
       * 可拖拽，可滚动，移除无限轮播
       */
      changeGalleryLayout() {
        // 去除 stack 标记
        this.productHtml
          .querySelector("[data-media-stack]")
          ?.removeAttribute("data-media-stack");

        const galleryView = this.productHtml.querySelector(
          '[id^="Gallery-Viewer"]',
        );
        if (!galleryView) return;

        galleryView.setAttribute("data-slide-desktop", "true");
        galleryView.setAttribute("data-slide-mobile", "true");
        galleryView.setAttribute("data-draggable", "true"); // 可拖拽
        galleryView.setAttribute("data-slide-smooth", "true"); // 平滑滚动
        galleryView.setAttribute("data-wheelable", "true"); // 可滚轮滚动
        galleryView.removeAttribute("data-looping-infinite"); // 移除无限轮播
      }
    },
  );
}
