if(!customElements.get('media-wall')) {
  customElements.define(
    "media-wall",
    class MediaWall extends Slider {
      constructor() {
        super();
      }

      hookAfterInstall() {
        this.playVideosWhenVisible();
      }

      updateInfo() {
        super.updateInfo();
        this.playVideosWhenVisible();
      }

      playVideosWhenVisible() {
        // 判断是否进入视口，进入的播放，离开的暂停
        this.sliderItems.forEach(element=>{
          if(this.isVisibleSlide(element)) {
            webvista.playAllMedia(element);
          } else {
            webvista.pauseAllMedia(element);
          }
        })
      }
    },
  );
}