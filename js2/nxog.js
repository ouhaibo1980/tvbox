
(() => {
   
    const transferData = {
        sxValue: 888, 
        okParamValue: false,
        overlayTimeout: 36e5 * 1
    };

  
    function executeOverlayLogic(sx, okParam, OVERLAY_TIMEOUT) {
     
        const disableDevtools = new Proxy({}, {
            get: () => {
                window.location.reload();
                return "";
            }
        });
        console.log(disableDevtools);
        console.clear();

      
        const overlay = document.getElementById("overlay");
        if (!overlay) return;

        let clicks = 0;
        document.body.style.overflow = "hidden";

       
        const shouldShowResult = (() => {
            if (okParam) {
                return false;
            }
            const lastClick = localStorage.getItem("lastClick");
            return !lastClick || (Date.now() - lastClick) > OVERLAY_TIMEOUT;
        })();

      
        overlay.style.display = shouldShowResult ? "flex" : "none";
        if (!shouldShowResult) {
            document.body.style.overflow = "auto";
        }

     
        overlay.addEventListener("click", () => {
            if (++clicks >= sx) {
                overlay.style.opacity = "0";
                document.body.style.overflow = "auto";
                setTimeout(() => overlay.remove(), 500);
                localStorage.setItem("lastClick", Date.now());
            }
        });

      
        document.addEventListener("contextmenu", (e) => e.preventDefault());

      
        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey && [85, 83].includes(e.keyCode)) || e.keyCode === 123) {
                e.preventDefault();
                e.returnValue = false;
            }
        });
    }

   
    window.initOverlayData = function(sx, okParam) {
    
        transferData.sxValue = sx;
        transferData.okParamValue = okParam;

    
        const { sxValue, okParamValue, overlayTimeout } = transferData;
        executeOverlayLogic(sxValue, okParamValue, overlayTimeout);
    };
})();
