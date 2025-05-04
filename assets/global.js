const ON_CHANGE_DEBOUNCE_TIMER = 300;
const RECENTLY_VIEWED_KEY = "recently-viewed"; // 最近浏览

const PUB_SUB_EVENTS = {
  cartUpdate: "cart-update", // 购物车更新
  quantityUpdate: "quantity-update", // 产品页面产品数量更新
  variantChange: "variant-change", // 产品页面产品变体变化
  cartError: "cart-error", // 购物车错误
  wishUpdated: "wish-updated", // 更新心愿单，包括删除或者添加
};

const webvista = (function () {
  // 私有常量
  const SCROLL_LOCK_ATTR = "scroll-y-off";
  const FOCUS_VISIBLE_KEYS = [
    "ARROWUP",
    "ARROWDOWN",
    "ARROWLEFT",
    "ARROWRIGHT",
    "TAB",
    "ENTER",
    "SPACE",
    "ESCAPE",
    "HOME",
    "END",
    "PAGEUP",
    "PAGEDOWN",
  ];
  const NO_DECIMAL_CURRENCIES = [
    "JPY",
    "KRW",
    "VND",
    "IDR",
    "CLP",
    "COP",
    "PYG",
    "UGX",
    "ISK",
    "HUF",
    "RWF",
    "BIF",
    "DJF",
    "GNF",
    "KMF",
    "XAF",
    "XOF",
    "XPF",
  ];

  // 私有变量
  const trapFocusHandlers = {};
  let currentFocusedElement = null;
  let mouseClick = null;
  let subscribers = {};

  // 私有方法
  function focusVisiblePolyfill() {
    window.addEventListener("keydown", (event) => {
      if (FOCUS_VISIBLE_KEYS.includes(event.code.toUpperCase())) {
        mouseClick = false;
      }
    });

    window.addEventListener("mousedown", () => {
      mouseClick = true;
    });

    window.addEventListener(
      "focus",
      () => {
        if (currentFocusedElement) {
          currentFocusedElement.classList.remove("focused");
        }

        if (mouseClick) return;

        currentFocusedElement = document.activeElement;
        currentFocusedElement.classList.add("focused");
      },
      true,
    );
  }

  function loadingImage(image) {
    if (image.hasAttribute("data-srcset")) {
      image.setAttribute("srcset", image.dataset.srcset);
      image.removeAttribute("data-srcset");
      image.onload = () => image.classList.add("image-lazy-loaded");
    } else if (!image.onload) {
      image.classList.add("image-lazy-loaded");
    }
  }

  function moveTooltip(event, tooltip) {
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY - 16}px`;
  }

  /**
   * 计算元素可见比例
   */
  function percentageSeen(element) {
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const elemTop = element.getBoundingClientRect().top + scrollY;
    const elemHeight = element.offsetHeight;

    if (elemTop > scrollY + viewportHeight) return 0;
    if (elemTop + elemHeight < scrollY) return 100;

    const distance = scrollY + viewportHeight - elemTop;
    return (distance / ((viewportHeight + elemHeight) / 100)).toFixed(2);
  }

  /**
   * 随机生成区间范围的数字
   * @param min
   * @param max
   * @returns {*}
   */
  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  return {
    /**
     * 防抖函数
     * @param {Function} fn 要执行的函数
     * @param {number} wait 等待毫秒数
     * @returns {Function} 防抖后的函数
     */
    debounce: function (fn, wait) {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), wait);
      };
    },

    /**
     * 节流函数
     * @param {Function} fn 要执行的函数
     * @param {number} delay 延迟毫秒数
     * @returns {Function} 节流后的函数
     */
    throttle: function (fn, delay) {
      let lastCallTime = 0;
      return function (...args) {
        const now = Date.now();
        if (now - lastCallTime < delay) return;
        lastCallTime = now;
        return fn.apply(this, args);
      };
    },

    /**
     * 订阅事件
     * @param eventName
     * @param callback
     * @returns {(function(): void)|*}
     */
    subscribe: function (eventName, callback) {
      if (subscribers[eventName] === undefined) {
        subscribers[eventName] = [];
      }

      subscribers[eventName] = [...subscribers[eventName], callback];

      return () => {
        subscribers[eventName] = subscribers[eventName].filter(
          (cb) => cb !== callback,
        );
      };
    },

    /**
     * 发布事件
     * @param eventName
     * @param data
     */
    publish: function (eventName, data) {
      if (subscribers[eventName]) {
        subscribers[eventName].forEach((callback) => {
          callback(data);
        });
      }
    },

    /**
     * 获取fetch配置
     * @param {string} [type="json"] 响应类型
     * @param {string} [method="POST"] HTTP方法
     * @returns {Object} fetch配置对象
     */
    fetchConfig: function (type = "json", method = "POST") {
      return {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Accept: `application/${type}`,
        },
      };
    },

    /**
     * 内容请求
     * @param url
     * @param signal
     * @returns {Promise<Document>}
     */
    fetchHtml: async function (url, signal = null) {
      const fetchOptions = signal ? { signal } : {};
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(
          `HTTP error! Status: ${response.status} ${response.statusText}`,
        );
      }

      const text = await response.text();
      return new DOMParser().parseFromString(text, "text/html");
    },

    /**
     * 判断是否为数字
     * @param {any} value 要检查的值
     * @returns {boolean} 是否为有效数字
     */
    isNumeric: function (value) {
      if (typeof value === "number" && !isNaN(value)) return true;
      if (typeof value === "string" && value.trim() !== "") {
        return !isNaN(Number(value));
      }
      return false;
    },

    /**
     * 格式化货币金额
     * @param {number} [amount=0] 金额(扩大100倍后的值)
     * @param {string} currency 货币代码
     * @returns {string|undefined} 格式化后的金额字符串
     */
    formatPriceAmount: function (amount = 0, currency) {
      if (!window["priceFormatTemplate"] || !currency) return;

      const value = amount / 100;
      const hasNoDecimals = NO_DECIMAL_CURRENCIES.includes(currency);

      const locale = currency === 'EUR' ? 'de-DE' : undefined;
      const price = value.toLocaleString(locale, {
        minimumFractionDigits: hasNoDecimals ? 0 : 2,
        maximumFractionDigits: hasNoDecimals ? 0 : 2,
      });

      return window["priceFormatTemplate"].replace(/0([,.]0{0,2})?/, price);
    },

    /**
     * 向下取整到指定倍数
     * @param {number} n 原始数值
     * @param {number} x 倍数
     * @returns {number} 取整后的值
     */
    floorToMultiple: function (n, x) {
      return Math.floor(n / x) * x;
    },

    /**
     * 向上取整到指定倍数
     * @param {number} n 原始数值
     * @param {number} x 倍数
     * @returns {number} 取整后的值
     */
    ceilToMultiple: function (n, x) {
      return Math.ceil(n / x) * x;
    },

    /**
     * 禁用页面滚动
     * 模拟页面滚动位置
     */
    disablePageScroll: function () {
      // 判断是否已经禁用
      if (document.body.hasAttribute(SCROLL_LOCK_ATTR)) return;

      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      document.body.style.top = -scrollTop + "px";
      document.body.setAttribute(SCROLL_LOCK_ATTR, "true");
    },

    /**
     * 重新启用页面滚动
     * 前提是页面滚动被disablePageScroll禁用
     */
    enablePageScroll: function () {
      if (!document.body.hasAttribute(SCROLL_LOCK_ATTR)) return;

      const scrollPosition = -parseInt(document.body.style.top, 10);
      document.body.style.top = null;
      document.body.removeAttribute(SCROLL_LOCK_ATTR);

      requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
    },

    /**
     * 获取可聚焦元素
     */
    getFocusableElements: function (container, filter_invisible = true) {
      let list = Array.from(
        container.querySelectorAll(
          "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe",
        ),
      );

      if (filter_invisible) {
        list = list.filter((element) => element.offsetParent !== null);
      }

      return list;
    },

    /**
     * 设置焦点陷阱
     */
    trapFocus: function (container, elementToFocus) {
      if (!container) return;

      const trap = container.hasAttribute("data-trap")
        ? container
        : container.querySelector("[data-trap]");
      if (!trap) return;

      const elements = this.getFocusableElements(trap);
      if (elements.length <= 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];
      elementToFocus = elementToFocus || trap;

      this.removeTrapFocus();

      trapFocusHandlers.focusin = (event) => {
        if (
          event.target !== trap &&
          event.target !== last &&
          event.target !== first
        )
          return;
        document.addEventListener("keydown", trapFocusHandlers.keydown);
      };

      trapFocusHandlers.focusout = function () {
        document.removeEventListener("keydown", trapFocusHandlers.keydown);
      };

      trapFocusHandlers.keydown = function (event) {
        if (event.code && event.code.toUpperCase() !== "TAB") return;

        if (event.target === last && !event.shiftKey) {
          event.preventDefault();
          first.focus();
        } else if (
          (event.target === trap || event.target === first) &&
          event.shiftKey
        ) {
          event.preventDefault();
          last.focus();
        }
      };

      document.addEventListener("focusin", trapFocusHandlers.focusin);
      document.addEventListener("focusout", trapFocusHandlers.focusout);

      elementToFocus.focus();

      if (
        elementToFocus.tagName === "INPUT" &&
        ["search", "text", "email", "url"].includes(elementToFocus.type) &&
        elementToFocus.value
      ) {
        elementToFocus.setSelectionRange(
          elementToFocus.value.length,
          elementToFocus.value.length,
        );
      }
    },

    /**
     * 移除焦点陷阱
     */
    removeTrapFocus: function (elementToFocus = null) {
      document.removeEventListener("focusin", trapFocusHandlers.focusin);
      document.removeEventListener("focusout", trapFocusHandlers.focusout);
      document.removeEventListener("keydown", trapFocusHandlers.keydown);

      if (!elementToFocus) return;

      if (elementToFocus.closest("[data-trap]")) {
        this.trapFocus(elementToFocus.closest("[data-trap]"), elementToFocus);
      } else {
        elementToFocus.focus();
      }
    },

    /**
     * 初始化focus-visible polyfill
     */
    initFocusVisible: function () {
      try {
        document.querySelector(":focus-visible");
      } catch (e) {
        focusVisiblePolyfill();
      }
    },

    /**
     * 关闭所有视频播放
     * @param {HTMLElement|Document} dom 指定的Dom节点内
     */
    pauseAllMedia: function (dom = document) {
      dom.querySelectorAll(".js-youtube").forEach((video) => {
        video.contentWindow.postMessage(
          '{"event":"command","func":"pauseVideo","args":""}',
          "*",
        );
      });
      dom.querySelectorAll(".js-vimeo").forEach((video) => {
        video.contentWindow.postMessage('{"method":"pause"}', "*");
      });
      dom.querySelectorAll("video").forEach((video) => video.pause());

      dom.querySelectorAll("product-model").forEach((model) => {
        if (model.modelViewerUI) model.modelViewerUI.pause();
      });
    },

    /**
     * 播放所有视频
     * @param {HTMLElement|Document} [dom=document] - 指定的Dom节点内
     */
    playAllMedia: function (dom = document) {
      dom.querySelectorAll(".js-youtube").forEach((video) => {
        video.contentWindow.postMessage(
          '{"event":"command","func":"playVideo","args":""}',
          "*",
        );
      });
      dom.querySelectorAll(".js-vimeo").forEach((video) => {
        video.contentWindow.postMessage('{"method":"play"}', "*");
      });
      dom.querySelectorAll("video").forEach((video) => video.play());
    },

    /**
     * 监听ESCAPE按键关闭Details
     * @param {KeyboardEvent} event 键盘事件对象
     */
    onKeyUpEscape: function (event) {
      if (event.code && event.code.toUpperCase() !== "ESCAPE") return;

      const openDetailsElement = event.target.closest("details[open]");
      if (!openDetailsElement) return;

      const summaryElement = openDetailsElement.querySelector("summary");
      openDetailsElement.removeAttribute("open");
      summaryElement.setAttribute("aria-expanded", "false");
      summaryElement.focus();
    },

    /**
     * 设置Cookie
     * @param {string} name Cookie名称
     * @param {string} value Cookie值
     * @param {number} [hoursToExpire=30] 过期时间(小时)
     */
    setCookie: function (name, value, hoursToExpire = 30) {
      const date = new Date();
      date.setTime(date.getTime() + hoursToExpire * 60 * 60 * 1000);
      document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/`;
    },

    /**
     * 获取Cookie值
     * @param {string} name Cookie名称
     * @returns {string|null} Cookie值
     */
    getCookie: function (name) {
      const nameEQ = name + "=";
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) === " ") {
          cookie = cookie.substring(1);
        }
        if (cookie.indexOf(nameEQ) === 0) {
          return decodeURIComponent(cookie.substring(nameEQ.length));
        }
      }
      return null;
    },

    /**
     * 存储数据到LocalStorage
     * @param {string} key 存储键名
     * @param {any} value 存储值
     * @param {number|null} [expirationInMinutes=null] 过期时间(分钟)
     */
    storeData: function (key, value, expirationInMinutes = null) {
      const dataToStore = {
        value: value,
        expiration: expirationInMinutes
          ? Date.now() + expirationInMinutes * 60000
          : null,
      };
      localStorage.setItem(key, JSON.stringify(dataToStore));
    },

    /**
     * 从LocalStorage读取数据
     * @param {string} key 存储键名
     * @returns {any|null} 存储的值或null
     */
    retrieveData: function (key) {
      try {
        const data = localStorage.getItem(key);
        if (!data) return null;

        const dataObj = JSON.parse(data);
        if (!dataObj) return null;

        if (dataObj.expiration === null || Date.now() < dataObj.expiration) {
          return dataObj.value;
        }

        localStorage.removeItem(key);
        return null;
      } catch (e) {
        return null;
      }
    },

    /**
     * 异步等待
     * @param {number} ms 等待毫秒数
     * @returns {Promise<void>}
     */
    sleep: function (ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    /**
     * 数字补零
     * @param {number} num 原始数字
     * @param {number} length 补零后的长度
     * @returns {string} 补零后的字符串
     */
    padNumber: function (num, length) {
      return String(num).padStart(length, "0");
    },

    /**
     * 规范化字符串
     * 1. 使用 'NFD' 方式分解字符
     * 2. 移除所有变音符号
     * 3. 转换为小写
     * @param {string} str 输入字符串
     * @returns {string} 规范化后的字符串
     */
    normalizeString: function (str) {
      return str
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
    },

    /**
     * 检测移动端屏幕
     * @returns {boolean} 是否是移动端(≤749px)
     */
    isMobileScreen: function () {
      return window.matchMedia("(max-width: 749px)").matches;
    },

    /**
     * 检测平板屏幕
     * @returns {boolean} 是否是平板(≤999px)
     */
    isPadScreen: function () {
      return window.matchMedia("(max-width: 999px)").matches;
    },

    /**
     * 初始化图片懒加载
     */
    initLazyImages: function () {
      if (!window["enableLazyImage"]) return;

      const lazyImages = document.querySelectorAll(
        ".image-lazy-loading:not(.image-lazy-loaded)",
      );

      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                loadingImage(entry.target);
                observer.unobserve(entry.target);
              }
            });
          },
          { rootMargin: "0px 0px 400px 0px" },
        );
        lazyImages.forEach((img) => observer.observe(img));
      } else {
        lazyImages.forEach(loadingImage);
      }
    },

    /**
     * 初始化ToolTip
     */
    initTooltips: function () {
      if (this.isMobileScreen()) return;

      const triggers = document.querySelectorAll(
        '[data-toggle="tooltip"]:not([data-tooltip-loaded])',
      );

      const loadTooltip = (trigger) => {
        trigger.addEventListener("mouseenter", () => {
          // 先删除之前的tooltip
          document
            .querySelectorAll(".tool-tip")
            .forEach((element) => element.remove());
          // 新建
          const tooltip = document.createElement("div");
          tooltip.className = "tool-tip";
          tooltip.textContent = trigger.getAttribute("data-title");
          document.body.appendChild(tooltip);

          const onMouseMove = (e) => moveTooltip(e, tooltip);
          const hide = () => {
            tooltip.remove();
            trigger.removeEventListener("mousemove", onMouseMove);
          };

          trigger.addEventListener("mousemove", onMouseMove);
          trigger.addEventListener("mouseleave", hide, { once: true });
          window.addEventListener("scroll", hide, { once: true });
        });
        trigger.setAttribute("data-tooltip-loaded", "true");
      };

      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              loadTooltip(entry.target);
              observer.unobserve(entry.target);
            }
          });
        });
        triggers.forEach((t) => observer.observe(t));
      } else {
        triggers.forEach(loadTooltip);
      }
    },

    /**
     * 初始化滚动协同效果
     */
    initScrollSynergy: function () {
      if (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        this.isMobileScreen()
      )
        return;

      const elements = Array.from(
        document.querySelectorAll(
          ".scroll-synergy:not([data-scroll-synergy-observed])",
        ),
      );

      if (elements.length <= 0) return;

      const elementStates = new WeakMap();

      // 初始化元素状态
      elements.forEach((el) => {
        elementStates.set(el, { prePosition: null, isVisible: false });
      });

      const updateElement = (el) => {
        const percentage = percentageSeen(el);
        const state = elementStates.get(el);
        let position;

        if (percentage <= 0) {
          position = 0;
        } else if (percentage < 30) {
          position = 1;
        } else if (percentage < 100) {
          position = 2;
        } else {
          position = 3;
        }

        // 位置发生改变
        if (state.prePosition !== position) {
          el.classList.remove("synergy-position--1", "synergy-position--2");

          if (position > 0 && position < 3) {
            el.classList.add(`synergy-position--${position}`);
          }

          state.prePosition = position;
        }

        el.style.setProperty("--synergy-ratio", `${percentage}%`);

        if (el.classList.contains("synergy--zoom-in")) {
          el.style.setProperty(
            "--zoom-in-ratio",
            (1 + 0.005 * percentage).toString(),
          );
        } else if (el.classList.contains("synergy--parallax")) {
          el.style.setProperty(
            "--parallax-ratio",
            (percentage / 100).toString(),
          );
        } else if (
          el.classList.contains("synergy--crab-left") ||
          el.classList.contains("synergy--crab-right")
        ) {
          let crabRatio = 0.25 * percentage;
          if (el.classList.contains("synergy--crab-left")) {
            crabRatio *= -1;
          }
          el.style.setProperty("--crab-ratio", `${crabRatio}%`);
        }
      };

      const handleScroll = this.throttle(() => {
        elements.forEach((el) => {
          const state = elementStates.get(el);
          if (state.isVisible) {
            updateElement(el);
          }
        });
      }, 20); // 可以根据需求调节节流时间

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          const state = elementStates.get(el);
          state.isVisible = entry.isIntersecting;
        });
      });

      elements.forEach((element) => {
        observer.observe(element);
        element.setAttribute("data-scroll-synergy-observed", "true");
      });
      window.addEventListener("scroll", handleScroll);
    },

    /**
     * 初始化标题闪烁
     */
    initTitleFlash: function () {
      // 存储原始标题和定时器
      let originalTitle = document.title;
      let alertInterval = null;

      const alertMessage =
        window["accessibilityStrings"]["stillHere"] || "We are still here!";

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          // 用户离开时开始闪烁
          let counter = 0;
          originalTitle = document.title; // 保存当前标题（防止中途被修改）
          alertInterval = setInterval(() => {
            document.title = counter++ % 2 === 0 ? alertMessage : originalTitle;
          }, 5000);
        } else {
          // 用户返回时立即停止并恢复标题
          if (alertInterval) {
            clearInterval(alertInterval);
            alertInterval = null;
            document.title = originalTitle;
          }
        }
      });

      // 页面卸载时清理定时器（防止内存泄漏）
      window.addEventListener("beforeunload", () => {
        if (alertInterval) clearInterval(alertInterval);
      });
    },

    /**
     * 初始化Header高度
     */
    initHeaderHeight: function () {
      const header = document.querySelector("header");
      if (header) {
        const rect = header.getBoundingClientRect();
        document.documentElement.style.setProperty(
          "--header-height",
          `${Math.floor(rect.height)}px`,
        );
        document.documentElement.style.setProperty(
          "--header-bottom",
          `${Math.floor(rect.bottom)}px`,
        );
      }
    },

    /**
     * 弹出消息提示toast
     * @param {string} [message=""] 提示消息
     * @param {string} [type="info"] 类型(info|success|warning|error)
     */
    popToast: function (message = "", type = "info") {
      if (!message) return;

      const toast = document.createElement("div");
      toast.className = `toast type-${type}`;
      toast.setAttribute("aria-role", "alert");
      toast.setAttribute("aria-live", "assertive");
      toast.textContent = message;

      setTimeout(() => toast.remove(), 5000);

      const container = document.getElementById("toasts-container");
      if (container) container.appendChild(toast);
    },

    /**
     * 滚动到指定元素位置
     * @param {HTMLElement} element 目标元素
     * @param {number} [offset=50] 距离顶部的偏移量
     */
    scrollToElementWithOffset: function (element, offset = 50) {
      if (!element) return;

      const elementTop = element.getBoundingClientRect().top + window.scrollY;
      const targetPosition = Math.max(0, elementTop - offset);

      window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      });
    },

    /**
     * 滚动到页眉底部位置
     * @param {HTMLElement} element 目标元素
     * @param {number} [offset=0] 额外偏移量
     */
    scrollElementToHeaderBottom: function (element, offset = 0) {
      const header = document.getElementById("Page-Header");
      if (!header || !element) return;

      const headerBottom = header.getBoundingClientRect().bottom;
      this.scrollToElementWithOffset(
        element,
        Math.max(0, headerBottom) + offset,
      );
    },

    /**
     * 发射彩带特效
     * @param particleRatio
     * @param opts
     */
    confetti: {
      fire: function (particleRatio, opts) {
        const count = 200;
        const defaults = {
          origin: { y: 0.7 },
          zIndex: 999,
        };

        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      },

      cannonConfetti: function () {
        if (typeof confetti === "undefined") return;

        this.fire(0.25, {
          spread: 26,
          startVelocity: 55,
        });
        this.fire(0.2, {
          spread: 60,
        });
        this.fire(0.35, {
          spread: 100,
          decay: 0.91,
          scalar: 0.8,
        });
        this.fire(0.1, {
          spread: 120,
          startVelocity: 25,
          decay: 0.92,
          scalar: 1.2,
        });
        this.fire(0.1, {
          spread: 120,
          startVelocity: 45,
        });
      },

      firework: function () {
        const duration = 1.5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = {
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          zIndex: 999,
        };

        const interval = setInterval(function () {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 150 * (timeLeft / duration);
          // since particles fall down, start a bit higher than random
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          });
        }, 250);
      },

      // 两侧往中间喷
      sideConfetti: function () {
        const star = confetti.shapeFromPath({
          path: "M43.767 59.6698L31.4327 53.1854L19.094 59.6698C14.3183 62.187 8.68819 58.1198 9.60225 52.7741L11.9573 39.0363L1.97805 29.3081C-1.89655 25.5351 0.242508 18.9273 5.60265 18.1492L19.396 16.1429L25.5655 3.64453C27.971 -1.22187 34.901 -1.20781 37.2995 3.64453L43.467 16.1429L57.2604 18.1492C62.6135 18.9265 64.7643 25.5308 60.885 29.3081L50.9057 39.0363L53.2608 52.7741C54.1737 58.1143 48.5592 62.1831 43.767 59.6698Z",
          matrix: [
            0.03597122302158273, 0, 0, 0.03597122302158273, -4.856115107913669,
            -5.071942446043165,
          ],
        });
        const heart = confetti.shapeFromPath({
          path: "M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z",
          matrix: [
            0.03333333333333333, 0, 0, 0.03333333333333333, -5.566666666666666,
            -5.533333333333333,
          ],
        });

        const end = Date.now() + 1000;
        const defaults = {
          particleCount: 3,
          startVelocity: 80,
          spread: 55,
          colors: ["#ffff00", "#bb0000", "#ffffff"],
        };

        (function frame() {
          confetti({
            ...defaults,
            angle: 60,
            origin: { x: 0 },
          });
          confetti({
            ...defaults,
            angle: 60,
            origin: { x: 0 },
            shapes: [star, heart],
            scalar: randomInRange(1, 1.5),
          });

          confetti({
            ...defaults,
            angle: 120,
            origin: { x: 1 },
          });
          confetti({
            ...defaults,
            angle: 120,
            origin: { x: 1 },
            shapes: [star, heart],
            scalar: randomInRange(1, 1.5),
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        })();
      },

      // 彩带洒落
      fallingRibbons: function () {
        const heart = confetti.shapeFromPath({
          path: "M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z",
        });

        const star = confetti.shapeFromPath({
          path: "M43.767 59.6698L31.4327 53.1854L19.094 59.6698C14.3183 62.187 8.68819 58.1198 9.60225 52.7741L11.9573 39.0363L1.97805 29.3081C-1.89655 25.5351 0.242508 18.9273 5.60265 18.1492L19.396 16.1429L25.5655 3.64453C27.971 -1.22187 34.901 -1.20781 37.2995 3.64453L43.467 16.1429L57.2604 18.1492C62.6135 18.9265 64.7643 25.5308 60.885 29.3081L50.9057 39.0363L53.2608 52.7741C54.1737 58.1143 48.5592 62.1831 43.767 59.6698Z",
        });

        const shortRibbon = confetti.shapeFromPath({
          path: "M13.4189 115.023L5.75487 107.359C-1.91777 99.6915 -1.91777 87.277 5.75487 79.6048L13.4189 71.9408C15.9681 69.3892 15.9681 65.2392 13.4166 62.6876L5.75448 55.0236C-1.91816 47.3556 -1.91816 34.9412 5.75448 27.269L16.0021 17.0213C17.9951 15.026 18.4873 11.9913 17.2267 9.46783C15.6127 6.23737 16.9224 2.30808 20.1548 0.692064C23.3787 -0.922386 27.3162 0.38269 28.9302 3.61979C32.7122 11.1862 31.2345 20.2901 25.2521 26.2717L15.0056 36.5193C12.4435 39.0861 12.4525 43.217 15.0056 45.7701L22.6697 53.4365C30.3212 61.0904 30.3212 73.5419 22.6697 81.1911L15.0056 88.8552C12.4435 91.422 12.4525 95.5528 15.0056 98.1059L22.6697 105.772C25.2251 108.325 25.2251 112.47 22.6697 115.023C20.1138 117.579 15.974 117.579 13.4189 115.023Z",
        });

        const longRibbon = confetti.shapeFromPath({
          path: "M15.0039 141.17C13.739 142.435 13.0843 144.049 13.0843 145.793C13.0843 147.538 13.7386 149.195 15.0039 150.416L15.4402 150.896L22.6363 158.092C30.3117 165.768 30.3117 178.198 22.6363 185.874C21.3714 187.139 19.714 187.793 18.0136 187.793C17.141 187.793 16.2687 187.618 15.4398 187.226C14.6988 186.921 14 186.485 13.3898 185.874C10.8597 183.301 10.8597 179.158 13.3898 176.584C15.9629 174.055 15.9629 169.911 13.3898 167.338L5.75741 159.706C2.05 155.999 0 151.07 0 145.793C0 140.559 2.05 135.631 5.75741 131.924L13.3898 124.248C15.9629 121.718 15.9629 117.575 13.3898 115.002L5.75741 107.369C2.05 103.662 0 98.7338 0 93.4565C0 88.2229 2.05 83.2944 5.75741 79.5873L13.3898 71.9112C15.9629 69.3815 15.9629 65.2382 13.3898 62.6651L5.75741 55.0327C2.05 51.3257 0 46.3972 0 41.1198C0 35.8863 2.05 30.9577 5.75741 27.2507L15.4402 17.5695L15.9636 17.0027C17.9703 14.9965 18.4492 11.9871 17.2281 9.4574C15.6148 6.23006 16.9238 2.30468 20.1511 0.691013C23.3785 -0.922656 27.3035 0.386326 28.9175 3.61327C32.7117 11.1586 31.2285 20.2738 25.2535 26.2488L15.0043 36.498C13.7394 37.7628 13.0847 39.3765 13.0847 41.121C13.0847 42.8655 13.739 44.523 15.0043 45.744L15.4406 46.2237L22.6367 53.4198C23.073 53.8561 23.5527 54.3358 23.9882 54.9026C30.2691 62.6221 29.8328 74.0049 22.6367 81.2018L15.0043 88.8342C13.7394 90.099 13.0847 91.7127 13.0847 93.4572C13.0847 95.2018 13.739 96.8592 15.0043 98.0803L15.4406 98.56L22.6367 105.756C30.312 113.432 30.312 125.862 22.6367 133.538L15.4406 140.734L15.0039 141.17Z",
        });

        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        let skew = 1;

        function randomColor() {
          // 定义颜色数组
          const colors = [
            "#ffffff",
            "#e9fa01",
            "#f93963",
            "#0b55e8",
            "#7c0e8f",
          ];
          // 从颜色数组中随机选择一个颜色并返回
          return colors[Math.floor(Math.random() * colors.length)];
        }

        (function frame() {
          const timeLeft = animationEnd - Date.now();
          const ticks = Math.max(200, 500 * (timeLeft / duration));
          skew = Math.max(0.8, skew - 0.001);

          const defaults = {
            particleCount: 1,
            startVelocity: 0,
            ticks: ticks,
            colors: [randomColor()],
            zIndex: 999,
          };

          confetti({
            ...defaults,
            origin: {
              x: Math.random(),
              y: Math.random() * skew - 0.2,
            },
            gravity: randomInRange(0.2, 0.4),
          });

          confetti({
            ...defaults,
            origin: {
              x: Math.random(),
              // since particles fall down, skew start toward the top
              y: 0,
            },
            shapes: [shortRibbon, longRibbon, heart, star],
            gravity: randomInRange(0.4, 0.6),
            scalar: randomInRange(1.5, 2),
            drift: randomInRange(-0.4, 0.4),
          });

          if (timeLeft > 0) {
            requestAnimationFrame(frame);
          }
        })();
      },

      // 封装事件监听逻辑
      setupFreeShippingCelebration: function () {
        let firstTrigger = true,
          hasConfetti = false;

        document.addEventListener("freeShippingUnlocked", (event) => {
          const status = event.detail.status;

          if (status) {
            if (!hasConfetti && !firstTrigger) {
              this.cannonConfetti(0.5, {
                spread: 60,
                angle: 90,
              });
            }
            hasConfetti = true;
          } else {
            hasConfetti = false;
          }

          firstTrigger = false;
        });
      },
    },

    /**
     * 初始化方法
     */
    init: function () {
      this.initTitleFlash();
      this.initHeaderHeight();
      this.initLazyImages();
      this.initTooltips();
      this.initScrollSynergy();
      this.initFocusVisible();
      this.confetti.setupFreeShippingCelebration();
    },
  };
})();

// 自动初始化
document.addEventListener("DOMContentLoaded", () => webvista.init());

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == "undefined") {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (let i = 0, count = selector.options.length; i < count; i++) {
    const option = selector.options[i];
    if (value === option.value || value === option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent("on" + eventName, callback);
};

/**
 * 创建并提交一个表单以发送 POST 请求。
 * 使用此函数可以动态生成和提交表单，
 * 用于发送数据到服务器，适用于不通过<a>标签或JavaScript直接发送POST请求的场景。
 * @param path
 * @param options
 */
Shopify.postLink = function (path, options) {
  options = options || {};
  const method = options["method"] || "post";
  const params = options["parameters"] || {};

  const form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for (let key in params) {
    const hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (
  country_domid,
  province_domid,
  options,
) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);

  if (options && options["hideElement"]) {
    this.provinceContainer = document.getElementById(options["hideElement"]);
  } else {
    this.provinceContainer = document.getElementById(province_domid);
  }

  Shopify.addListener(
    this.countryEl,
    "change",
    Shopify.bind(this.countryHandler, this),
  );
  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    const value = this.countryEl.getAttribute("data-default");

    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    const value = this.provinceEl.getAttribute("data-default");
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    const opt = this.countryEl.options[this.countryEl.selectedIndex];
    const raw = opt.getAttribute("data-provinces");
    const provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length <= 0) {
      this.provinceContainer.style.display = "none";
    } else {
      provinces.forEach((province) => {
        const opt = document.createElement("option");
        opt.value = province[0];
        opt.innerHTML = province[1];
        this.provinceEl.appendChild(opt);
      });

      this.provinceContainer.style.display = "";
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    if (values.length && values.length > 0)
      values.forEach((value) => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.innerHTML = value;
        selector.appendChild(opt);
      });
  },
};

/**
 * Class SectionDynamicUpdate
 * 用于动态更新页面上的特定部分的内容。
 */
class SectionDynamicUpdate {
  /**
   * 解析提供的 HTML 字符串并返回指定选择器的元素的内部 HTML。
   *
   * @param {string} html - 要解析的 HTML 字符串。
   * @param id
   * @param {string} selector - 用于选取 HTML 元素的 CSS 选择器。
   * @returns {string} 匹配元素的内部 HTML，如果没有匹配的元素，则返回空字符串。
   */
  static getSectionInnerHTML(html, id, selector) {
    const dom = new DOMParser().parseFromString(html, "text/html");
    if (!dom) return "";

    const element = dom.querySelector(selector) || dom;
    return element.innerHTML;
  }

  /**
   * 根据提供的 sections 数组和响应内容，更新页面上的相应部分。
   *
   * @param {Array} sections - 包含部分信息的数组，每个部分包括 id, selector 和 section 属性。
   * @param {Object} responseSections - 包含新 HTML 内容的对象，键是 section 名称。
   */
  static updateSections(sections, responseSections) {
    sections.forEach((section) => {
      const elementToReplace =
        document.getElementById(section.id)?.querySelector(section.selector) ||
        document.getElementById(section.id);

      if (elementToReplace)
        elementToReplace.innerHTML = SectionDynamicUpdate.getSectionInnerHTML(
          responseSections[section.section],
          section.id,
          section.selector,
        );
    });

    webvista.initLazyImages();
    if (typeof initializeScrollAnimationTrigger === "function") {
      initializeScrollAnimationTrigger();
    }
    webvista.initTooltips();
  }
}

// 商品数量选择器
class QuantityInput extends HTMLElement {
  quantityUpdateUnsubscriber = undefined;

  constructor() {
    super();
    this.changeEvent = new Event("change", { bubbles: true });

    this.input = this.querySelector("input"); // 输入框
    this.input.addEventListener("change", this.onInputChange.bind(this));

    this.querySelectorAll("button").forEach((button) =>
      button.addEventListener("click", this.onButtonClick.bind(this)),
    );

    this.updateQtyButtonState();
    this.quantityUpdateUnsubscriber = webvista.subscribe(
      PUB_SUB_EVENTS.quantityUpdate,
      this.updateQtyButtonState.bind(this),
    );
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) this.quantityUpdateUnsubscriber();
  }

  /**
   * 处理输入框变化
   * @param event
   */
  onInputChange(event) {
    this.updateQtyButtonState();
  }

  /**
   * 处理加减按钮点击
   * @param event
   */
  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === "plus" ? this.input.stepUp() : this.input.stepDown();
    // stepUp 和 stepDown 不会触发输入框的Change事件，所以需要手动触发
    if (previousValue !== this.input.value)
      this.input.dispatchEvent(this.changeEvent);
  }

  /**
   * 调整数量加减按钮 disabled 属性
   */
  updateQtyButtonState() {
    const value = parseInt(this.input.value);

    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".quantity-button[name='minus']");
      buttonMinus.classList.toggle("disabled", value <= min);
    }

    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity-button[name='plus']");
      buttonPlus.classList.toggle("disabled", value >= max);
    }
  }
}
customElements.define("quantity-input", QuantityInput);

class HeaderDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetails = this.querySelector("details");
    this.mainSummary = this.querySelector("summary");
    this.header = this.closest(".section-header");

    this.addEventListener("keyup", this.onKeyUp.bind(this));
    this.addEventListener("focusout", this.onFocusOut.bind(this));

    // 抽屉打开
    this.mainDetails.addEventListener("toggle", this.onToggleMain.bind(this));

    // 子菜单
    const menuNav = this.querySelector(".menu-drawer-nav");
    menuNav.querySelectorAll("details").forEach((detail) => {
      detail.addEventListener("toggle", this.onToggleSub.bind(this));
    });
  }

  // 键盘事件
  onKeyUp(event) {
    if (event.code && event.code.toUpperCase() !== "ESCAPE") return;

    this.mainDetails.removeAttribute("open");
  }

  onToggleMain(event) {
    if (event.currentTarget.hasAttribute("open")) {
      this.openMenuDrawer();
    } else {
      this.closeMenuDrawer();
    }
  }

  onToggleSub(event) {
    if (event.currentTarget.hasAttribute("open")) {
      this.openSubmenu(event.currentTarget);
    } else {
      this.closeSubmenu(event.currentTarget);
    }
  }

  /**
   * 打开主菜单
   */
  openMenuDrawer() {
    setTimeout(() => {
      this.mainDetails.classList.add("menu-open");
    });
    this.mainSummary.setAttribute("aria-expanded", "true");
    if (this.header) this.header.classList.add("header--is-active");

    this.setTopPosition();
    if (window.Shopify.designMode) {
      window.addEventListener("resize", this.setTopPosition.bind(this));
    }

    webvista.disablePageScroll(); // 禁用滚动
  }

  /**
   * 关闭主菜单
   */
  closeMenuDrawer() {
    this.mainDetails.classList.remove("menu-open");
    this.mainSummary.setAttribute("aria-expanded", "false");
    if (this.header) this.header.classList.remove("header--is-active");

    // 关闭子菜单
    this.mainDetails
      .querySelectorAll('details[open][data-belong="1"]')
      .forEach((elements) => {
        elements.removeAttribute("open");
      });

    webvista.enablePageScroll(); // 启用滚动
    window.removeEventListener("resize", this.setTopPosition.bind(this));
  }

  // 失去焦点，关闭菜单
  onFocusOut(event) {
    const triggerElement = event.target;

    setTimeout(() => {
      if (
        this.mainDetails.hasAttribute("open") &&
        !this.mainDetails.contains(document.activeElement) &&
        !triggerElement.classList.contains("nav-button")
      ) {
        this.mainDetails.removeAttribute("open");
      }
    });
  }

  /**
   * 打开子菜单
   * @param detailsElement
   */
  openSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest(".has-submenu"); // 父级菜单
    const summaryElement = detailsElement.querySelector("summary");

    summaryElement.setAttribute("aria-expanded", "true");

    // 延迟添加，防止动画未应用到元素上
    setTimeout(() => {
      detailsElement.classList.add("menu-open");
    });

    if (parentMenuElement) {
      // 父菜单状态，显示有打开的子菜单
      parentMenuElement.classList.add("submenu-open");

      // 关闭兄弟菜单
      if (!webvista.isPadScreen()) {
        Array.from(
          parentMenuElement.querySelectorAll(
            `details[open][data-belong="${parentMenuElement.dataset.level}"]`,
          ),
        )
          .filter((details) => details !== detailsElement)
          .forEach((details) => {
            details.removeAttribute("open");
          });
      }
    }
  }

  /**
   * 关闭子菜单
   * @param detailsElement
   */
  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest(".submenu-open");
    const summaryElement = detailsElement.querySelector("summary");

    parentMenuElement && parentMenuElement.classList.remove("submenu-open");

    detailsElement.classList.remove("menu-open");
    summaryElement.setAttribute("aria-expanded", "false");

    // 关闭子菜单
    Array.from(detailsElement.querySelectorAll("details[open]"), (details) => {
      details.removeAttribute("open");
    });

    Array.from(detailsElement.querySelectorAll(".submenu-open"), (element) => {
      element.classList.remove("submenu-open");
    });
  }

  /**
   * 设置菜单抽屉顶部位置
   */
  setTopPosition() {
    this.borderOffset =
      this.borderOffset ||
      this.closest(".header-wrapper").classList.contains(
        "header-wrapper--border-bottom",
      )
        ? 1
        : 0; // 判断Header是否有border-bottom

    this.header &&
      document.documentElement.style.setProperty(
        "--header-bottom",
        `${this.header.querySelector("header").getBoundingClientRect().bottom - this.borderOffset}px`,
      );
    document.documentElement.style.setProperty(
      "--viewport-height",
      `${window.innerHeight}px`,
    );
  }
}
customElements.define("header-drawer", HeaderDrawer);

/**
 * @class ModalOpener
 * @extends HTMLElement
 * @classdesc 自定义元素 ModalOpener，用于打开指定的模态对话框。
 */
class ModalOpener extends HTMLElement {
  constructor() {
    super();

    if (this.hasAttribute("aria-disabled")) return;
    this.modal = document.getElementById(this.getAttribute("aria-controls"));
    if (!this.modal) return;

    this.addEventListener("click", this.onOpenerClick.bind(this));
    this.addEventListener("keydown", this.onKeyDown.bind(this));
  }

  onOpenerClick(event) {
    event.preventDefault(); // 当弹窗不存在或者不支持js的情况下，a 标签可作为回退方案

    if (this.getAttribute("aria-expanded") === "true") return;

    this.modal.show(event.target); // 原this.modal.show(this), 将this改成event.target，因为有可能是modal-opener内的子元素触发，比如a标签
  }

  /**
   * 键盘事件
   */
  onKeyDown(event) {
    if (["Space", "Enter"].includes(event.code)) {
      this.modal.show(event.target);
    }
  }

  dispatchEvent(event) {
    return false;
  }
}
customElements.define("modal-opener", ModalOpener);

/**
 * @class ModalDialog
 * @extends HTMLElement
 * @classdesc 自定义元素 ModalDialog，用于显示和隐藏模态对话框。
 */
class ModalDialog extends HTMLElement {
  constructor() {
    super();

    this.hasOpened = false; // 打开状态

    // 打开模态时候允许页面滚动
    this.enableScrollWhenOpen = this.hasAttribute("data-enable-scroll");

    // 禁止其它方式关闭
    if (!this.hasAttribute("data-force")) {
      this.addEventListener("keyup", (event) => {
        event.stopPropagation();
        if (event.code && event.code.toUpperCase() === "ESCAPE") this.hide();
      });

      this.addEventListener("click", (event) => {
        event.stopPropagation();

        // this.contains(event.target) 防止嵌套使用
        if (
          this.contains(event.target) &&
          event.target.classList.contains("modal-overlay")
        )
          this.hide();
      });
    }

    // 模板编辑模式
    if (window.Shopify.designMode) {
      document.addEventListener("shopify:section:select", (event) => {
        if (event.detail.sectionId === this.dataset.section) {
          this.show();
        } else {
          this.hide();
        }
      });

      document.addEventListener("shopify:section:deselect", (event) => {
        if (event.detail.sectionId === this.dataset.section) {
          this.hide();
        }
      });
    }
  }

  show(opener) {
    this.openedBy = opener;

    this.setAttribute("open", "");
    if (this.openedBy) this.openedBy.setAttribute("aria-expanded", "true");
    webvista.trapFocus(this);
    this.hasOpened = true;

    if (!this.enableScrollWhenOpen) webvista.disablePageScroll();
  }

  hide() {
    this.removeAttribute("open");

    if (this.openedBy) {
      this.openedBy.setAttribute("aria-expanded", "false");
      webvista.removeTrapFocus(this.openedBy);
    }
    this.hasOpened = false;

    webvista.pauseAllMedia(this); // 关闭所有播放的媒体

    if (!this.enableScrollWhenOpen) webvista.enablePageScroll();
  }

  dispatchEvent(event) {
    return false;
  }
}
customElements.define("modal-dialog", ModalDialog);

/**
 * 抽屉类
 */
class Drawer extends ModalDialog {
  constructor() {
    super();
  }
}
customElements.define("drawer-component", Drawer);

/**
 * @class ConfirmOpener
 * @extends ModalOpener
 * @classdesc 自定义元素 ConfirmOpener，继承自 ModalOpener，用于打开确认对话框。
 */
class ConfirmOpener extends ModalOpener {
  /**
   * @method onOpenerClick
   * @description 处理按钮点击事件，设置确认消息并显示模态对话框。
   */
  onOpenerClick(event) {
    const confirmMessageElement = this.modal.querySelector(".confirm-message");
    const message = this.getAttribute("data-message") || "Are you sure?";
    if (message) confirmMessageElement.innerText = message;

    super.onOpenerClick(event);
  }

  /**
   * @method sendRequest
   * @description 发送 POST 请求到指定的 URL。
   */
  sendRequest() {
    const url = this.getAttribute("data-url");
    if (!url) return;
    const method = this.getAttribute("data-method") || "post";

    Shopify.postLink(url, {
      parameters: { _method: method },
    });
  }
}
customElements.define("confirm-opener", ConfirmOpener);

/**
 * @class ConfirmDialog
 * @extends ModalDialog
 * @classdesc 自定义元素 ConfirmDialog，继承自 ModalDialog，用于显示确认对话框。
 */
class ConfirmDialog extends ModalDialog {
  constructor() {
    super();

    const confirmButton = this.querySelector(".confirm-button");
    if (confirmButton)
      confirmButton.addEventListener("click", this.handleConfirm.bind(this));

    const cancelButton = this.querySelector(".cancel-button");
    if (cancelButton)
      cancelButton.addEventListener("click", this.hide.bind(this));
  }

  /**
   * @method handleConfirm
   * @description 处理确认按钮点击事件，调用触发元素的 sendRequest 方法。
   */
  handleConfirm() {
    if (!this.openedBy) return;

    this.openedBy.sendRequest();
  }
}
customElements.define("confirm-dialog", ConfirmDialog);

class TabPanel extends HTMLElement {
  constructor() {
    super();

    this.tabs = Array.from(this.querySelectorAll(".tab"));
    this.panels = Array.from(this.querySelectorAll(".panel"));
    if (!this.tabs || this.tabs.length < 2) return;

    this.tabs.forEach((tab) => {
      tab.addEventListener("click", this.onTabClick.bind(this));

      tab.setAttribute("tabindex", 0);
      tab.addEventListener("keydown", this.onKeydown.bind(this));
    });
  }

  /**
   * 处理鼠标点击切换 Tab
   * @param event
   */
  onTabClick(event) {
    this.tabChoose(event.currentTarget);
  }

  /**
   * 处理键盘切换 Tab
   * @param event
   */
  onKeydown(event) {
    const key = event.code ? event.code.toUpperCase() : "";

    if (key === "ENTER" || key === "SPACE") {
      this.tabChoose(event.currentTarget);
      event.preventDefault(); // 防止 Space 键的默认滚动行为
    }
  }

  /**
   * 切换 Tab
   * @param tab DomElement
   * @constructor
   */
  tabChoose(tab) {
    const panel = document.getElementById(tab.getAttribute("aria-controls"));
    if (!tab || !panel) return;

    const currentTab = this.querySelector(".tab[aria-selected=true]");
    const currentPanel = this.querySelector(".panel:not([aria-hidden])");

    if (tab !== currentTab) {
      currentTab.setAttribute("aria-selected", "false");
      currentPanel.setAttribute("aria-hidden", "true");

      tab.setAttribute("aria-selected", true);
      panel.removeAttribute("aria-hidden");
    }

    this.scrollableContentViewer =
      this.scrollableContentViewer || tab.closest("scrollable-content-viewer");
    if (this.scrollableContentViewer)
      this.scrollableContentViewer.slideContentByItem(tab);
  }
}
customElements.define("tab-panel", TabPanel);

/**
 * DetailsDisclosure 类
 * 这个类用于创建一个自定义的 HTML 元素，特别适用于管理 <details> 元素的展开和收起行为。
 * 它主要用于控制与 <details> 和 <summary> 元素相关的动画，并处理用户与这些元素的交互。
 * 当 <details> 元素的状态改变（展开或收起）时，它会相应地播放或取消内容区域的动画。
 * 这个类还提供了一个方法来手动关闭 <details> 元素，确保可访问性和一致的状态管理。
 */
class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector("details");
    this.content =
      this.mainDetailsToggle.querySelector("summary").nextElementSibling;
    if (!this.mainDetailsToggle || !this.content) return;

    this.observeVisibility();
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
  }

  /**
   * 监听元素可见性
   * 可见的时候执行一操作
   */
  observeVisibility() {
    this.observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 如果默认是展开的，初始化高度
            this.handleWhenVisibility();
            observer.unobserve(this);
          }
        });
      },
      {
        root: null,
        threshold: 0.1,
      },
    );

    this.observer.observe(this);
  }

  /**
   * 当元素可见的时候执行
   */
  handleWhenVisibility() {
    if (this.mainDetailsToggle.hasAttribute("open")) this.onToggle();

    this.mainDetailsToggle.addEventListener("toggle", this.onToggle.bind(this));
  }

  onToggle() {
    this.mainDetailsToggle
      .querySelector("summary")
      .setAttribute(
        "aria-expanded",
        this.mainDetailsToggle.hasAttribute("open"),
      );

    // 异步添加防止动画未应用
    setTimeout(() => {
      this.mainDetailsToggle.classList.toggle(
        "has-opened",
        this.mainDetailsToggle.hasAttribute("open"),
      );
    });
  }

  open() {
    this.mainDetailsToggle.setAttribute("open", "true");
  }

  close() {
    this.mainDetailsToggle.removeAttribute("open");
  }
}
customElements.define("details-disclosure", DetailsDisclosure);

/**
 * DropMenu 类
 * 这个类继承自 DetailsDisclosure，提供了特定于下拉菜单和选择器的功能。
 * 除了继承自基类的展开和收起行为的管理外，它还添加了焦点管理的特性。
 * 当用户将焦点从该元素移出时，DropMenu 类会自动关闭 <details> 元素。
 * 支持鼠标悬停打开
 * 还可以根据指定容器的大小自动调整宽度，防止超出或者被隐藏。
 * 适用于页眉【下拉菜单】、【地区和语言选择器】等需要焦点控制和动画支持的交互元素。
 */
class DropMenu extends DetailsDisclosure {
  handleWhenVisibility() {
    super.handleWhenVisibility();
    this.mainDetailsToggle.addEventListener(
      "focusout",
      this.onFocusOut.bind(this),
    );

    // 鼠标悬停打开
    if (this.hasAttribute("data-hover-open")) {
      this.mainDetailsToggle.addEventListener(
        "mouseenter",
        this.open.bind(this),
      );
      this.mainDetailsToggle.addEventListener(
        "mouseleave",
        this.close.bind(this),
      );
    }
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    });
  }

  onToggle() {
    // 调整位置，防止超出屏幕区域
    if (this.mainDetailsToggle.hasAttribute("data-constrain"))
      this.adjustContentPosition();

    // 切换 header 激活状态
    const header = this.closest(".section-header");
    if (header)
      header.classList.toggle(
        "header--is-active",
        this.mainDetailsToggle.hasAttribute("open"),
      );

    super.onToggle();
  }

  /**
   * 调整内容位置，使其不能超过【右侧】限制区域
   * 默认是视口屏幕区域
   * data-area 可设置自定义边界区域
   * data-adjust 自动调整位置
   */
  adjustContentPosition() {
    const needAdjust = this.mainDetailsToggle.hasAttribute("data-adjust"); // 是否需要自动调整位置

    if (!this.mainDetailsToggle.hasAttribute("open")) {
      this.mainDetailsToggle.classList.remove("position--exceed");

      // 自动调整位置，重置位置
      if (needAdjust) {
        this.content.style.left = null;
      }
    } else {
      // 调整位置，使其不能超过限制区域
      let areaRightSidePosition = document.documentElement.clientWidth; // 右边界，默认屏幕右侧，不包含滚动条
      let areaLeftSidePosition = 0; // 左边界，默认屏幕左侧
      if (this.dataset.area) {
        // 如果设置了自定义边界
        const areaRect = document
          .querySelector(this.dataset.area)
          ?.getBoundingClientRect();
        if (areaRect) {
          areaRightSidePosition = areaRect.right;
          areaLeftSidePosition = areaRect.left;
        }
      }

      const contentRect = this.content.getBoundingClientRect();
      // 偏移量
      let offset = contentRect.right - areaRightSidePosition;

      if (offset > 0) {
        // 超出区域
        this.mainDetailsToggle.classList.add("position--exceed");

        if (needAdjust) {
          this.content.style.left = `${-Math.ceil(offset)}px`;
        }
      }
    }

    this.mainDetailsToggle.classList.toggle(
      "position--constrained",
      this.mainDetailsToggle.hasAttribute("open"),
    );
  }
}
customElements.define("drop-menu", DropMenu);

/**
 * 延迟播放媒体
 */
class DeferredMedia extends HTMLElement {
  constructor() {
    super();

    this.template = this.querySelector("template");
    if (!this.template) return;

    // 点击按钮加载
    const button = this.querySelector(".media-play-button");
    if (button) {
      button.removeAttribute("disabled");
      button.addEventListener("click", this.loadContent.bind(this));
    }

    // data-load-when-visible: 当内容可见的时候加载视频资源
    if (this.hasAttribute("data-load-when-visible")) {
      this.initObserver();
    }
  }

  /**
   * 监听资源滚动到视口区域
   * 自动播放视频
   */
  initObserver() {
    const options = {
      root: null,
      rootMargin: "100px 0px 100px 0px",
    };

    new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.loadContent();
          observer.disconnect();
        }
      });
    }, options).observe(this);
  }

  /**
   * 获取媒体资源
   * @param focus
   */
  loadContent(focus = true) {
    if (!this.getAttribute("loaded")) {
      const content = document.createElement("div");
      content.appendChild(
        this.template.content.firstElementChild.cloneNode(true),
      );
      this.deferredElement = this.appendChild(
        content.querySelector("video, model-viewer, iframe"),
      );

      // 下次渲染时候设置加载状态，防止火狐浏览器自动聚焦导致的页面闪中
      requestAnimationFrame(() => {
        this.setAttribute("loaded", "true");
      });

      if (
        this.deferredElement.nodeName === "VIDEO" &&
        this.deferredElement.getAttribute("autoplay")
      ) {
        this.deferredElement.muted = true;
        this.deferredElement.play(); // 播放视频
        this.deferredElement.addEventListener(
          "ended",
          this.removeContent.bind(this),
        );
      }

      if (focus) this.deferredElement.focus();
    }
  }

  /**
   * 播放完成后移除资源
   */
  removeContent() {
    if (this.deferredElement) {
      this.deferredElement.remove();
      this.removeAttribute("loaded");
    }
  }
}
customElements.define("deferred-media", DeferredMedia);

/**
 * 变体属性选择器
 * 核心是处理当前选择的变体变化时的逻辑
 */
class VariantSelects extends HTMLElement {
  constructor() {
    super();

    this.productForm = document.getElementById(
      `product-form-${this.dataset.section}`,
    );

    this.addEventListener("change", this.onVariantChange.bind(this));
  }

  /**
   * 变体变化处理
   */
  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButtonStatus(true, "");
    this.updatePickupAvailability(); // 本地取货、配送
    this.removeErrorMessage(); // 移除product-form的错误消息
    this.updateVariantStatuses();

    if (!this.currentVariant) {
      // 变体不存在
      this.toggleAddButtonStatus(true, window["variantStrings"]["unavailable"]);
      this.setUnavailable();
    } else {
      this.updateMedia(); // 跟新媒体当前展示
      this.updateURL(); // 更新浏览器地址，添加variantId
      this.updateVariantInput(); // 更新表单相关的id->当前变体id
      this.renderProductInfo(); // 更新产品信息，包括价格、库存、SKU、AddCartButton状态； 发送变体变化广播
    }
  }

  /**
   * 获取每个属性选择器的值
   * 返回值的集合数组
   */
  updateOptions() {
    this.options = Array.from(
      this.querySelectorAll("select, fieldset"),
      (item) => {
        if (item.tagName === "SELECT") {
          return item.value;
        } else {
          return Array.from(item.querySelectorAll("input")).find(
            (radio) => radio.checked,
          )?.value;
        }
      },
    );

    // 更新属性所选值
    this.querySelectorAll(".product-form-input")?.forEach(
      (optionElement, index) => {
        const optionValueElement =
          optionElement.querySelector(".form-label span");
        if (optionValueElement)
          optionValueElement.innerText = this.options[index];
      },
    );
  }

  /**
   * 获取当前选择的变体Variant
   * 返回当前变体
   */
  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  /**
   * 更新媒体当前展示
   */
  updateMedia() {
    if (!this.currentVariant || !this.currentVariant["featured_media"]) return;

    // 设置当前展示的媒体
    const mediaGallery = document.getElementById(
      `Media-Gallery-${this.dataset.section}`,
    );
    if (mediaGallery)
      mediaGallery.updateGallery(this.currentVariant["featured_media"].id);
  }

  // 更新浏览器地址
  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === "false") return;
    window.history.replaceState(
      {},
      "",
      `${this.dataset.url}?variant=${this.currentVariant.id}`,
    );
  }

  // 更新表单的variantId
  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`,
    );

    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      // 手动触发Change事件
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  /**
   * 更新所有属性值的状态
   * 标记值是否disabled
   */
  updateVariantStatuses() {
    // 获取option1是选中值的所有变体
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) =>
        this.querySelector(":checked").value === variant["options"][0],
    );

    // 所有属性选择器
    const inputWrappers = [...this.querySelectorAll(".product-form-input")];
    // 过滤每个属性的有效值
    inputWrappers.forEach((option, index) => {
      if (index === 0) return; // 第一个除外，因为第一个属性在liquid中初始化已经完成过滤

      const optionInputs = Array.from(
        option.querySelectorAll('input[type="radio"], option'),
      );
      // 上一个的选中值
      // Select选择器的Option也可以通过:checked获取值
      const previousOptionSelected =
        inputWrappers[index - 1].querySelector(":checked").value;

      const availableOptionInputsValue = selectedOptionOneVariants
        .filter(
          (variant) =>
            variant["available"] &&
            variant[`option${index}`] === previousOptionSelected,
        )
        .map((variantOption) => variantOption[`option${index + 1}`]);

      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  /**
   * 设置属性值是否可用
   * @param listOfOptions
   * @param listOfAvailableOptions
   */
  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    const availableOptionsSet = new Set(listOfAvailableOptions);

    listOfOptions.forEach((input) => {
      const isOption = input.tagName === "OPTION";
      const isAvailable = availableOptionsSet.has(input.getAttribute("value"));

      if (isOption) {
        // 处理 OPTION 元素的文本内容
        const optionName = input.textContent
          .replace(`- ${window["variantStrings"]["unavailable"]}`, "")
          .trim();

        input.textContent = isAvailable
          ? optionName
          : `${optionName} - ${window["variantStrings"]["unavailable"]}`;
      } else {
        // 处理非 OPTION 元素的类名
        input.classList.toggle("disabled", !isAvailable);
      }
    });
  }

  // 更新本地取货、配送
  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector("pickup-availability");
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant["available"]) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute("available");
      pickUpAvailability.innerHTML = "";
    }
  }

  /**
   * 移除product-form的错误消息
   */
  removeErrorMessage() {
    if (!this.productForm) return;

    this.productForm.closest("product-form")?.handleErrorMessage();
  }

  /**
   * 更新产品信息
   * 价格、库存、SKU、更新数量选择器和购买按钮区域（包括添加购物车，动态结账，到货通知按钮），分享，赠品，迷你结账，到货通知表单
   * 发送变体变化广播
   */
  renderProductInfo() {
    this.abortController?.abort();
    this.abortController = new AbortController();

    const requestedVariantId = this.currentVariant.id;

    webvista
      .fetchHtml(
        `${this.dataset.url}?variant=${requestedVariantId}&section_id=${this.sourceSectionId}`,
        this.abortController.signal,
      )
      .then((html) => {
        // prevent unnecessary ui changes from abandoned selections
        if (this.currentVariant.id !== requestedVariantId) return;

        /**
         * 更新模块内容
         * @param id 模块id
         * @param needReplace 是否替换内容
         * @param replaceSelectors 替换子元素选择器列表，用于替换子内容；如果为空，将全部替换
         * @param shouldHide 是否隐藏模块
         */
        const updateSourceFromDestination = (
          id,
          needReplace = true,
          replaceSelectors,
          shouldHide = (source) => false,
        ) => {
          const source = html.getElementById(`${id}-${this.sourceSectionId}`);
          const destination = document.getElementById(
            `${id}-${this.dataset.section}`,
          );

          if (source && destination) {
            if (needReplace) {
              if (replaceSelectors == null || replaceSelectors.length <= 0) {
                destination.innerHTML = source.innerHTML;
              } else {
                replaceSelectors.forEach((selector) => {
                  const destinationEle = destination.querySelector(selector);
                  const sourceEle = source.querySelector(selector);
                  if (destinationEle && sourceEle)
                    destinationEle.replaceWith(sourceEle);
                });
              }
            }

            destination.classList.toggle("hidden", shouldHide(source));
          }
        };

        // 同步添加购物车按钮
        const addCartButtonSource = html.getElementById(
          `Product-Submit-Button-${this.sourceSectionId}`,
        );
        this.toggleAddButtonStatus(
          addCartButtonSource
            ? addCartButtonSource.hasAttribute("disabled")
            : true,
          addCartButtonSource
            ? addCartButtonSource.querySelector(".button-text").innerText
            : window["variantStrings"]["soldOut"],
        );

        updateSourceFromDestination("Price");
        updateSourceFromDestination(
          "Inventory",
          true,
          null,
          ({ innerHTML }) => innerHTML === "",
        );
        updateSourceFromDestination(
          "Sku",
          true,
          null,
          ({ innerHTML }) => innerHTML === "",
        );

        updateSourceFromDestination("Share-Link"); // 分享链接
        updateSourceFromDestination("Product-Gift"); // 赠品Gift
        updateSourceFromDestination("Product-Mini-Checkout", true, [
          ".product-image",
          ".product-content",
        ]); // 迷你结账
        updateSourceFromDestination(
          "Notify-Email-Button",
          false,
          null,
          ({ classList }) => classList.contains("hidden"),
        ); // 同步到货订阅按钮
        updateSourceFromDestination("Notify-Email"); // 更新到货通知表单

        // 重新初始化一些监听
        webvista.initLazyImages();
        webvista.initTooltips();

        // 发送广播
        webvista.publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId: this.dataset.section, // 目标 section id
            html, // 源 html
            variant: this.currentVariant,
          },
        });
      })
      .catch((error) => {
        webvista.popToast(
          window["accessibilityStrings"]["unknownError"],
          "error",
        );
      });
  }

  /**
   * 添加购物车按钮状态
   * @param disable
   * @param text
   */
  toggleAddButtonStatus(disable = true, text) {
    if (!this.productForm) return;

    const addCartButtons = this.productForm.querySelectorAll(
      'button[type="submit"]',
    );
    const dynamicCheckout = this.productForm.querySelector(".dynamic-checkout"); // 动态结账

    if (disable) {
      addCartButtons.forEach((addButton) => {
        addButton.setAttribute("disabled", "disabled");
        if (!text) return;

        const addButtonTextElement = addButton.querySelector(".button-text");
        if (addButtonTextElement) addButtonTextElement.textContent = text;
      });

      // 隐藏动态支付
      if (dynamicCheckout && text) dynamicCheckout.classList.add("hidden");
    } else {
      addCartButtons.forEach((button) => {
        button.removeAttribute("disabled");

        const addButtonTextElement = button.querySelector(".button-text");
        if (!addButtonTextElement) return;

        addButtonTextElement.textContent = text
          ? text
          : window["variantStrings"]["addToCart"];
      });

      // 显示动态结账
      if (dynamicCheckout) dynamicCheckout.classList.remove("hidden");
    }
  }

  /**
   * 设置变体不可售状态
   */
  setUnavailable() {
    // 隐藏指定元素
    const hidden_element_ids = [
      `Price-${this.dataset.section}`,
      `Inventory-${this.dataset.section}`,
      `Sku-${this.dataset.section}`,
      `Price-Per-Item-${this.dataset.section}`,
      `Volume-Note-${this.dataset.section}`,
      `Volume-${this.dataset.section}`,
      `Quantity-Rules-${this.dataset.section}`,
    ];

    hidden_element_ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.classList.add("hidden");
    });
  }

  // 获取产品的变体数据
  // Product.variants
  getVariantData() {
    this.variantData =
      this.variantData ||
      JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }

  /**
   * 获取源 section id
   * @returns {string}
   */
  get sourceSectionId() {
    return this.dataset.originalSection || this.dataset.section;
  }
}

/**
 * 超多变体的变体属性选择器
 * 支持超过250个变体数量
 */
class HighVariantSelects extends HTMLElement {
  constructor() {
    super();

    this.productForm = document.getElementById(
      `product-form-${this.dataset.section}`,
    );

    this.addEventListener("change", this.onVariantChange.bind(this));
  }

  /**
   * 变体变化处理
   */
  onVariantChange(event) {
    this.toggleAddButtonStatus(true, "");
    this.removeErrorMessage(); // 移除product-form的错误消息

    this.updateOptions(event.target);
    this.renderProductInfo(event.target);
  }

  /**
   * 获取选择器每个属性的值id数组
   * 返回值的集合数组
   */
  updateOptions(target) {
    if (target.tagName === "SELECT" && target.selectedOptions.length) {
      Array.from(target.options)
        .find((option) => option.getAttribute("selected"))
        .removeAttribute("selected");
      target.selectedOptions[0].setAttribute("selected", "selected");
    }

    this.optionValueIds = Array.from(
      this.querySelectorAll("select option[selected], fieldset input:checked"),
    ).map((element) => element.dataset.optionValueId);
  }

  /**
   * 更新媒体当前展示
   */
  updateMedia() {
    if (!this.currentVariant?.featured_media?.id) return;

    // 设置当前展示的媒体
    const mediaGallery = document.getElementById(
      `Media-Gallery-${this.dataset.section}`,
    );
    if (mediaGallery)
      mediaGallery.updateGallery(this.currentVariant.featured_media.id);
  }

  // 更新浏览器地址
  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === "false") return;
    window.history.replaceState(
      {},
      "",
      `${this.dataset.url}?variant=${this.currentVariant.id}`,
    );
  }

  // 更新表单的variantId
  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`,
    );

    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      // 手动触发Change事件
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  /**
   * 设置变体不可售状态
   */
  setUnavailable() {
    // 隐藏指定元素
    const hidden_element_ids = [
      `Price-${this.dataset.section}`,
      `Inventory-${this.dataset.section}`,
      `Sku-${this.dataset.section}`,
      `Price-Per-Item-${this.dataset.section}`,
      `Volume-Note-${this.dataset.section}`,
      `Volume-${this.dataset.section}`,
      `Quantity-Rules-${this.dataset.section}`,
    ];

    hidden_element_ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.classList.add("hidden");
    });
  }

  // 更新本地取货、配送
  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector("pickup-availability");
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant["available"]) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute("available");
      pickUpAvailability.innerHTML = "";
    }
  }

  /**
   * 移除product-form的错误消息
   */
  removeErrorMessage() {
    if (!this.productForm) return;

    this.productForm.closest("product-form")?.handleErrorMessage();
  }

  /**
   * 更新产品信息
   * 价格、库存、SKU、更新数量选择器和购买按钮区域（包括添加购物车，动态结账，到货通知按钮），分享，赠品，迷你结账，到货通知表单
   * 发送变体变化广播
   * @param target 目标焦点元素
   */
  renderProductInfo(target) {
    this.abortController?.abort();
    this.abortController = new AbortController();

    webvista
      .fetchHtml(
        `${this.dataset.url}?option_values=${this.optionValueIds.join(",")}&section_id=${this.sourceSectionId}`,
        this.abortController.signal,
      )
      .then((html) => {
        this.updateBlock(html, "Variant-Selects"); // 更新选择器
        this.getCurrentVariant(); // 获取当前变体
        this.updateVariantInput();
        this.updateURL();
        this.updatePickupAvailability();

        if (!this.currentVariant) {
          // 变体不存在
          this.toggleAddButtonStatus(
            true,
            window["variantStrings"]["unavailable"],
          );
          return this.setUnavailable();
        }

        // 更新当前变体媒体
        this.updateMedia();

        // 同步添加购物车按钮
        const addCartButtonSource = html.getElementById(
          `Product-Submit-Button-${this.sourceSectionId}`,
        );
        this.toggleAddButtonStatus(
          addCartButtonSource
            ? addCartButtonSource.hasAttribute("disabled")
            : true,
          addCartButtonSource
            ? addCartButtonSource.querySelector(".button-text").innerText
            : window["variantStrings"]["soldOut"],
        );

        this.updateBlock(html, "Price");
        this.updateBlock(
          html,
          "Inventory",
          true,
          null,
          ({ innerHTML }) => innerHTML === "",
        );
        this.updateBlock(
          html,
          "Sku",
          true,
          null,
          ({ innerHTML }) => innerHTML === "",
        );

        this.updateBlock(html, "Share-Link"); // 分享链接
        this.updateBlock(html, "Product-Gift"); // 赠品Gift
        this.updateBlock(html, "Product-Mini-Checkout", true, [
          ".product-image",
          ".product-content",
        ]); // 迷你结账
        this.updateBlock(
          html,
          "Notify-Email-Button",
          false,
          null,
          ({ classList }) => classList.contains("hidden"),
        ); // 同步到货订阅按钮
        this.updateBlock(html, "Notify-Email"); // 更新到货通知表单

        // 重新初始化一些监听
        webvista.initLazyImages();
        webvista.initTooltips();

        // 发送广播
        webvista.publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId: this.dataset.section, // 目标 section id
            html, // 源 html
            variant: this.currentVariant,
          },
        });
      })
      .then(() => {
        document.querySelector(`#${target.id}`)?.focus();
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          console.log("Fetch aborted by user");
        } else {
          console.error(error);
        }
      });
  }

  /**
   * 更新页面区块内容
   * @param {Document} html - 包含新内容的HTML文档
   * @param {string} blockId - 区块基础ID
   * @param {boolean} [replaceEntireBlock=true] - 是否替换整个区块内容
   * @param {string[]} [selectorsToReplace] - 需要单独替换的选择器数组
   * @param {Function} [shouldHideCallback] - 决定区块是否隐藏的回调函数
   */
  updateBlock(
    html,
    blockId,
    replaceEntireBlock = true,
    selectorsToReplace,
    shouldHideCallback = (sourceElement) => false,
  ) {
    // 获取源元素和目标元素
    const sourceElement = html.getElementById(
      `${blockId}-${this.sourceSectionId}`,
    );
    const targetElement = document.getElementById(
      `${blockId}-${this.dataset.section}`,
    );

    // 如果元素不存在则直接返回
    if (!sourceElement || !targetElement) return;

    // 如果源Id存在，需要替换内容里面的源id为目标id
    if(this.dataset.originalSection) {
      // 创建源元素的克隆，避免修改原始DOM
      const clonedSource = sourceElement.cloneNode(true);
      // 将sourceElement中的this.dataset.originalSection字符串替换为this.dataset.section字符串
      const htmlContent = clonedSource.innerHTML;
      const regex = new RegExp(this.dataset.originalSection, 'g');
      clonedSource.innerHTML = htmlContent.replace(regex, this.dataset.section);
      // 使用处理后的克隆元素作为新的源元素
      sourceElement.innerHTML = clonedSource.innerHTML;
    }

    // 替换内容逻辑
    if (replaceEntireBlock) {
      if (!selectorsToReplace?.length) {
        // 替换整个区块内容
        targetElement.innerHTML = sourceElement.innerHTML;
      } else {
        // 替换指定选择器的内容
        selectorsToReplace.forEach((selector) => {
          const targetSubElement = targetElement.querySelector(selector);
          const sourceSubElement = sourceElement.querySelector(selector);

          if (targetSubElement && sourceSubElement) {
            targetSubElement.replaceWith(sourceSubElement.cloneNode(true));
          }
        });
      }
    }

    // 更新区块可见性
    targetElement.classList.toggle("hidden", shouldHideCallback(sourceElement));
  }

  /**
   * 添加购物车按钮状态
   * @param disable
   * @param text
   */
  toggleAddButtonStatus(disable = true, text) {
    if (!this.productForm) return;

    const addCartButtons = this.productForm.querySelectorAll(
      'button[type="submit"]',
    );
    const dynamicCheckout = this.productForm.querySelector(".dynamic-checkout"); // 动态结账

    if (disable) {
      addCartButtons.forEach((addButton) => {
        addButton.setAttribute("disabled", "disabled");
        if (!text) return;

        const addButtonTextElement = addButton.querySelector(".button-text");
        if (addButtonTextElement) addButtonTextElement.textContent = text;
      });

      // 隐藏动态支付
      if (dynamicCheckout && text) dynamicCheckout.classList.add("hidden");
    } else {
      addCartButtons.forEach((button) => {
        button.removeAttribute("disabled");

        const addButtonTextElement = button.querySelector(".button-text");
        if (!addButtonTextElement) return;

        addButtonTextElement.textContent = text
          ? text
          : window["variantStrings"]["addToCart"];
      });

      // 显示动态结账
      if (dynamicCheckout) dynamicCheckout.classList.remove("hidden");
    }
  }

  /**
   * 获取当前变体json对象
   */
  getCurrentVariant() {
    const json = this.querySelector(
      "script[data-selected-variant]",
    ).textContent;
    this.currentVariant = !!json ? JSON.parse(json) : null;
  }

  /**
   * 获取源 section id
   * @returns {string}
   */
  get sourceSectionId() {
    return this.dataset.originalSection || this.dataset.section;
  }
}
customElements.define("high-variant-selects", HighVariantSelects);

/*
  推荐产品，互补产品
 */
class ProductRecommendations extends HTMLElement {
  constructor() {
    super();

    this.observer = new IntersectionObserver(
      (entries, observer) => {
        if (!entries[0].isIntersecting) return;
        observer.unobserve(this);

        this.fetchData();
      },
      { rootMargin: "0px 0px 400px 0px" },
    );

    this.observer.observe(this);
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
  }

  fetchData() {
    webvista
      .fetchHtml(this.dataset.url)
      .then((html) => {
        this.renderHtml(html);
      })
      .catch((error) => {
        webvista.popToast(
          window["accessibilityStrings"]["unknownError"],
          "error",
        );
      });
  }

  renderHtml(html) {
    const sourceRecommendationMain = html.querySelector(
      `#${this.id} .recommendation-main`,
    );

    if (sourceRecommendationMain) {
      this.querySelector(".products-container").innerHTML =
        sourceRecommendationMain.outerHTML;
    } else {
      this.remove();
    }

    // 加载完成状态
    webvista.initLazyImages();
    webvista.initTooltips();
  }
}
customElements.define("product-recommendations", ProductRecommendations);

/**
 * 产品卡片处理类
 * 主要是为了处理Swatch图片切换
 */
class ProductCard extends HTMLElement {
  constructor() {
    super();

    this.colorSwatches = this.querySelector(".color-swatches");
    if (this.colorSwatches) this.initSwatchHandle();
  }

  /**
   * 初始化颜色选择器
   */
  initSwatchHandle() {
    this.colorSwatches.querySelectorAll(".color-swatch").forEach((swatch) => {
      swatch.addEventListener("click", this.onSwatchClick.bind(this));
    });
  }

  onSwatchClick(event) {
    event.stopPropagation();

    const swatch = event.currentTarget;
    const currentSwatch = this.colorSwatches.querySelector(
      ".color-swatch.active",
    );
    const index = swatch.getAttribute("data-index");

    const variantImage = this.querySelector(
      `.product-card-variant-image[data-index="${index}"]`,
    );
    if (!variantImage) return;

    if (currentSwatch) this.inActiveSwatch(currentSwatch);
    if (swatch !== currentSwatch) this.activeSwatch(swatch, variantImage);
  }

  /**
   * 激活 swatch
   * @param swatch
   * @param image
   */
  activeSwatch(swatch, image) {
    swatch.classList.add("active");
    this.classList.add("has-swatch-active");
    image.classList.remove("hidden");
  }

  /**
   * 取消激活 swatch
   * @param swatch
   */
  inActiveSwatch(swatch) {
    swatch.classList.remove("active");
    this.classList.remove("has-swatch-active");
    this.querySelector(
      `.product-card-variant-image[data-index="${swatch.getAttribute("data-index")}"]`,
    )?.classList.add("hidden");
  }
}
customElements.define("product-card", ProductCard);

/**
 * 粘性滚动效果
 * data-sticky-distance 粘性距离，值越大，粘性时间越久
 * data-top-halt 滚动到顶部的停顿距离，值越大停顿越久
 * data-bottom-halt 滚动到底部的停顿距离，值越大停顿越久
 * data-trigger-position 触发效果的位置，top|center|bottom; 默认值 top，滚动到页面顶部时候触发
 * data-mobile-disabled 手机端禁用
 */
class StickyScroll extends HTMLElement {
  constructor() {
    super();

    // 手机端禁用
    if (this.hasAttribute("data-mobile-disabled") && webvista.isMobileScreen())
      return;

    this.hasListenWindowScroll = false; // 是否已经监听页面滚动
    this.inView = false; // 是否在视区内

    this.preStatus = 0; // 前状态 0: 未开始；1: 效果中；2: 已结束
    this.currentStatus = 0; // 当前状态

    this.stickyContainer = this.querySelector(".sticky-scroll-container");
    if (!this.stickyContainer) return;

    this.changeRatio = 0;
    this.stickyScrollDistance =
      parseInt(this.getAttribute("data-sticky-distance")) || 0; // 粘性效果距离，距离越大，动画时间越长
    this.getTriggerOffset(); // 获取触发位置，可以实现提前触发或者延迟触发
    this.topHalt = parseInt(this.getAttribute("data-top-halt")) || 0; // 上停顿距离
    this.bottomHalt = parseInt(this.getAttribute("data-bottom-halt")) || 0; // 下停顿距离

    if (
      this.stickyScrollDistance > 0 &&
      this.stickyScrollDistance - this.topHalt - this.bottomHalt <= 0
    )
      return;

    this.containerHeight = this.offsetHeight; // 容器高度
    this.boundHandleScrollEffect = this.handleScrollEffect.bind(this); // 绑定滚动效果
    if (!this.hasAttribute("data-initialized")) this.initializeHeight();

    this.observeScrollIntoView();
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
  }

  observeScrollIntoView() {
    this.observer = new IntersectionObserver(
      (entries) => {
        this.inView = entries[0].isIntersecting;
        if (
          this.inView &&
          this.hasAttribute("data-initialized") &&
          this.referencePageScrollY == null
        )
          this.getReferenceScrollY();

        this.inView
          ? this.listenWindowScroll()
          : this.removeListenWindowScroll();
      },
      {
        root: null,
        rootMargin: "0px 0px -200px 0px",
        threshold: 0,
      },
    );

    this.observer.observe(this);
  }

  /**
   * 获取相对于页面顶部的触发位置
   * 可以实现提前触发或者延迟触发
   */
  getTriggerOffset() {
    this.triggerPosition = this.getAttribute("data-trigger-position") || "top";
    const clientHeight = document.documentElement.clientHeight;

    if (this.triggerPosition === "top") {
      this.triggerOffset = 0;
    } else if (this.triggerPosition === "center") {
      this.triggerOffset = clientHeight / 2;
    } else {
      this.triggerOffset = clientHeight;
    }
  }

  /**
   * 获取参照的 scrollY
   * 之后会获取相对的滚动距离
   */
  getReferenceScrollY() {
    const rect = this.getBoundingClientRect();
    const pageScrollTop = window.scrollY || document.documentElement.scrollTop;
    this.referencePageScrollY = pageScrollTop + rect.top - this.triggerOffset;
  }

  /**
   * 监听页面滚动
   */
  listenWindowScroll() {
    if (!this.hasListenWindowScroll) {
      window.addEventListener("scroll", this.boundHandleScrollEffect);
      this.hasListenWindowScroll = true;
    }
  }

  /**
   * 取消页面滚动监听
   */
  removeListenWindowScroll() {
    if (this.hasListenWindowScroll) {
      window.removeEventListener("scroll", this.boundHandleScrollEffect);
      this.hasListenWindowScroll = false;
    }
  }

  /**
   * 设置容器高度
   */
  initializeHeight() {
    this.style.height = `${this.containerHeight + this.stickyScrollDistance}px`;
    this.setAttribute("data-initialized", "true");
  }

  /**
   * 处理滚动效果
   * 有前后停顿效果
   */
  handleScrollEffect() {
    const currentPageScrollY =
      window.scrollY || document.documentElement.scrollTop;
    const rect = this.getBoundingClientRect();

    if (
      rect.top <= this.triggerOffset &&
      rect.bottom > document.documentElement.clientHeight
    ) {
      // 触发效果的滚动范围
      const relativeScrollY = currentPageScrollY - this.referencePageScrollY;
      const ratio =
        (relativeScrollY - this.topHalt) /
        (this.stickyScrollDistance +
          this.triggerOffset -
          this.topHalt -
          this.bottomHalt);
      this.changeRatio = Math.min(1, Math.max(0, ratio));
    } else if (rect.top > this.triggerOffset) {
      this.changeRatio = 0;
    } else {
      this.changeRatio = 1;
    }

    // 当前状态
    if (this.changeRatio <= 0) {
      this.currentStatus = 0; // 未开始
    } else if (this.changeRatio >= 1) {
      this.currentStatus = 2; // 已结束
    } else {
      this.currentStatus = 1; // 效果中
    }

    // 状态变化
    if (this.preStatus !== this.currentStatus) {
      if (this.currentStatus === 1) {
        this.classList.add("sticky-scroll--effect");
        this.classList.remove("sticky-scroll--end");
      } else if (this.currentStatus === 2) {
        this.classList.add("sticky-scroll--end");
        this.classList.remove("sticky-scroll--effect");
      } else {
        this.classList.remove("sticky-scroll--effect");
        this.classList.remove("sticky-scroll--end");
      }
    }

    this.preStatus = this.currentStatus; // 更新状态
    this.style.setProperty("--change-ratio", this.changeRatio);
  }
}
customElements.define("sticky-scroll", StickyScroll);

/**
 * 数字递增效果
 */
class IncrementNumber extends HTMLElement {
  constructor() {
    super();
    // 初始化起始数字
    this.start = 0;
    // 当前显示的数字
    this.currentNumber = 0;

    // 使用 IntersectionObserver 观察元素是否进入视窗
    this.observer = new IntersectionObserver(
      (entries, observer) => {
        if (entries[0].isIntersecting) {
          // 当元素进入视窗时，初始化并开始动画
          this.init();
          // 停止观察
          observer.disconnect();
        }
      },
      {
        root: null, // 使用视窗作为根
        rootMargin: "-300px 0px -300px 0px",
      },
    );

    this.observer.observe(this);
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
  }

  // 初始化目标数字和动画持续时间
  init() {
    // 提取数字部分
    const textContent = this.textContent;
    const numberMatch = textContent.match(/\d+/);
    if (!numberMatch) return;

    this.targetNumber = parseInt(numberMatch[0], 10);

    this.remainingText = textContent.replace(numberMatch[0], "[number]"); // 提取非数字部分
    this.duration = parseInt(this.getAttribute("data-duration"), 10) || 2000;
    this.startTime = Date.now();
    this.updateNumber();
  }

  // 缓动函数，定义非线性进度
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // 更新数字的方法
  updateNumber() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - this.startTime;
    const progress = Math.min(elapsedTime / this.duration, 1);
    const easedProgress = this.easeInOutQuad(progress);
    this.currentNumber = Math.floor(
      this.start + easedProgress * (this.targetNumber - this.start),
    );
    this.textContent = this.remainingText.replace(
      "[number]",
      this.currentNumber,
    );
    if (progress < 1) {
      requestAnimationFrame(this.updateNumber.bind(this));
    }
  }
}
customElements.define("increment-number", IncrementNumber);

/**
 * 动态打字效果
 */
class TypingWords extends HTMLElement {
  constructor() {
    super();
    this.index = 0;

    this.observer = new IntersectionObserver((entries, observer) => {
      if (entries[0].isIntersecting) {
        this.text = this.getAttribute("data-text") || "";
        this.interval = this.getAttribute("data-interval")
          ? parseInt(this.getAttribute("data-interval"))
          : 10;

        this.initTyping();

        observer.disconnect();
      }
    });

    this.observer.observe(this);
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
    this.clearTimers();
  }

  clearTimers() {
    if (this.timer) clearInterval(this.timer);
    if (this.restartTimer) clearTimeout(this.restartTimer);
  }

  initTyping() {
    this.textContent = ""; // 清空内容
    this.index = 0; // 重置索引
    this.timer = setInterval(() => this.type(), 150);
  }

  type() {
    if (this.index < this.text.length) {
      this.textContent += this.text.charAt(this.index);
      this.index++;
    } else {
      clearInterval(this.timer);
      this.restartTimer = setTimeout(
        () => this.initTyping(),
        this.interval * 1000,
      );
    }
  }
}
customElements.define("typing-words", TypingWords);

class CustomCopyText extends HTMLElement {
  constructor() {
    super();

    const debounceHandle = webvista.debounce(() => {
      if (typeof Shopify !== "undefined" && Shopify.designMode) {
        return webvista.popToast(
          window["copyStrings"]["copyDisabled"],
          "warning",
        );
      }

      navigator.clipboard
        .writeText(this.getAttribute("data-text"))
        .then(() => {
          webvista.popToast(this.getAttribute("data-message"), "success");
        })
        .catch((err) => {
          webvista.popToast(window["copyStrings"]["copyFailed"], "error");
        });
    }, 500);

    this.addEventListener("click", debounceHandle);

    // 监听键盘事件，支持空格和回车
    this.addEventListener("keydown", (event) => {
      const key = event.code ? event.code.toUpperCase() : "";

      if (key === "ENTER" || key === "SPACE") {
        event.preventDefault(); // 防止页面滚动（空格键的默认行为）
        debounceHandle(); // 执行复制操作
      }
    });
  }
}
customElements.define("custom-copy-text", CustomCopyText);

class LinkForm extends HTMLElement {
  constructor() {
    super();

    // 使用事件委托来处理点击事件，提高性能
    this.addEventListener("click", this.onItemClick.bind(this));
  }

  /**
   * @method onItemClick
   * @description 链接的点击事件处理函数。阻止默认行为，设置输入值，并提交表单。
   * @param {Event} event - 点击事件对象
   */
  onItemClick(event) {
    if (event.target.tagName !== "A") return;

    event.preventDefault();
    const form = this.querySelector("form");
    if (!form) return;

    const input = this.querySelector("input.link-value");
    if (input) input.value = event.target.dataset.value;

    form.submit();
  }
}
customElements.define("link-form", LinkForm);

/**
 * 查看更多
 */
class ShowMoreButton extends HTMLElement {
  constructor() {
    super();

    this.parentDisplay = this.closest(".show-more-parent");
    if (!this.parentDisplay) return;

    this.addEventListener("click", (event) => {
      this.toggleItems(event);
    });
  }

  /**
   * 切换隐藏元素状态
   * @param event
   */
  toggleItems(event) {
    this.querySelectorAll(".label-text").forEach((element) =>
      element.classList.toggle("hidden"),
    );
    this.parentDisplay
      .querySelectorAll(".show-more-item")
      .forEach((item) => item.classList.toggle("hidden"));
  }
}
customElements.define("show-more-button", ShowMoreButton);