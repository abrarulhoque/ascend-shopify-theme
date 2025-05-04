if(!customElements.get('search-drawer')) {
  customElements.define(
    "search-drawer",
    class SearchDrawer extends Drawer {
      constructor() {
        super();

        this.recommendationByHistory = this.querySelector('recommendation-by-history');
      }

      show(opener) {
        super.show(opener);

        this.recommendationByHistory?.showContent();
      }

      hide() {
        super.hide();

        this.recommendationByHistory?.abortFetch();
      }
    },
  );
}