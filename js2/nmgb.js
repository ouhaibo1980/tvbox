document.addEventListener('DOMContentLoaded', function() {
    const disableDevtools = new Proxy({}, {
        get: () => {
            window.location.reload();
            return '';
        }
    });
    console.log(disableDevtools);
    console.clear();

    const OVERLAY_TIMEOUT = 36e5 * 1; 
    const overlay = document.getElementById('overlay');
    let clicks = 0;
    const sx = window.SX_VALUE || 3; // 默认为3次点击

    const shouldShow = () => {
        const lastClick = localStorage.getItem('lastClick');
        return !lastClick || (Date.now() - lastClick) > OVERLAY_TIMEOUT;
    };

    if (shouldShow()) {
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
    
    overlay.addEventListener('click', () => {
        clicks++;
        console.log(`点击次数: ${clicks}/${sx}`); // 调试用
        
        if (clicks >= sx) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 500);
            localStorage.setItem('lastClick', Date.now());
        }
    });
    
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && [85, 83].includes(e.keyCode) || e.keyCode === 123) {
            e.preventDefault();
            e.returnValue = false;
        }
    });
});