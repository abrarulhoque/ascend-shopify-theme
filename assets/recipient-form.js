if (!customElements.get('recipient-form')) {
    customElements.define(
        'recipient-form',
        class RecipientForm extends HTMLElement {
            constructor() {
                super();

                this.recipientFieldsLiveRegion = this.querySelector(`#Recipient-Fields-Live-Region-${this.dataset.section}`);

                // 打开表单开关
                this.checkboxInput = this.querySelector(`#Recipient-Checkbox-${this.dataset.section}`);
                this.checkboxInput.disabled = false;
                this.checkboxInput.addEventListener('change', this.onChange.bind(this));

                // 表单元素
                this.emailInput = this.querySelector(`#Recipient-Email-${this.dataset.section}`);
                this.nameInput = this.querySelector(`#Recipient-Name-${this.dataset.section}`);
                this.messageInput = this.querySelector(`#Recipient-Message-${this.dataset.section}`);
                this.sendonInput = this.querySelector(`#Recipient-Send-On-${this.dataset.section}`);

                // 设置时区
                this.offsetProperty = document.getElementById(`Recipient-Timezone-Offset-${this.dataset.section}`);
                if (this.offsetProperty) this.offsetProperty.value = new Date().getTimezoneOffset().toString();

                // Todo 什么意思？
                this.hiddenControlField = this.querySelector(`#Recipient-Control-${this.dataset.section}`);
                this.hiddenControlField.disabled = true;

                // 显示错误
                this.errorMessageWrapper = this.querySelector('.error-message-wrapper');
                this.errorMessageList = this.errorMessageWrapper?.querySelector('.message-list');

                // 产品变体id
                this.currentProductVariantId = this.dataset.productVariantId;
            }

            cartUpdateUnsubscriber = undefined;
            variantChangeUnsubscriber = undefined;
            cartErrorUnsubscriber = undefined;

            connectedCallback() {
                // 提交购物车更新
                this.cartUpdateUnsubscriber = webvista.subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
                    if (event.source === 'product-form' && event.productVariantId.toString() === this.currentProductVariantId) {
                        this.resetRecipientForm();
                    }
                });

                // 提交购物车失败
                this.cartUpdateUnsubscriber = webvista.subscribe(PUB_SUB_EVENTS.cartError, (event) => {
                  if (event.source === 'product-form' && event.productVariantId.toString() === this.currentProductVariantId) {
                    this.displayErrorMessage(event.errors);
                  }
                });

                // 修改变体id
                this.variantChangeUnsubscriber = webvista.subscribe(PUB_SUB_EVENTS.variantChange, (event) => {

                    if (event.data.section === this.dataset.section) {
                        this.currentProductVariantId = event.data.variant.id.toString();
                    }
                });
            }

            disconnectedCallback() {
                if (this.cartUpdateUnsubscriber) {
                    this.cartUpdateUnsubscriber();
                }

                if (this.variantChangeUnsubscriber) {
                    this.variantChangeUnsubscriber();
                }

                if (this.cartErrorUnsubscriber) {
                    this.cartErrorUnsubscriber();
                }
            }

            onChange() {
                if (this.checkboxInput.checked) {
                    this.enableInputFields();
                    this.recipientFieldsLiveRegion.innerText = window['accessibilityStrings']['recipientFormExpanded'];
                } else {
                    this.clearInputFields();
                    this.disableInputFields();
                    this.clearErrorMessage();
                    this.recipientFieldsLiveRegion.innerText = window['accessibilityStrings']['recipientFormCollapsed'];
                }
            }

            inputFields() {
                return [this.emailInput, this.nameInput, this.messageInput, this.sendonInput];
            }

            disableFields() {
                return [...this.inputFields(), this.offsetProperty];
            }

            // 情况表单输入
            clearInputFields() {
                this.inputFields().forEach((field) => (field.value = ''));
            }

            // 激活输入表单
            enableInputFields() {
                this.disableFields().forEach((field) => (field.disabled = false));
            }

            // 禁用输入表单
            disableInputFields() {
                this.disableFields().forEach((field) => (field.disabled = true));
            }

            /**
             * 显示错误信息
             * @param errors 错误对象
             */
            displayErrorMessage(errors) {
                this.clearErrorMessage();

                this.errorMessageWrapper.hidden = false;
                if (typeof errors === 'object') {
                    return Object.entries(errors).forEach(([key, value]) => {
                        const errorMessageId = `Recipient-Form-${key}-${this.dataset.section}-Error`;
                        const fieldSelector = `#Recipient-${key}-${this.dataset.section}`;
                        const message = `${value.join(', ')}`;

                        if (this.errorMessageList) {
                            this.errorMessageList.appendChild(this.createErrorListItem(fieldSelector, errorMessageId, message));
                        }

                        const inputElement = this[`${key}Input`];
                        if (!inputElement) return;

                        inputElement.setAttribute('aria-invalid', true);
                        inputElement.setAttribute('aria-describedby', errorMessageId);
                        inputElement.closest('.field')?.classList.add('field-error');
                    });
                }
            }

            /**
             * 创建错误记录
             * @param target 目标表单输入元素
             * @param id
             * @param message 错误消息
             * @returns {HTMLLIElement}
             */
            createErrorListItem(target, id, message) {
                const li = document.createElement('li');
                li.id = id;
                li.textContent = message;

                return li;
            }

            /**
             * 清空错误消息
             */
            clearErrorMessage() {
                this.errorMessageWrapper.hidden = true;

                if (this.errorMessageList) this.errorMessageList.innerHTML = '';

                [this.emailInput, this.messageInput, this.nameInput, this.sendonInput].forEach((inputElement) => {
                    inputElement.setAttribute('aria-invalid', false);
                    inputElement.removeAttribute('aria-describedby');
                    inputElement.closest('.field')?.classList.remove('field-error');
                });
            }

            /**
             * 重置表单
             */
            resetRecipientForm() {
                if (this.checkboxInput.checked) {
                    this.checkboxInput.checked = false;
                    this.clearInputFields();
                    this.disableInputFields();
                    this.clearErrorMessage();
                    this.recipientFieldsLiveRegion.innerText = window['accessibilityStrings']['recipientFormCollapsed'];
                }
            }
        }
    );
}
