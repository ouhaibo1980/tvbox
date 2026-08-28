(function () {
    'use strict';

    /* ----------------------------------------------------------------
     * 1. 极速样式拦截 —— 不等 <body> 创建，直接把 CSS 挂到 <html> 根节点
     *    浏览器在渲染第一帧时页面即带渐变背景并锁定滚动，杜绝“闪屏”。
     * ---------------------------------------------------------------- */
    const styleText = `
        html, body {
            width: 100vw !important;
            height: 100vh !important;
            overflow: hidden !important;
            background: #111827 !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        #tvbox-farewell-cover {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 2147483647 !important;
            /* 多色渐变 + 流动动画，实现“变背色” */
            background: linear-gradient(45deg, #ffd800, #ff512f, #00ffcc, #cc00ff, #ffd800) !important;
            background-size: 400% 400% !important;
            animation: tvboxBgShift 12s ease infinite !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            user-select: none !important;
            pointer-events: auto !important;
        }

        @keyframes tvboxBgShift {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        @keyframes modalFadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .tvbox-modal {
            max-width: 460px;
            width: 100%;
            background: #ffffff;
            border-radius: 16px;
            padding: 40px 32px;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: modalFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            box-sizing: border-box;
        }
    `;

    const style = document.createElement('style');
    style.id = 'tvbox-farewell-style'; // 便于关闭时移除，解除滚动锁定
    style.textContent = styleText;
    document.documentElement.appendChild(style); // 挂在 <html> 上，无需等待 <head>

    /* ----------------------------------------------------------------
     * 2. 弹窗 HTML 模板
     * ---------------------------------------------------------------- */
    const htmlText = `
      <div class="tvbox-modal">
        <div style="width:64px;height:64px;margin:0 auto 24px;background:#f3f4f6;border-radius:50%;display:flex;align-items:center;justify-content:center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
            <line x1="12" y1="2" x2="12" y2="12"></line>
          </svg>
        </div>
        <h1 style="font-size:24px;font-weight:700;color:#111827;margin:0 0 16px;letter-spacing:0.5px;">站点已关闭</h1>
        <div style="font-size:15px;color:#4b5563;line-height:1.8;margin:0 0 28px;">
          本站前端页面已永久下线。<br><br>
          感谢大家一路以来的陪伴与支持。<br>
          <strong>江湖路远，有缘再会，后会有期。</strong>
        </div>
        <div style="font-size:12px;color:#9ca3af;border-top:1px dashed #e5e7eb;padding-top:20px;letter-spacing:1px;">
          FRONTEND SERVICE CLOSED
        </div>
      </div>
    `;

    /* ----------------------------------------------------------------
     * 3. 点击关闭 + 36 分钟免重复展示（来自“社会主义核心价值观”遮罩逻辑）
     * ---------------------------------------------------------------- */
    const OVERLAY_TIMEOUT = 36 * 60 * 1000; // 36 分钟内不再强制展示
    let clicks = 0;
    let sx = 888; // 默认需点击次数

    // ?ou=N 自定义点击次数（1–9999）
    const ouRaw = new URLSearchParams(location.search).get('ou');
    if (ouRaw !== null) {
        const num = parseInt(ouRaw, 10);
        if (!isNaN(num) && num >= 1 && num <= 9999) sx = num;
    }

    function unlockScroll() {
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
    }

    // animated=true 时淡出后移除；false 时立即移除（用于“已点过”免展示）
    function removeCover(animated) {
        const cover = document.getElementById('tvbox-farewell-cover');
        if (!cover) return;
        localStorage.setItem('lastClick', Date.now().toString());
        const finalize = () => {
            cover.remove();
            const s = document.getElementById('tvbox-farewell-style');
            if (s) s.remove(); // 一并解除 html/body 的滚动锁定
            unlockScroll();
        };
        if (animated) {
            cover.style.opacity = '0';
            setTimeout(finalize, 500);
        } else {
            finalize();
        }
    }

    /* ----------------------------------------------------------------
     * 4. 注入遮罩 DOM 并绑定交互
     * ---------------------------------------------------------------- */
    function injectCover() {
        if (document.getElementById('tvbox-farewell-cover')) return; // 防止重复注入
        const cover = document.createElement('div');
        cover.id = 'tvbox-farewell-cover';
        cover.innerHTML = htmlText;

        // 点击 sx 次关闭遮罩
        cover.addEventListener('click', () => {
            if (++clicks >= sx) removeCover(true);
        });

        // 插入为 body 的第一个子元素，压制后续加载的所有元素
        document.body.insertBefore(cover, document.body.firstChild);

        // 36 分钟内已点过 → 直接放行，不强制展示
        const lastClick = localStorage.getItem('lastClick');
        const shouldShow = !lastClick || Date.now() - Number(lastClick) > OVERLAY_TIMEOUT;
        if (!shouldShow) removeCover(false);
    }

    /* ----------------------------------------------------------------
     * 5. 全局防护 —— 右键 / 开发者工具快捷键拦截
     *    （来自“社会主义核心价值观”遮罩的防护逻辑）
     * ---------------------------------------------------------------- */
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey && [85, 83].includes(e.keyCode)) || e.keyCode === 123) {
            e.preventDefault();
            e.returnValue = false;
        }
    });

    /* ----------------------------------------------------------------
     * 6. MutationObserver 极限拦截
     *    若执行时 <body> 尚未生成，则观察 <html> 直到 body 出现立即注入。
     * ---------------------------------------------------------------- */
    if (document.body) {
        injectCover();
    } else {
        const observer = new MutationObserver(function (mutations, obs) {
            if (document.body) {
                injectCover();
                obs.disconnect(); // 任务完成，销毁观察者以节约性能
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
})();
