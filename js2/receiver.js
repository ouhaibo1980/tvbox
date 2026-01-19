// js/receiver.js - 仅负责监听事件、执行核心业务逻辑，无外部依赖
(() => {
    // 1. 监听window上的自定义事件，接收sender.js传递的数据
    window.addEventListener('overlayVariableTransfer', (e) => {
        // 从事件对象中提取传递的完整数据
        const { sxValue, okParamValue, overlayTimeout } = e.detail;

        // 2. 执行核心业务逻辑（与原内嵌JS功能完全一致）
        executeOverlayLogic(sxValue, okParamValue, overlayTimeout);
    });

    // 3. 封装完整的业务逻辑函数（封闭性强，可独立维护）
    function executeOverlayLogic(sx, okParam, OVERLAY_TIMEOUT) {
        // 禁用开发者工具（原逻辑保留）
        const disableDevtools = new Proxy({}, {
            get: () => {
                window.location.reload();
                return "";
            }
        });
        console.log(disableDevtools);
        console.clear();

        // 获取遮罩层元素并添加容错处理
        const overlay = document.getElementById("overlay");
        if (!overlay) return;

        let clicks = 0;
        document.body.style.overflow = "hidden";

        // 判断是否需要显示遮罩层
        const shouldShowResult = (() => {
            if (okParam) {
                return false;
            }
            const lastClick = localStorage.getItem("lastClick");
            return !lastClick || (Date.now() - lastClick) > OVERLAY_TIMEOUT;
        })();

        // 初始化遮罩层显示状态
        overlay.style.display = shouldShowResult ? "flex" : "none";
        if (!shouldShowResult) {
            document.body.style.overflow = "auto";
        }

        // 遮罩层点击事件（达到指定点击次数后隐藏）
        overlay.addEventListener("click", () => {
            if (++clicks >= sx) {
                overlay.style.opacity = "0";
                document.body.style.overflow = "auto";
                setTimeout(() => overlay.remove(), 500);
                localStorage.setItem("lastClick", Date.now());
            }
        });

        // 禁用右键菜单
        document.addEventListener("contextmenu", (e) => e.preventDefault());

        // 禁用开发者工具快捷键（原逻辑保留）
        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey && [85, 83].includes(e.keyCode)) || e.keyCode === 123) {
                e.preventDefault();
                e.returnValue = false;
            }
        });
    }
})();