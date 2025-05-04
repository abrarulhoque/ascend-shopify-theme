/**
 * 处理添加购物车操作
 */
if (!customElements.get('product-form')) {
    customElements.define(
        'product-form',
        class ProductForm extends HTMLElement {
            constructor() {
                super();
                this.form = this.querySelector('form');
                if(!this.form) return;

                this.isloading = false;
                this.error = false;
                this.variantIdInput.disabled = false;
                this.form.addEventListener('submit', this.onSubmitHandler.bind(this)); // 添加提交购物车监听

                this.addCartButtons = this.querySelectorAll('button[type="submit"]'); // 添加购物车按钮，可能有多处按钮

                this.cartDrawer = document.getElementById('Cart-Drawer');
                if (this.cartDrawer && !this.cartDrawer.hasAttribute('data-status-silence')) this.addCartButtons.forEach(button=>{
                    button.setAttribute('aria-haspopup', 'dialog');
                    button.setAttribute('aria-expanded', 'false');
                    button.setAttribute('aria-controls', 'Cart-Drawer');
                });

                this.errorMessageWrapper = document.getElementById(`Product-Form-Error-Message-${this.dataset.section}`);
                // 快速购物弹窗
                this.quickAddDrawer = this.closest('product-side-drawer');

                // 迷你结账
                this.miniChecker = document.getElementById(`Product-Mini-Checkout-${this.dataset.section}`);
                if(this.miniChecker) {
                    this.miniCheckerObserver = new IntersectionObserver((entries, observer)=>{
                        if(entries[0].isIntersecting) {
                            this.hideMiniCheck();
                        } else if (entries[0].boundingClientRect.top < 0){
                            this.showMiniCheck();
                        }
                    }, {
                        root: null,
                        rootMargin: '-200px 0px 0px 0px'
                    });

                    this.miniCheckerObserver.observe(this);
                }
            }

            disconnectedCallback() {
                if(this.miniCheckerObserver) this.miniCheckerObserver.disconnect();
            }

            get variantIdInput() {
                return this.form.querySelector('[name=id]');
            }
            
            /**
             * 是否隐藏错误信息
             * 当产品是礼品卡的时候，隐藏错误信息
             * @returns {boolean}
             */
            get hideErrors() {
                return this.dataset.hideErrors === 'true';
            }

            /**
             * 处理点击提交购物车
             * @param event
             */
            onSubmitHandler(event) {
                if(this.isloading) return;
                event.preventDefault();

                if(Array.from(this.addCartButtons).find(button => button.hasAttribute('disabled'))) return;

                this.handleErrorMessage();
                this.startLoading();

                const config = webvista.fetchConfig('javascript');
                config.headers['X-Requested-With'] = 'XMLHttpRequest';
                delete config.headers['Content-Type'];  /* 浏览器会自动为 formData 对象生成带有边界(boundary)的 multipart/form-data 类型*/

                const formData = new FormData(this.form);
                formData.append('sections', this.getSectionsToRender().map((section)=>section.section).join());
                formData.append('sections_url', window.location.pathname);
                config.body = formData;

                fetch(`${window['routes']['cart_add_url']}`, config)
                    .then((response) => {
                        return response.json();
                    })
                    .then((response) => {
                        if (response.status) {
                            webvista.publish(PUB_SUB_EVENTS.cartError, {
                                source: 'product-form',
                                productVariantId: formData.get('id'),
                                errors: response.errors || response.description,
                                message: response.message,
                            });
                            this.handleErrorMessage(response.description);
                            return this.error = true;
                        }
                        this.error = false;

                        // 动态更新Sections内容
                        SectionDynamicUpdate.updateSections(this.getSectionsToRender(), response['sections']);

                        webvista.publish(PUB_SUB_EVENTS.cartUpdate, {
                            source: 'product-form',
                            productVariantId: formData.get('id'),
                            cartData: response,
                        });

                        if(this.cartDrawer && !this.cartDrawer.hasAttribute('data-status-silence')) {
                            // 打开抽屉
                            this.cartDrawer.show(event.submitter);
                        } else {
                            return window.location = window['routes']['cart_url'];
                        }
                    })
                    .catch((e) => {
                        this.handleErrorMessage(window['accessibilityStrings']['unknownError']);
                        this.error = true;
                    })
                    .finally(()=>{
                        this.endLoading();
                        // 关闭迷你结账
                        this.hideMiniCheck();
                    });
            }

            /**
             * 获取需要重新渲染的位置
             * @returns {[{section: string, selector: string, id: string}]}
             */
            getSectionsToRender() {
                const sections = [
                    {
                        id: 'Cart-Icon-Bubble',
                        section: 'cart-icon-bubble',
                        selector: '.shopify-section'
                    }
                ];

                if(this.cartDrawer && !this.cartDrawer.hasAttribute('data-status-silence')) {
                    sections.push({
                        id: 'Cart-Drawer',
                        section: this.cartDrawer.dataset.section,
                        selector: '#Cart-Drawer-Details',
                    });
                }

                return sections;
            }

            /**
             * 错误显示
             * @param errorMessage
             */
            handleErrorMessage(errorMessage = null) {
                if (this.hideErrors || !this.errorMessageWrapper) return;

                this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);
                this.errorMessageWrapper.textContent = errorMessage ? errorMessage : '';
            }

            startLoading() {
                this.isloading = true;

                this.addCartButtons.forEach(button => {
                    button.setAttribute('disabled', 'disabled');
                    button.classList.add('loading');
                });
            }

            endLoading() {
                this.isloading = false;

                this.addCartButtons.forEach(button => {
                    button.removeAttribute('disabled');
                    button.classList.remove('loading');
                });

                // 关闭快速预览
                if(!this.error && this.quickAddDrawer) {
                    this.quickAddDrawer.hide();
                }
            }

            showMiniCheck() {
                if(this.miniChecker) this.miniChecker.classList.add('active');
            }

            hideMiniCheck() {
                if(this.miniChecker) this.miniChecker.classList.remove('active');
            }
        }
    );
}
