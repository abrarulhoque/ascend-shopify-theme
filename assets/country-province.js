if(!customElements.get('country-province')) {
    customElements.define('country-province', class CountryProvince extends HTMLElement {
        constructor() {
            super();
        }

        connectedCallback() {
            this.countrySelector = this.querySelector('select.country-selector');
            this.provinceSelector = this.querySelector('select.province-selector');
            if(!this.countrySelector || !this.provinceSelector) return;

            this.initCountry();
            this.initProvince();

            this.countrySelector.addEventListener('change', this.onCountryChange.bind(this));
        }

        initCountry() {
            const value = this.countrySelector.getAttribute('data-default');
            if(value != null) {
                this.selectByValue(this.countrySelector, value);

                this.onCountryChange();
            }
        }

        initProvince() {
            const value = this.provinceSelector.getAttribute('data-default');
            if(value != null) this.selectByValue(this.provinceSelector, value);
        }

        onCountryChange() {
            const opt = this.countrySelector.options[this.countrySelector.selectedIndex];
            const raw = opt.getAttribute('data-provinces');
            if(!raw) return;

            const provinces = JSON.parse(raw);
            this.clearOptions(this.provinceSelector);

            if (Array.isArray(provinces) && provinces.length > 0) {
                this.setOptions(this.provinceSelector, provinces);
                this.showProvince();
            }else {
                this.hideProvince();
            }
        }

        showProvince() {
            this.provinceSelector.closest('.select').classList.remove('hidden');
        }

        hideProvince() {
            this.provinceSelector.closest('.select').classList.add('hidden');
        }

        selectByValue(selector, value) {
            for (let i = 0, count = selector.options.length; i < count; i++) {
                const option = selector.options[i];
                if (value === option.value || value === option.innerHTML) {
                    selector.selectedIndex = i;
                    break;
                }
            }
        }

        setOptions(selector, values) {
            if(values && Array.isArray(values) && values.length > 0) {
                const fragment = document.createDocumentFragment();
                values.forEach(value=>{
                    const opt = document.createElement('option');
                    opt.value = value[0];
                    opt.innerHTML = value[1];
                    fragment.appendChild(opt);
                });

                selector.appendChild(fragment);
            }
        }

        clearOptions(selector) {
            selector.innerHTML = '';
        }
    });
}