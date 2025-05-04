if (!customElements.get('pickup-availability')) {
  customElements.define('pickup-availability',
    class PickupAvailability extends HTMLElement {
      constructor() {
          super();

          if (!this.hasAttribute('available')) return;

          const variantId = this.dataset.variantId;
          this.fetchAvailability(variantId);
      }

      /**
       * 获取支持的本地取货店铺列表
       */
      fetchAvailability(variantId) {
        let rootUrl = this.dataset.rootUrl;
        if (!rootUrl.endsWith('/')) {
          rootUrl = rootUrl + '/';
        }
        const variantSectionUrl = `${rootUrl}variants/${variantId}/?section_id=pickup-availability`;

        webvista.fetchHtml(variantSectionUrl).then(html=>{
          this.renderPreview(html);
        });
      }


      /**
       * 渲染页面
       * @param resourceDom
       */
      renderPreview(resourceDom) {
        if (!resourceDom.querySelector('.pickup-availability-preview')) {
          return this.renderError();
        }
        // 需要先插入抽屉，否则抽屉打开器无法初始化成功
        const pickupDrawer = document.getElementById('Pickup-Availability-Drawer');
        if(pickupDrawer) {
          pickupDrawer.querySelector('.drawer-content').innerHTML = resourceDom.querySelector('#Pickup-Availability-Drawer .drawer-content').innerHTML;
        }else {
          document.body.appendChild(resourceDom.querySelector('#Pickup-Availability-Drawer'));
        }

        this.innerHTML = resourceDom.querySelector('.pickup-availability-preview').outerHTML;
        this.setAttribute('available', '');
      }

      /**
       * 处理错误
       */
      renderError() {
        this.innerHTML = '';
        this.removeAttribute('available');
      }
    }
  );
}
