if(!customElements.get('autopopup-modal')) {
    customElements.define('autopopup-modal', class AutopopupModal extends ModalDialog {
        constructor() {
            super();

            this.delay =  parseInt(this.getAttribute('data-delay'));
            this.frequency = parseInt(this.getAttribute('data-frequency'));

            const lastShowTime = webvista.getCookie('popup_newsletter_frequency');

            // 将频率转换为秒（1天 = 86400秒）
            const frequencyInSeconds = this.frequency * 86400;
            // 获取当前时间的时间戳，单位也是秒
            const currentTime = Math.floor(Date.now() / 1000);

            // 检查当前时间与上次显示时间的差是否大于等于设置的频率
            if (!window.Shopify.designMode && (lastShowTime == null || currentTime - lastShowTime >= frequencyInSeconds)) {
                webvista.setCookie('popup_newsletter_frequency', currentTime.toString());
                setTimeout(() => {
                    this.show();
                }, this.delay * 1000);
            }
        }
    });
}

if(!customElements.get('autopopup-age-verifier')) {
    customElements.define('autopopup-age-verifier', class AutopopupAgeVerifier extends ModalDialog {
        constructor() {
            super();

            this.boundHandleDecline = this.handleDecline.bind(this);
            this.boundHandleSatisfy = this.handleSatisfy.bind(this);
            this.boundHandleReturn = this.handleReturn.bind(this);

            const debugModel = this.hasAttribute('data-debug-model'); // 调试模式，强制每次刷新页面都要弹出年龄验证
            const lastVerified = webvista.getCookie('autopopup_age_verifier');
            const currentTime = Math.floor(Date.now() / 1000);

            if(debugModel || !window.Shopify.designMode && (lastVerified == null || currentTime - lastVerified > 7 * 86400)) {
                this.show();
            }
        }

        show(){
            super.show();

            this.querySelector('button[data-declined]')?.addEventListener('click', this.boundHandleDecline);
            this.querySelector('button[data-satisfied]')?.addEventListener('click', this.boundHandleSatisfy);
        }

        hide() {
            super.hide();

            this.querySelector('button[data-declined]')?.removeEventListener('click', this.boundHandleDecline);
            this.querySelector('button[data-satisfied]')?.removeEventListener('click', this.boundHandleSatisfy);
            this.querySelector('button[data-return]')?.removeEventListener('click', this.boundHandleReturn);
        }

        /**
         * 处理不满足条件
         */
        handleDecline() {
            this.classList.add('age-verifier--has-decline');
            this.querySelector('button[data-return]')?.addEventListener('click', this.boundHandleReturn);
        }

        /**
         * 处理满足条件
         */
        handleSatisfy() {
            const currentTime = Math.floor(Date.now() / 1000);
            webvista.setCookie('autopopup_age_verifier', currentTime);
            this.hide();
        }

        /**
         * 处理返回问题选择页面
         */
        handleReturn() {
            this.classList.remove('age-verifier--has-decline');
        }
    });
}