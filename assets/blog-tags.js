if (!customElements.get("blog-tags")) {
  customElements.define(
    "blog-tags",
    class BlogTags extends HTMLElement {
      constructor() {
        super();

        if (!this.blogContent) return;

        this.addEventListener("click", (event) => {
          if (event.target.classList.contains("blog-tag")) {
            this.handleEvent(event);
          }
        });
      }

      get blogContent() {
        return document.getElementById("Blog-Content");
      }

      /**
       * 处理Tag点击
       * @param event
       */
      handleEvent(event) {
        event.preventDefault();

        let href = event.target.getAttribute("href");
        if (!href) return;

        const currentTagElement = this.querySelector(
          '.blog-tag[aria-current="page"]',
        );
        if (currentTagElement) {
          currentTagElement.removeAttribute("aria-current");
        }

        event.target.setAttribute("aria-current", "page");

        this.fetchContent(href);
      }

      fetchContent(href) {
        if (!href) return;
        this.startLoading();

        if (this.fetchController) this.fetchController.abort();
        this.fetchController = new AbortController();
        const signal = this.fetchController.signal;

        webvista
          .fetchHtml(href, signal)
          .then((html) => {
            if (html) this.renderHtml(html);
          })
          .finally(() => {
            this.endLoading();
          });
      }

      renderHtml(html) {
        const sourceContentDom = html.querySelector("#Blog-Content");

        if (sourceContentDom) {
          this.blogContent.innerHTML = sourceContentDom.innerHTML;

          if (typeof initializeScrollAnimationTrigger === "function") {
            initializeScrollAnimationTrigger(this.contentListWrapper); // 重新初始化【滚屏展示】动画效果
          }
          webvista.initLazyImages(); // 重新初始化图片懒加载
          webvista.initTooltips();
        }
      }

      startLoading() {
        this.blogContent.classList.add("loading");
      }

      endLoading() {
        this.blogContent.classList.remove("loading");
      }
    },
  );
}
