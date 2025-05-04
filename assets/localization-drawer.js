if(!customElements.get('localization-drawer')) {
  customElements.define('localization-drawer', class localizationDrawer extends Drawer {
    constructor() {
      super();

      this.searchInput = document.getElementById('Localization-Search');
      if(!this.searchInput) return;

      this.searchField = this.searchInput.parentElement;
      this.resetButton = this.searchField.querySelector('.reset-button');
      this.regionCountry = document.getElementById('Region-Country-Filter-Results');
      this.regionLanguage = document.getElementById('Region-Language-Filter-Results');

      this.previousValue = '';

      this.searchInput.addEventListener('keyup', this.onKeyup.bind(this));
      this.resetButton.addEventListener('click', this.resetFilter.bind(this));
    }

    /**
     * 处理搜素过滤
     */
    onKeyup() {
      const searchValue = webvista.normalizeString(this.searchInput.value);
      if(searchValue === this.previousValue) return;

      this.previousValue = searchValue;
      this.toggleResetButton();

      const allCountries = this.querySelectorAll('.country-list > li');
      let visibleCountryCount = 0;
      allCountries.forEach(element=>{
        const countryName = webvista.normalizeString(element.querySelector('.country').textContent);
        if (countryName.indexOf(searchValue) > -1) {
          element.classList.remove('hidden');
          visibleCountryCount++;
        } else {
          element.classList.add('hidden');
        }
      });
      if(this.regionCountry) this.regionCountry.textContent = window['accessibilityStrings']['countrySelectorFilterCount'].replace('[count]', visibleCountryCount);

      const allLanguages = this.querySelectorAll('.language-list > li');
      let visibleLanguageCount = 0;
      allLanguages.forEach(element=>{
        const languageName = webvista.normalizeString(element.querySelector('.language').textContent);
        if (languageName.indexOf(searchValue) > -1) {
          element.classList.remove('hidden');
          visibleLanguageCount++;
        } else {
          element.classList.add('hidden');
        }
      });
      if(this.regionLanguage) this.regionLanguage.textContent = window['accessibilityStrings']['languageSelectorFilterCount'].replace('[count]', visibleLanguageCount);

      // 重新进入焦点陷阱，防止逃逸
      const drawerTrap = this.querySelector('[data-trap]');
      if(drawerTrap) webvista.trapFocus(drawerTrap, this.searchInput);
    }

    resetFilter() {
      this.searchInput.value = '';
      this.onKeyup();
      this.searchInput.focus();
    }

    toggleResetButton() {
      this.resetButton.classList.toggle('hidden', !this.searchInput.value);
    }
  });
}