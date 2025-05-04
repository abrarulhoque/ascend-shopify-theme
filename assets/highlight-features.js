if(!customElements.get('highlight-features')) {
    customElements.define('highlight-features', class HighlightFeatures extends HTMLElement {
        constructor() {
            super();

            this.querySelector('.highlight-spots').addEventListener('click', (event)=>{
                if(event.target.classList.contains('spot')) {
                    this.handleSpotClick(event.target);
                }
            });

            const boundHandleFeatureClick = this.handleFeatureClick.bind(this);
            this.querySelectorAll('.feature').forEach(feature=>{
                feature.addEventListener('click', boundHandleFeatureClick);
            });
        }


        handleSpotClick(spot) {
            this.querySelector('.spot[aria-selected="true"]')?.removeAttribute('aria-selected');
            spot.setAttribute('aria-selected', 'true');

            this.querySelector('.feature.active')?.classList.remove('active');
            document.getElementById(spot.getAttribute('aria-describedby'))?.classList.add('active');
        }

        handleFeatureClick(event) {
            this.querySelector('.spot[aria-selected="true"]')?.removeAttribute('aria-selected');
            this.querySelector(`.spot[aria-describedby="${event.currentTarget.id}"]`).setAttribute('aria-selected', 'true');

            this.querySelector('.feature.active')?.classList.remove('active');
            event.currentTarget.classList.add('active');
        }
    });
}