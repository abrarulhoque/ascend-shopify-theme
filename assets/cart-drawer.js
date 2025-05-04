if (!customElements.get("cart-drawer")) {
  customElements.define(
    "cart-drawer",
    class CartDrawer extends Drawer {
      constructor() {
        super();
      }

      show(opener) {
        super.show(opener);

        // 由于购物车的Dom内容会被替换，所以需要重新获取
        const recommendationByHistory = this.querySelector(
          "recommendation-by-history",
        );
        if (recommendationByHistory) recommendationByHistory.showContent();
      }

      hide() {
        super.hide();

        const recommendationByHistory = this.querySelector(
          "recommendation-by-history",
        );
        if (recommendationByHistory) recommendationByHistory.abortFetch();
      }
    },
  );
}
