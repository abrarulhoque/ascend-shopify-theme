if(!customElements.get('countdown-timer')) {
    customElements.define('countdown-timer', class CountdownTimer extends HTMLElement {
        constructor() {
            super();
            this.init();
        }

        init() {
            this.endTime = this.getAttribute('data-endtime');
            let regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
            if(!regex.test(this.endTime)) return;

            this.shopTimezone = this.getAttribute('data-shop-timezone');
            regex = /^[+-]\d{4}$/
            if(!regex.test(this.shopTimezone)) return;

            this.hideWhenEnd = this.hasAttribute('data-hide-when-end');

            this.timerElement = this.querySelector('.countdown-inner');
            this.messageElement = this.querySelector('.countdown-message');
            this.elements = {
                day: this.querySelector('.day'),
                hour: this.querySelector('.hour'),
                minute: this.querySelector('.minute')
            };


            const endTimeStamp = this.getEndTimeStamp();

            this.doCountDown(endTimeStamp);
            this.timer = setInterval(()=>{
                this.doCountDown(endTimeStamp);
            }, 60000);
        }

        /**
         * 获取结束时间的时间戳格式，结束时间指定时区
         * @returns {number}
         */
        getEndTimeStamp() {
            // 分解日期时间字符串
            const [date, time] = this.endTime.split(' ');
            const [year, month, day] = date.split('-');
            const [hour, minute] = time.split(':');

            // 将给定的时间和日期转换为Date对象（假定为UTC时间）
            const dateObj = new Date(Date.UTC(year, month - 1, day, hour, minute));

            // 时区偏移量转换为分钟
            const sign = this.shopTimezone[0] === '-' ? -1 : 1; // 确定时区偏移的符号
            const offsetHours = parseInt(this.shopTimezone.substring(1, 3), 10);
            const offsetMinutes = parseInt(this.shopTimezone.substring(3, 5), 10);
            const totalOffsetMinutes = sign * (offsetHours * 60 + offsetMinutes);

            // 将时区偏移量应用于UTC时间，得到实际时间
            // 注意：此处应从UTC时间减去偏移量，因为JS中的时间戳是基于UTC的
            return dateObj.getTime() - totalOffsetMinutes * 60000;
        }

        /**
         * 倒计时
         * @param endTimeStamp
         */
        doCountDown(endTimeStamp) {
            const nowTimeStamp = Date.now();
            let delta = endTimeStamp - nowTimeStamp; // 毫秒数差值
            if(delta < 0) {
                this.messageElement.classList.remove('hidden'); // 结束后显示信息
                if(this.hideWhenEnd) this.timerElement.classList.add('hidden'); // 结束后隐藏计时器
                return clearInterval(this.timer);
            }

            // 计算天数、小时、分钟和秒数
            const days = Math.floor(delta / (1000 * 60 * 60 * 24));
            delta -= days * (1000 * 60 * 60 * 24);

            const hours = Math.floor(delta / (1000 * 60 * 60));
            delta -= hours * (1000 * 60 * 60);

            const minutes = Math.floor(delta / (1000 * 60));
            delta -= minutes * (1000 * 60);

            this.elements.day.innerText = days;
            this.elements.hour.innerText = String(hours).padStart(2, '0');
            this.elements.minute.innerText = String(minutes).padStart(2, '0');
        }
    });
}