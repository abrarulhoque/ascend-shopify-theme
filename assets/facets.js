class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();

    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

    this.debouncedOnSubmit = webvista.debounce((event) => {
      this.onSubmitHandler(event);
    }, 500);

    // 监听第一个form， 每一个facet-filters-form元素只有一个form
    const facetForm = this.querySelector("form");
    facetForm.addEventListener("change", this.debouncedOnSubmit.bind(this));

    // 监听键盘ESCAPE事件，关闭展开
    this.addEventListener("keyup", webvista.onKeyUpEscape);
  }

  /**
   * 监听浏览器搜索历史变化事件
   */
  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state
        ? event.state.searchParams
        : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;

      FacetFiltersForm.renderPage(searchParams, null, false);
    };

    window.addEventListener("popstate", onHistoryChange);
  }

  /**
   * 渲染页面
   * @param searchParams 查询参数，由筛选和排序构成
   * @param event
   * @param updateURLHash
   */
  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;

    const sections = FacetFiltersForm.getSections(); // 获取重新渲染区域【产品网格】
    const contentContainer = document
      .getElementById("Product-Grid-Container")
      .querySelector(".content-list");
    if (contentContainer) contentContainer.classList.add("loading");

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = (element) => element.url === url;

      // 判断是否加载缓存
      FacetFiltersForm.filterData.some(filterDataUrl)
        ? FacetFiltersForm.renderSectionFromCache(filterDataUrl, event) // 加载缓存
        : FacetFiltersForm.renderSectionFromFetch(url, event); // 重新fetch数据
    });

    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams); // 修改浏览器历史地址
  }

  /**
   * 异步获取搜索结果
   * @param url
   * @param event
   */
  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Network response was not ok: ${response.statusText}`,
          );
        }
        return response.text();
      })
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [
          ...FacetFiltersForm.filterData,
          { html, url },
        ];

        FacetFiltersForm.renderFacets(html, event); // 渲染过滤器
        FacetFiltersForm.renderProductGridContainer(html); // 渲染产品网格
        FacetFiltersForm.renderProductCount(html); // 渲染查询的产品总数
      })
      .catch((error) => {
        webvista.popToast(window["accessibilityStrings"]["unknownError"], "error");
      });
  }

  /**
   * 缓存获取结果
   * @param filterDataUrl
   * @param event
   */
  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;

    FacetFiltersForm.renderFacets(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderProductCount(html);
  }

  /**
   * 渲染产品网格
   * @param html
   */
  static renderProductGridContainer(html) {
    const targetProductContainer = document.getElementById(
      "Product-Grid-Container",
    );
    if (!targetProductContainer) return false;

    const parsedDocument = new DOMParser().parseFromString(
      html,
      "text/html",
    );
    const sourceProductContainer = parsedDocument.getElementById(
      "Product-Grid-Container",
    );

    if (!sourceProductContainer) return false;

    targetProductContainer.innerHTML = sourceProductContainer.innerHTML;

    if (typeof initializeScrollAnimationTrigger === "function") {
      initializeScrollAnimationTrigger(targetProductContainer);
    }

    webvista.initLazyImages();
    webvista.initTooltips();
  }

  /**
   * 修改查询的产品总数
   * 分为【垂直布局】情况和【水平 + 抽屉】情况
   * @param html
   */
  static renderProductCount(html) {
    const countIds = [
      "ProductCountVertical",
      "Product-Count-Horizontal-And-Drawer",
    ];
    const htmlDocument = new DOMParser().parseFromString(html, "text/html");
    countIds.forEach((id) => {
      const source = htmlDocument.getElementById(id);
      const target = document.getElementById(id);
      if (source && target) target.outerHTML = source.outerHTML;
    });
  }

  /**
   * 渲染筛选和排序
   * @param html
   * @param event
   */
  static renderFacets(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, "text/html");
    const selectors = [
      "#Facet-Horizontal-Wrapper",
      "#Facet-Vertical-Wrapper",
      "#Facet-Drawer-Opener-Wrapper",
      "#Facet-Drawer-Wrapper",
    ];

    selectors.forEach((selector) => {
      const target = document.querySelector(selector);
      const source = parsedHTML.querySelector(selector);
      if (!target || !source) return;

      if (event && target.contains(event.target)) {
        const matchesIndex = (element) => {
          const facetItem = event
            ? event.target.closest(".facet-item")
            : undefined;
          return facetItem
            ? element.dataset.index === facetItem.dataset.index
            : false;
        };

        // 渲染激活选项
        const facetActiveSource = source.querySelector(".facets-active");
        const facetActiveTarget = target.querySelector(".facets-active");
        if (facetActiveSource && facetActiveTarget)
          facetActiveTarget.innerHTML = facetActiveSource.innerHTML;

        // 渲染过滤器
        const facets = Array.from(source.querySelectorAll(".facet-item"));

        // 非当前过滤器
        facets
          .filter((facet) => !matchesIndex(facet))
          .forEach((facet) => {
            if (!facet.hasAttribute("data-index")) return;

            const targetFacet = target.querySelector(
              `.facet-item[data-index="${facet.getAttribute("data-index")}"]`,
            );
            if (targetFacet) targetFacet.outerHTML = facet.outerHTML;
          });

        // 当前过滤器
        const currentFacet = facets.find((facet) => matchesIndex(facet));
        if (!currentFacet) return;

        const targetFacet = target.querySelector(
          `.facet-item[data-index="${currentFacet.getAttribute("data-index")}"]`,
        );
        if (targetFacet)
          targetFacet.querySelector(".facets-selected").innerHTML =
            currentFacet.querySelector(".facets-selected").innerHTML;
      } else {
        if (source) target.innerHTML = source.innerHTML;
      }
    });
  }

  /**
   * 更新浏览器的历史记录
   * 而不会触发页面的重新加载
   * @param searchParams 搜索参数
   */
  static updateURLHash(searchParams) {
    history.pushState(
      { searchParams },
      "",
      `${window.location.pathname}${searchParams && "?".concat(searchParams)}`,
    );
  }

  /**
   * 获取需要重新渲染的Sections
   * @returns {[{section: string}]}
   */
  static getSections() {
    return [
      {
        section: document.getElementById("Paginate-Content").dataset.section,
      },
    ];
  }

  /**
   * 构造请求参数
   * @param form
   * @returns {string}
   */
  createSearchParams(form) {
    const formData = new FormData(form);

    return new URLSearchParams(formData).toString();
  }

  /**
   * 提交表单
   * @param searchParams
   * @param event
   */
  onSubmitForm(searchParams, event) {
    FacetFiltersForm.renderPage(searchParams, event);
  }

  /**
   * 监听筛选和排序处理函数
   * @param event
   */
  onSubmitHandler(event) {
    event.preventDefault();

    const form = this.querySelector("form");
    this.onSubmitForm(this.createSearchParams(form), event); // 组合所有表格的查询，提交
  }

  /**
   * 已选选项，点击事件处理
   * @param event
   */
  onActiveFilterClick(event) {
    event.preventDefault();

    const url =
      event.currentTarget.href.indexOf("?") === -1
        ? ""
        : event.currentTarget.href.slice(
            event.currentTarget.href.indexOf("?") + 1,
          );
    FacetFiltersForm.renderPage(url, null);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define("facet-filters-form", FacetFiltersForm);

FacetFiltersForm.setListeners();

class PriceRange extends HTMLElement {
  constructor() {
    super();

    this.rangeMin = this.querySelector("input.range-min");
    this.rangeMax = this.querySelector("input.range-max");
    this.inputMin = this.querySelector("input.input-min");
    this.inputMax = this.querySelector("input.input-max");
    this.minValue = this.querySelector(".value-min");
    this.maxValue = this.querySelector(".value-max");

    this.rangeMin.addEventListener("input", this.onInputMinChange.bind(this));
    this.rangeMax.addEventListener("input", this.onInputMaxChange.bind(this));

    this.setProgressMin();
    this.setProgressMax();
  }

  onInputMinChange(event) {
    event.stopPropagation();

    if (parseInt(this.rangeMin.value) >= parseInt(this.rangeMax.value))
      return (this.rangeMin.value = this.rangeMax.value);

    this.inputMin.value = this.rangeMin.value;
    this.setProgressMin();
  }

  onInputMaxChange(event) {
    event.stopPropagation();

    if (parseInt(this.rangeMax.value) <= parseInt(this.rangeMin.value))
      return (this.rangeMax.value = this.rangeMin.value);

    this.inputMax.value = this.rangeMax.value;
    this.setProgressMax();
  }

  setProgressMin() {
    this.minValue.innerText = this.rangeMin.value;
    this.style.setProperty(
      "--start",
      `${((this.rangeMin.value - this.rangeMin.min) * 100) / (this.rangeMin.max - this.rangeMin.min)}%`,
    );
  }

  setProgressMax() {
    this.maxValue.innerText = this.rangeMax.value;
    this.style.setProperty(
      "--end",
      `${((this.rangeMax.value - this.rangeMin.min) * 100) / (this.rangeMin.max - this.rangeMin.min)}%`,
    );
  }
}

customElements.define("price-range", PriceRange);

class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const facetLink = this.querySelector("a");
    facetLink.setAttribute("role", "button");
    facetLink.addEventListener("click", this.closeFilter.bind(this));
    facetLink.addEventListener("keyup", (event) => {
      event.preventDefault();

      if (event.code && event.code.toUpperCase() === "SPACE")
        this.closeFilter(event);
    });
  }

  closeFilter(event) {
    event.preventDefault();

    const form =
      this.closest("facet-filters-form") ||
      document.querySelector("facet-filters-form");
    form.onActiveFilterClick(event);
  }
}

customElements.define("facet-remove", FacetRemove);
