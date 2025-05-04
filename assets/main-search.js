//执行普通搜索
class SearchForm extends HTMLElement {
  connectedCallback() {
    this.input = this.querySelector('input[type="search"]');
    this.resetButton = this.querySelector('button[type="reset"]');
    if (!this.input) return;

    // 重置内容
    this.input.form.addEventListener("reset", this.onFormReset.bind(this));

    //监听input事件
    this.input.addEventListener(
      "input",
      webvista.debounce((event) => {
        this.onChange(event);
      }, 300),
    );

    // 弹出搜索容器
    if (this.hasAttribute("data-pop-panel")) {
      this.input.addEventListener("focusin", this.onFocusin.bind(this));
      this.addEventListener("focusout", this.onFocusout.bind(this));
    }
  }

  /**
   * 重置按钮 切换显示状态
   */
  toggleResetButton() {
    const resetIsHidden = this.resetButton.classList.contains("hidden");
    if (this.input.value.length > 0 && resetIsHidden) {
      this.resetButton.classList.remove("hidden");
    } else if (this.input.value.length === 0 && !resetIsHidden) {
      this.resetButton.classList.add("hidden");
    }
  }

  onChange() {
    this.toggleResetButton();
  }

  /**
   * 重置表单
   * @param event
   */
  onFormReset(event) {
    // Prevent default so the form reset doesn't set the value gotten from the url on page load
    event.preventDefault();

    this.input.value = "";
    this.input.focus();

    // js 修改 input.value 不会触发 input 事件，需要手动触发
    this.input.dispatchEvent(
      new Event("input", {
        bubbles: true,
        cancelable: true,
      }),
    );
    this.toggleResetButton();
  }

  /**
   * 输入框获取焦点
   */
  onFocusin() {
    this.classList.add("in-focus");
    this.isOpen = true;
    this.input.setAttribute("aria-expanded", "true");

    // 激活 header，如果 header 是透明背景，可使其显示背景颜色
    this.toggleHeaderActive(true);
  }

  /**
   * Search 失去焦点
   */
  onFocusout() {
    // 需要异步获取最新的焦点元素，因为焦点有延迟
    setTimeout(() => {
      if (this.contains(document.activeElement)) return;

      this.classList.remove("in-focus");
      this.isOpen = false;
      this.input.setAttribute("aria-expanded", "false");

      this.toggleHeaderActive(false);
    });
  }

  /**
   * 切换页眉状态
   * @param active
   */
  toggleHeaderActive(active = true) {
    this.header = this.header || this.closest(".section-header");
    if (this.header) this.header.classList.toggle("header--is-active", active);
  }
}

customElements.define("search-form", SearchForm);

/**
 * 主搜索类
 * 承担同步的作用，当一个页面有其它的搜索组件的时候，同步搜索内容
 */
class MainSearch extends SearchForm {
  connectedCallback() {
    super.connectedCallback();

    this.allSearchInputs = document.querySelectorAll('input[type="search"]');
  }

  onFormReset(event) {
    super.onFormReset(event);

    this.keepInSync("", this.input);
  }

  /**
   * input 输入变化
   * @param event
   */
  onChange(event) {
    super.onChange();

    this.keepInSync(event.target.value, this.input);
  }

  /**
   * 同步搜索
   * @param value
   * @param from
   */
  keepInSync(value, from) {
    this.allSearchInputs.forEach((input) => {
      if (input !== from) input.value = value;
    });
  }
}

customElements.define("main-search", MainSearch);

/**
 * 预测搜索
 */
class PredictiveSearch extends SearchForm {
  constructor() {
    super();
    this.cachedResults = {};
    // 查询关键词
    this.searchTerm = "";

    this.isOpen = false;
  }

  connectedCallback() {
    super.connectedCallback();

    this.searchResultsWrapper = this.querySelector(".search-results-wrapper"); // 内容容器
    this.allPredictiveSearchInstances =
      document.querySelectorAll("predictive-search"); // 页面内所有预测搜索实例，方便同步结果

    // 热门搜索
    this.querySelectorAll(".popular-searches a").forEach((suggestion) => {
      suggestion.addEventListener(
        "click",
        this.onPopularKeywordClick.bind(this),
      );
    });

    // 终止操作
    this.abortController = new AbortController();
  }

  disconnectedCallback() {
    this.abortController.abort();
  }

  /**
   * 获取输入框内容
   * @returns {string}
   */
  getQuery() {
    return this.input.value.trim();
  }

  /**
   * 处理输入框内容变化
   */
  onChange() {
    super.onChange();

    const currentSearchTerm = this.getQuery();
    if (currentSearchTerm === this.searchTerm) return;
    this.searchTerm = currentSearchTerm;

    if (this.searchTerm.length <= 0) return this.closeResults(true);

    this.showPlaceholder(); // 显示占位符
    this.getSearchResults(); // 获取搜索结果
  }

  /**
   * 关键词点击
   */
  onPopularKeywordClick(event) {
    event.preventDefault(); // 阻止默认的a链接

    const keyword = event.currentTarget.getAttribute("data-keyword");
    if (keyword !== "") {
      this.input.value = keyword;

      this.input.focus();

      // js 修改 input.value 不会触发 input 事件，需要手动触发
      this.input.dispatchEvent(
        new Event("input", {
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  }

  onFormReset(event) {
    super.onFormReset(event);

    this.searchTerm = "";
    this.abortController.abort();
    this.abortController = new AbortController();
    this.closeResults(true);
  }

  /**
   * Search 获得焦点
   */
  onFocusin() {
    super.onFocusin();

    // 显示搜索数据，需要重新获取关键词，搜索词可能会变化
    const currentSearchTerm = this.getQuery();
    if (!currentSearchTerm && currentSearchTerm === this.searchTerm) return;

    if (this.searchTerm !== currentSearchTerm) {
      // Search term was changed from other search input, treat it as a user change
      this.onChange();
    } else if (this.getAttribute("results") === "true") {
      // 显示结果
      this.showResults();
    } else {
      // 重新搜索
      this.getSearchResults();
    }
  }

  /**
   * 显示 placeholder 占位
   * 当重新搜索的时候显示
   */
  showPlaceholder() {
    this.placeholder =
      this.placeholder ||
      this.querySelector(`#Placeholder-Search-Form-${this.dataset.section}`)
        .innerHTML;
    this.searchResultsWrapper.innerHTML = this.placeholder;
  }

  /**
   * 获取搜索结果
   * 使用缓存数据，提高效率
   */
  getSearchResults() {
    const queryKey = this.searchTerm.replace(" ", "-").toLowerCase();
    this.setLiveRegionLoading();

    // 有缓存数据 直接使用
    if (this.cachedResults[queryKey])
      return this.renderSearchResults(this.cachedResults[queryKey]);

    webvista
      .fetchHtml(
        `${window["routes"]["predictive_search_url"]}?q=${encodeURIComponent(this.searchTerm)}&section_id=predictive-search`,
        this.abortController.signal,
      )
      .then((html) => {
        const shopifySection = html.querySelector(".shopify-section");
        let resultsMarkup = shopifySection ? shopifySection.innerHTML : "";
        if (!resultsMarkup) throw new Error("No search results found");

        resultsMarkup = this.preventDuplicatedIDs(resultsMarkup); // 防止id重复

        // 同步结果
        this.allPredictiveSearchInstances.forEach(
          (predictiveSearchInstance) => {
            predictiveSearchInstance.cachedResults[queryKey] = resultsMarkup;
          },
        );

        this.renderSearchResults(resultsMarkup);
      })
      .catch((error) => {
        if (error?.code === 20) {
          // Code 20 means the call was aborted
          return;
        }

        this.removeAttribute("loading");
        this.searchResultsWrapper.innerHTML = " ";
        this.removeAttribute("results");
      });
  }

  /**
   * 渲染搜索结果
   * @param resultsHtml
   */
  renderSearchResults(resultsHtml) {
    this.searchResultsWrapper.innerHTML = resultsHtml;
    this.setAttribute("results", "true");

    this.setLiveRegionResults();
    this.showResults();

    webvista.initLazyImages();
    webvista.initTooltips();
  }

  /**
   * 获取预测搜索结果的容器最大高度
   * @returns {*|boolean|number}
   */
  getResultsMaxHeight() {
    this.resultsMaxHeight =
      window.innerHeight -
      this.querySelector(".predictive-search-main").getBoundingClientRect()
        .top -
      32;

    return this.resultsMaxHeight;
  }

  /**
   * 显示预测搜索内容
   * open 属性控制显示与隐藏
   */
  showResults() {
    this.style.setProperty(
      "--result-max-height",
      `${this.resultsMaxHeight || this.getResultsMaxHeight()}px`,
    );
    this.setAttribute("open", "true");
  }

  /**
   * 关闭预测结果
   * 如果不清除搜索数据，下次打开将直接显示上次的搜索数据
   * open 属性控制结果容器的显示与隐藏，results 属性控制数据是否存在
   * @param clearSearchTerm 清楚搜索数据
   */
  closeResults(clearSearchTerm = false) {
    if (clearSearchTerm) {
      this.input.value = "";
      this.searchResultsWrapper.innerHTML = " "; // leave a space to avoid display none
      this.removeAttribute("results");
    }

    this.removeAttribute("loading");
    this.removeAttribute("open");

    this.resultsMaxHeight = false;
    this.style.removeProperty("--result-max-height");
  }

  /**
   * 防止 id 重复
   * @param html
   * @returns {*}
   */
  preventDuplicatedIDs(html) {
    if (!this.id) return html;

    // 使用正则表达式匹配 id、aria-controls 和 aria-labelledby 属性
    return html.replace(
      /(id|aria-controls|aria-labelledby)="([^"]+)"/g,
      (match, attr, value) => {
        return `${attr}="${value}_${this.id}"`;
      },
    );
  }

  /**
   * loading 状态
   */
  setLiveRegionLoading() {
    this.statusElement =
      this.statusElement || this.querySelector(".predictive-search-status");
    this.loadingText =
      this.loadingText || this.getAttribute("data-loading-text");
    this.setAttribute("loading", "true");
    this.setLiveRegionText(this.loadingText);
  }

  /**
   * 辅助设备显示搜索结果
   */
  setLiveRegionResults() {
    this.removeAttribute("loading");
    this.setLiveRegionText(
      this.querySelector("[data-predictive-search-live-region-count-value]")
        .textContent,
    );
  }

  /**
   * 辅助设备 搜索状态显示
   * @param statusText
   */
  setLiveRegionText(statusText) {
    this.statusElement.setAttribute("aria-hidden", "false");
    this.statusElement.textContent = statusText;

    setTimeout(() => {
      this.statusElement.setAttribute("aria-hidden", "true");
    }, 1000);
  }
}

customElements.define("predictive-search", PredictiveSearch);
