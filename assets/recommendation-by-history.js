/**
 * 根据用户的浏览历史自动推荐产品
 * 可以是互补产品或者相关产品
 */

if (!customElements.get("recommendation-by-history")) {
  customElements.define(
    "recommendation-by-history",
    class recommendationByHistory extends HTMLElement {
      constructor() {
        super();

        this.section = this.dataset.section;
      }

      disconnectedCallback() {
        this.abortFetch();
      }

      /**
       * 如果有最近浏览的产品 url，那么显示相关产品，否则隐藏
       */
      showContent() {
        this.newestProductId = this.getNewestProductId();
        if (this.newestProductId == null) return this.toggleShow(false);

        if (this.newestProductId === this.preProductId) return;

        this.preProductId = this.newestProductId;
        this.url = this.constructUrl();

        this.toggleShow();

        if (this.url) {
          this.fetchContent(this.url);
        } else {
          this.toggleShow(false);
        }
      }

      /**
       * 获取最新的产品 id
       * @returns {any|null}
       */
      getNewestProductId() {
        const recentlyViewedProductIds =
          webvista.retrieveData(RECENTLY_VIEWED_KEY) || [];
        if (recentlyViewedProductIds.length === 0) return null;

        return recentlyViewedProductIds.pop();
      }

      /**
       * 构造 url
       * @returns {string|null}
       */
      constructUrl() {
        let url = this.dataset.url;
        if (!url) return null;

        return `${url}&product_id=${this.newestProductId}`;
      }

      /**
       * 获取动态推荐产品
       */
      fetchContent(url) {
        if (this.fetchController) this.fetchController.abort();
        this.fetchController = new AbortController();
        const signal = this.fetchController.signal;

        webvista
          .fetchHtml(url, signal)
          .then((html) => {
            const sourceRecommendationMain = html.querySelector(
              `#${this.id} .recommendation-main`,
            );

            if (sourceRecommendationMain) {
              this.innerHTML = sourceRecommendationMain.outerHTML;

              // 加载完成状态
              webvista.initLazyImages();
              webvista.initTooltips();
            } else {
              this.toggleShow(false);
            }
          })
          .catch((error) => {
            this.toggleShow(false);
          });
      }

      /**
       * 切换显示状态
       * @param show
       */
      toggleShow(show = true) {
        if (show) {
          // 先显示占位
          this.placeholderTemplate =
            this.placeholderTemplate ||
            this.querySelector(`#Placeholder-Template-${this.section}`);

          this.replaceChildren(
            this.placeholderTemplate.content.cloneNode(true),
          );
        }

        this.setAttribute("aria-hidden", !show);
        this.classList.toggle("hide", !show);
      }

      /**
       * 终止请求
       */
      abortFetch() {
        if (this.fetchController) this.fetchController.abort();
      }
    },
  );
}
