if (!customElements.get("recently-viewed-products")) {
  customElements.define(
    "recently-viewed-products",
    class RecentlyViewedProducts extends HTMLElement {
      constructor() {
        super();

        this.container = this.querySelector(".products-container");
        this.productIds = [];
        const url = this.constructQueryUrl();
        if (!url) return this.remove();

        this.observer = new IntersectionObserver(
          (entries, observer) => {
            if (!entries[0].isIntersecting) return;
            observer.disconnect();

            this.fetchData(url);
          },
          { rootMargin: "0px 0px 400px 0px" },
        );

        this.observer.observe(this);
      }

      disconnectedCallback() {
        if (this.observer) this.observer.disconnect();
      }

      fetchData(url) {
        webvista.fetchHtml(url).then(html=>{
          this.renderHtml(html);
        }).catch((error) => {
          this.remove();
        });
      }

      renderHtml(html) {
        const sourceRecentlyViewedMain = html.querySelector(
          "template"
        ).content;

        if (sourceRecentlyViewedMain) {
          // 处理排序
          const itemListWrapper =
            sourceRecentlyViewedMain.querySelector(".slider-wrapper");
          const fragment = document.createDocumentFragment();
          this.productIds.forEach((id) => {
            const item = itemListWrapper.querySelector(
              `li[data-product-id="${id}"]`,
            );
            if (item) {
              fragment.appendChild(item);
            }
          });

          // 清空父容器并重新插入排序后的元素
          itemListWrapper.innerHTML = "";
          itemListWrapper.appendChild(fragment);

          this.container.innerHTML = '';
          this.container.append(sourceRecentlyViewedMain);

          // 加载完成状态
          webvista.initLazyImages();
          webvista.initTooltips();
        } else {
          this.remove();
        }
      }

      constructQueryUrl() {
        const limit = parseInt(this.dataset.limit) || 5;

        this.productIds =
          webvista
            .retrieveData(RECENTLY_VIEWED_KEY)
            ?.slice(-limit)
            ?.reverse() ?? [];

        if (!this.productIds || this.productIds.length <= 0) return null;

        const baseUrl = this.dataset.searchUrl;
        const query = this.productIds.map((id) => `id:${id}`).join(" OR ");
        const params = new URLSearchParams({
          q: query,
          type: "product",
          section_id: this.dataset.section,
          ose: "false",
        });
        return `${baseUrl}?${params.toString()}`;
      }
    },
  );
}
