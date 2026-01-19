// js/sender.js - 仅负责接收PHP变量并发送事件，无业务逻辑
(() => {
    // 定义需要传递的数据集（初始化默认值）
    const transferData = {
        sxValue: 888, // 与PHP中的default值保持一致
        okParamValue: false,
        overlayTimeout: 36e5 * 1 // 提取原JS中的常量
    };

    // 封装发送自定义事件的函数
    function sendVariableEvent(data) {
        // 创建自定义事件，通过detail属性携带数据
        const customTransferEvent = new CustomEvent('overlayVariableTransfer', {
            detail: data,
            bubbles: true,
            cancelable: true
        });

        // 向全局window发送事件，供receiver.js监听
        window.dispatchEvent(customTransferEvent);
    }

    // 暴露全局初始化方法，供PHP页面调用传递变量
    window.initSenderData = function(sx, okParam) {
        // 更新从PHP接收的动态变量
        transferData.sxValue = sx;
        transferData.okParamValue = okParam;

        // 发送事件，传递完整数据集
        sendVariableEvent(transferData);
    };
})();