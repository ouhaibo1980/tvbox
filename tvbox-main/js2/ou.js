
const resources = [
  {
    name: 'jquery',
    cdn: 'https://cdn.bootcdn.net/ajax/libs/jquery/3.7.1/jquery.js',
    local: '/template/DYXS2/static/js/jquery.js',
    globalCheck: () => window.jQuery
  },
  {
    name: 'lazyload',
    cdn: 'https://cdn.bootcdn.net/ajax/libs/jquery_lazyload/2.0.0-beta.2/lazyload.js',
    local: '/template/DYXS2/static/js/jquery.lazyload.js',
    globalCheck: () => $.fn.lazyload
  },
  {
    name: 'autocomplete',
    cdn: 'https://cdn.bootcdn.net/ajax/libs/jquery-autocomplete/1.0.7/jquery.auto-complete.js',
    local: '/template/DYXS2/static/js/jquery.autocomplete.js',
    globalCheck: () => $.fn.autocomplete
  },
  {
    name: 'cookie',
    cdn:  null,
    local: '/template/DYXS2/static/js/jquery.cookie.js',
     loadLocalFirst: true
  },
    {
    name: 'home',
    cdn: 'https://file.zhuyitai.com/feedback/202504/02/7465bb414af6bd249706a0793a441d53.js',
    local: '/template/DYXS2/static/js/home.js',
     globalCheck: () => $.fn.home
  },
  
  {
    name: 'clipboard',
    cdn: 'https://cdn.bootcdn.net/ajax/libs/clipboard.js/2.0.0/clipboard.min.js',
    local: '/template/DYXS2/static/js/jquery.clipboard.js',
    globalCheck: () => window.clipboard
  },
  {
    name: 'bundle',
    cdn: 'https://cdn.bootcdn.net/ajax/libs/Swiper/6.4.15/swiper-bundle.min.js',
    local: '/template/DYXS2/static/js/swiper-bundle.min.js',
    globalCheck: () => window.bundle
  },
  {
    name: 'script',
    cdn: null,
    local: '/template/DYXS2/static/js/script.js',
    loadLocalFirst: true
  }
];

// 动态加载脚本函数
function loadScript(url, timeout = 1000, isLocal = false) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.type = 'text/javascript';
    
    // 本地资源不设置超时
    let timer;
    if (!isLocal) {
      timer = setTimeout(() => {
        script.onerror();
      }, timeout);
    }
    
    script.onload = () => {
      if (timer) clearTimeout(timer);
      console.log(`%c[SUCCESS] ${url} loaded`, 'color: green');
      resolve();
    };
    
    script.onerror = () => {
      if (timer) clearTimeout(timer);
      console.error(`%c[ERROR] Failed to load ${url}`, 'color: red');
      reject(new Error(`Failed to load ${url}`));
    };
    
    document.head.appendChild(script);
  });
}

// 按顺序加载资源
async function loadResources() {
  for (const resource of resources) {
    try {
      // 检查是否已加载
      if (resource.globalCheck && resource.globalCheck()) {
        console.log(`%c[SKIP] ${resource.name} already loaded`, 'color: blue');
        continue;
      }
      
      // 如果设置了loadLocalFirst或没有CDN地址，直接加载本地资源（无超时）
      if (resource.loadLocalFirst || !resource.cdn) {
        console.log(`%c[LOADING] Local ${resource.name}`, 'color: orange');
        await loadScript(resource.local, 1000, true);
        continue;
      }
      
      // 尝试加载CDN资源
      console.log(`%c[LOADING] CDN ${resource.name}`, 'color: purple');
      await loadScript(resource.cdn);
    } catch (error) {
      // CDN加载失败，尝试加载本地资源（无超时）
      console.log(`%c[FALLBACK] Loading local ${resource.name}`, 'color: orange');
      try {
        await loadScript(resource.local, 1000, true);
      } catch (localError) {
        console.error(`%c[CRITICAL] Failed to load both CDN and local ${resource.name}`, 'color: red');
      }
    }
  }
  
  console.log('%c[ALL RESOURCES LOADED]', 'color: green; font-weight: bold');
  // 触发页面初始化
  if (window.initPage) window.initPage();
}

// 开始加载资源
loadResources();