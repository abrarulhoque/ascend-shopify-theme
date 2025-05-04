if (!customElements.get("media-gallery")) {
  customElements.define(
    "media-gallery",
    class MediaGallery extends HTMLElement {
      constructor() {
        super();

        this.ifMediaStack = this.hasAttribute("data-media-stack");
        this.lastVariantMediaId = parseInt(
          this.querySelector(".is-current-variant-media").dataset.mediaId,
        ); // 当前选择的产品变体对应的MediaId

        if (!this.thumbnails) return;
        this.thumbnails
          .querySelectorAll("[data-target]")
          .forEach((thumbnail) => {
            thumbnail.addEventListener(
              "click",
              this.onThumbnailClick.bind(this),
            );
          });

        this.addEventListener("sliderChanged", this.onSlideChanged.bind(this));
      }

      get viewer() {
        return this.querySelector('[id^="Gallery-Viewer"]');
      }

      get thumbnails() {
        return this.querySelector('[id^="Gallery-Thumbnail-Slider"]');
      }

      /**
       * 媒体切换事件
       * @param event
       */
      onSlideChanged(event) {
        if (!event || !event.detail) return;

        const mediaId = event.detail.currentElement.dataset.mediaId;

        // 滚动缩略图到当前媒体
        const thumbnail = this.thumbnails.querySelector(
          `[data-target="${mediaId}"]`,
        );
        if (!thumbnail) return;

        if (!thumbnail.querySelector(".thumbnail-media").hasAttribute("aria-current")) {
          this.setActiveThumbnail(thumbnail);
        }
        if (this.thumbnails.initSliderStatus)
          this.thumbnails.moveElementToOptimalPosition(thumbnail); // 将缩略图元素移动到合适的位置
      }

      /**
       * 点击缩略图处理
       */
      onThumbnailClick(event) {
        const thumbnail = event.currentTarget;
        this.setActiveThumbnail(thumbnail);

        this.changeMedia(thumbnail.getAttribute("data-target"));
      }

      /**
       * 更新相册，如果需要隐藏其它变体图片，需要重新安装轮播组件
       * @param currentVariantMediaId 当前变体的 Featured Media Id
       */
      updateGallery(currentVariantMediaId) {
        if (
          currentVariantMediaId === this.lastVariantMediaId ||
          currentVariantMediaId == null
        )
          return;
        this.lastVariantMediaId = currentVariantMediaId;

        // 修改当前变体关联的媒体
        this.viewer
          .querySelectorAll(".is-current-variant-media")
          .forEach((element) =>
            element.classList.remove("is-current-variant-media"),
          );
        this.viewer
          .querySelectorAll(`[data-media-id="${currentVariantMediaId}"]`)
          .forEach((element) =>
            element.classList.add("is-current-variant-media"),
          );

        if (this.thumbnails) {
          this.thumbnails
            .querySelector(".is-current-variant-thumbnail")
            ?.classList.remove("is-current-variant-thumbnail");
          this.thumbnails
            .querySelector(`[data-target="${currentVariantMediaId}"]`)
            ?.classList.add("is-current-variant-thumbnail");
        }

        // 如果开启了隐藏其它变体设置
        if (this.hasAttribute("data-hide-variants")) {
          // 切换当前变体的媒体组
          const groupName = this.viewer.querySelector(
            `[data-media-id="${currentVariantMediaId}"]`,
          )?.dataset.mediaGroup;
          this.viewer
            .querySelectorAll(".is-current-variant-media-group")
            .forEach((element) =>
              element.classList.remove("is-current-variant-media-group"),
            );
          if (groupName) {
            this.viewer
              .querySelectorAll(`[data-media-group='${groupName}']`)
              .forEach((element) => {
                element.classList.add("is-current-variant-media-group");
              });
          }

          if (this.thumbnails) {
            this.thumbnails
              .querySelectorAll(".is-current-variant-thumbnail-group")
              .forEach((element) =>
                element.classList.remove("is-current-variant-thumbnail-group"),
              );
            if (groupName) {
              this.thumbnails
                .querySelectorAll(`[data-thumbnail-group='${groupName}']`)
                .forEach((element) => {
                  element.classList.add("is-current-variant-thumbnail-group");
                });
            }
          }

          // 如果启用了隐藏其它变体媒体，需要重新初始化轮播
          if (!this.ifMediaStack) {
            this.viewer.reInstall();
            if (this.thumbnails) this.thumbnails.reInstall();
          }
        }

        this.changeMedia(currentVariantMediaId);

        // 手机端，当媒体切换的时候，返回页面顶部
        if (webvista.isMobileScreen()) {
          webvista.scrollElementToHeaderBottom(this, 16);
        }
      }

      /**
       * 设置活跃媒体
       * @param mediaId
       */
      changeMedia(mediaId) {
        const activeMedia = this.viewer.querySelector(
          `[data-media-id="${mediaId}"]`,
        );

        if (this.ifMediaStack) {
          // 如果是 Stack 布局，需要将当前变体 Featured Media 放置最前面
          activeMedia.parentElement.prepend(activeMedia);
        } else {
          // 轮播模式，切换当前轮播
          if (this.viewer.initSliderStatus)
            this.viewer.slideByElement(activeMedia);
        }
      }

      /**
       * 设置活跃缩略图
       * @param thumbnail
       */
      setActiveThumbnail(thumbnail) {
        if (!this.thumbnails || !thumbnail) return;

        this.thumbnails
          .querySelectorAll(".thumbnail-media")
          .forEach((element) => element.removeAttribute("aria-current"));

        thumbnail.querySelector("button").setAttribute("aria-current", true);
      }
    }
  );
}
