// ==============================
// 1. 统一配置 
// ==============================
import 'assets://js/lib/crypto-js.js';
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 15; RMX3770 Build/AP3A.240617.008) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/134.0.6998.135 Mobile Safari/537.36';

const CommonHeaders = {
  'User-Agent': MOBILE_UA,
  'Referer': '',
   'Content-Type': 'application/x-www-form-urlencoded',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Connection': 'keep-alive',

  // 🔥 【改这里】换成目标网站的 Cookie
  'Cookie': 'server_name_session=a3c7be712ad297aa17faebdcb42d3c27; UM_distinctid=19d131b2378d4-006484b93d36c5-5c2c5701-46aa0-19d131b237917f; CNZZDATA1281443616=145448761-1774142039-%7C1774144227'
};

const DefHeader = CommonHeaders;
var HOST;

var KParams = {
  headers: CommonHeaders,
  timeout: 8000
};

// ==============================
// 2. 工具函数 —— 【全程不动】
// ==============================

function dealSameEle(arr) {
    try {
        if (!Array.isArray(arr)) return [];
        const map = {};
        return arr.map(item => {
            let count = map[item] || 0;
            map[item] = count + 1;
            return count > 0 ? item + (count + 1) : item;
        });
    } catch (e) {
        return arr;
    }
}

function ctSet(kArr, setStr) {
    try {
        if (!Array.isArray(kArr) || kArr.length === 0 || typeof setStr !== 'string' || !setStr) return kArr;
        const arrNames = setStr.split('&');
        const filtered_arr = arrNames.map(item => kArr.find(it => it.type_name === item)).filter(Boolean);
        return filtered_arr.length ? filtered_arr : [kArr[0]];
    } catch (e) {
        return kArr;
    }
}

function cutStr(str, p, s, d = '', c = true, i = 0, a = false) {
    try {
        if (!str) return a ? [d] : d;
        let es = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let reg = new RegExp(es(p).replace(/£/g, '[^]*?') + '([\\s\\S]*?)' + es(s), 'g');
        let m = [...str.matchAll(reg)].map(x => x[1].trim());
        if (a) return c ? m.map(x => x.replace(/<[^>]+>/g, '')) : m;
        let r = m[i >= 0 ? i : m.length + i] || d;
        return c ? r.replace(/<[^>]+>/g, '') : r;
    } catch (e) {
        return a ? [d] : d;
    }
}



function safeParseJSON(str) {
    try { return JSON.parse(str); } catch { return null; }
}

async function request(reqUrl, options = {}) {
    try {
        if (typeof reqUrl !== 'string' || !reqUrl.trim()) return '';
        if (typeof options !== 'object' || Array.isArray(options) || !options) options = {};
        options.method = options.method?.toUpperCase() || 'GET';
        if (['GET', 'HEAD'].includes(options.method)) {
            delete options.body; delete options.data; delete options.postType;
        }
        let {headers, timeout, ...restOpts} = options;
        const optObj = {
            headers: headers || KParams.headers,
            timeout: parseInt(timeout, 10) > 0 ? timeout : KParams.timeout,
            ...restOpts
        };
        const res = await req(reqUrl, optObj);
        return res?.content ?? '';
    } catch (e) {
        console.error(`${reqUrl} 请求失败`);
        return '';
    }
}

// ==============================
// 3. 初始化 —— 【必改域名】
// ==============================
async function init(cfg) {
    try {
        // 🔥 【改这里】换成默认网站域名
        HOST = (cfg.ext?.host?.trim() || 'https://www.iyd.cn/').replace(/\/$/, '');
        KParams.headers['Referer'] = HOST;
        let t = parseInt(cfg.ext?.timeout, 10);
        if (t > 0) KParams.timeout = t;
        KParams.catesSet = cfg.ext?.catesSet?.trim() || '';
        KParams.tabsSet = cfg.ext?.tabsSet?.trim() || '';
        KParams.resHtml = await request(HOST, KParams);
    } catch (e) {}
}


//4、首页和筛选

async function home(filter) {
    try {
        let html = KParams.resHtml;
        if (!html) return '{"class":[],"filters":{}}';

        // ---------- 顶部分类提取 ----------
        let typeArr = pdfa(html, '.swiper-wrapper&&li').slice(1,);
        let classes = typeArr.map((it, i) => ({
            type_name: pdfh(it, 'Text') || `分类${i+1}`,
            type_id: cutStr(it, '/vodtype/', '.html') || `ID${i+1}`
        }));

        // ---------- ID去重 & 屏蔽不需要的大类 ----------
        let seen = new Set();
        classes = classes.filter(item => !seen.has(item.type_id) && seen.add(item.type_id));
        const blockedNames = []; // 在此填写要屏蔽的分类名称
        if (blockedNames.length) classes = classes.filter(item => !blockedNames.includes(item.type_name));

        // ---------- 分类顺序自定义（覆盖外部配置）----------
        KParams.catesSet = "";
        if (KParams.catesSet) classes = ctSet(classes, KParams.catesSet);

        // ---------- 筛选条件处理 ----------
        let filters = {};
        try {
            const noTidTypes = ['']; // 不需要tid的分类名称

            // 筛选项定义
            const nameObj = {
                tid: 'tid,类型',   // 类型
                class: 'class,剧情', // 剧情
                year:  'year,年份', // 年份
                area: 'area,地区', // 地区
                letter: 'letter,字母',
                lang:  'lang,语言',
                by: 'by,排序'      // 排序
            };

            // 关键词匹配配置（方案B，当前启用）
            const kw = { 
                tid:   '按分类',   // 类型筛选块关键词
                class: '按剧情',
                year:  '按年份',
                area:  '按地区',
                lang:  '按语言',
                letter:  '按字母'
            };

            // 正则匹配配置（方案A，已注释，备用）
            const regObj = {
                tid: /\/vodshow\/([^-]+)-/,  // 类型ID提取正则
                class: /\/kkshiqisw\/\d+---([^-]+)-/,         // 剧情（未启用）
                area: /\/kkshiqisw\/\d+-([^-]+)-/,        // 地区（未启用）
                lang: /----([^-]+)---/,          // 语言（未启用）
                year: /-([^-]+)\.html/,       // 年份（未启用）
                letter: /-----([^-]+)---/,       // 字母（未启用）
                by: /sdshow\/\d+--([^-]+)-/      // 排序（未启用）
            };

            // 请求每个分类页面
            
            //https://www.iyd.cn/vodtype/1.html
            let list = await Promise.all(classes.map(it => 
                request(`${HOST}/vodtype/${it.type_id}.html`, KParams).catch(() => '')
            ));

            classes.forEach((it, i) => {
                let h = list[i];
                if (!h) return;
                let filterBlocks = pdfa(h, '.ewave-screen__list'); // 筛选块容器

                filters[it.type_id] = Object.entries(nameObj).map(([k, v]) => {
                    let [key, name] = v.split(',');
                    let arr = [];

                    if (key === 'tid' && noTidTypes.includes(it.type_name)) return null;

                    // 排序固定
                    if (key === 'by') {
                        arr = [{n:'按更新',v:'time'},{n:'按热度',v:'hits'},{n:'按评分',v:'score'}];
                        return {key, name, value: arr};
                    }

                    // 方案B：关键词匹配（当前启用）
                    let tgBlock = filterBlocks.find(b => b.includes(kw[key])) || '';

                    // 方案A：正则匹配（备用，可切换）
                    // let tgBlock = filterBlocks.find(block => regObj[key].test(block)) || '';

                    if (!tgBlock) return null;

                    // 提取选项列表（跳过第一个“全部”）
                    let aList = cutStr(tgBlock, '<a', '/a>', '', false, 0, true).slice(1,);
                    arr = aList.map(el => {
                        let n = cutStr(el, '>', '<', '未知').trim();
                        let v = n; // 默认用显示文本
                        // tid 特殊处理
                        if (key === 'tid') v = el.match(regObj.tid)?.[1] || '';
                        return {n, v};
                    }).filter(x => x.n);

                    arr.unshift({n: '全部', v: ''});

                    // 自定义追加分类（仅用于class）
                    if (key === 'class') {
                        arr.push({ n: '伦理', v: '伦理' }, { n: '情色', v: '情色' }, { n: '福利', v: '福利' });
                    }

                    return {key, name, value: arr};
                }).filter(x => x && x.key && x.value.length > 0);
            });
        } catch(e) {}

        return JSON.stringify({class: classes, filters});
    } catch (e) {
        return '{"class":[],"filters":{}}';
    }
}

// 5. 视频列表解析 —— (三个函数)
// ==============================

// 首页视频列表
function getHomeVod(h) {
    try {
        let r = [];
        pdfa(h, '.ewave-vodlist__box').forEach(it => {
            let n = pdfh(it, '.lazyload&&alt') || '';
            let pic =  pdfh(it, '.lazyload&&data-original') || '';
            let id = pdfh(it, 'a&&href') || '';
            let rm = pdfh(it, '.text-right&&Text') || '';
            if (id && n) {
                r.push({
                    vod_name: n,
                    vod_pic: pic,
                    vod_remarks: rm,
                    vod_id: `${id}@${n}@${pic}@${rm}`
                });
            }
        });
        return r;
    } catch(e) {
        return [];
    }
}

// 分类页视频列表
function getCategoryVod(h) {
    try {
        let r = [];
        pdfa(h, '.ewave-vodlist__box').forEach(it => {
            let n = pdfh(it, '.lazyload&&alt') || '';
            let pic =  pdfh(it, '.lazyload&&data-original') || '';
            let id = pdfh(it, 'a&&href') || '';
            let rm = pdfh(it, '.text-right&&Text') || '';
            if (id && n) {
                r.push({
                    vod_name: n,
                    vod_pic: pic,
                    vod_remarks: rm,
                    vod_id: `${id}@${n}@${pic}@${rm}`
                });
            }
        });
        return r;
    } catch(e) {
        return [];
    }
}

// 搜索结果视频列表
function getSearchVod(h) {
    try {
        let r = [];
        pdfa(h, '.ewave-vodlist__box').forEach(it => {
            let n = pdfh(it, '.lazyload&&alt') || '';
            let pic =  pdfh(it, '.lazyload&&data-original') || '';
            let id = pdfh(it, 'a&&href') || '';
            let rm = pdfh(it, '.text-right&&Text') || '';
            if (id && n) {
                r.push({
                    vod_name: n,
                    vod_pic: pic,
                    vod_remarks: rm,
                    vod_id: `${id}@${n}@${pic}@${rm}`
                });
            }
        });
        return r;
    } catch(e) {
        return [];
    }
}


// ==============================
// 6. 首页视频 —— 不动
// ==============================
async function homeVod() {
    try {
        return JSON.stringify({list:getHomeVod(KParams.resHtml)});
    } catch(e) {
        return '{"list":[]}';
    }
}

// 分类URL模板合集（最终版 · 无分行 · 无+）
// 1. 横杠拼接
// let cateUrl = `${HOST}/xzsbyksw/${fl.cateId||tid}-${fl.area||''}-${fl.by||''}-${fl.class||''}-${fl.lang||''}-${fl.letter||''}---${pg}---${fl.year||''}.html`;

// 2. GET参数拼接
// let cateUrl = `${HOST}/${fl.cateId||tid}.html?page=${pg-1}${fl.area?`&area=${fl.area}`:''}${fl.class?`&class=${fl.class}`:''}${fl.version?`&origin=${fl.version}`:''}${fl.by?`&sort_field=${fl.by}`:''}${fl.year?`&year=${fl.year}`:''}`;

// 3. 路径分段
// let cateUrl = `${HOST}/index.php/vod/show${fl.area ? `/area/${fl.area}` : ''}${fl.by ? `/by/${fl.by}` : ''}${fl.class ? `/class/${fl.class}` : ''}/id/${fl.cateId || tid}${fl.lang ? `/lang/${fl.lang}` : ''}${fl.letter ? `/letter/${fl.letter}` : ''}/page/${pg}${fl.year ? `/year/${fl.year}` : ''}.html`;


// 4. Ajax列表接口
// let cateUrl = `${HOST}/index.php/ajax/data?mid=1&tid=${fl.cateId||tid}&page=${pg}&limit=30`;

// 5. Ajax搜索建议
// let searchUrl = `${HOST}/index.php/ajax/suggest?mid=1&wd=${wd}&page=${pg}&limit=30`;

//https://www.iyd.cn/vodshow/13-%E5%86%85%E5%9C%B0-hits-%E5%8F%A4%E8%A3%85-%E5%9B%BD%E8%AF%AD-A------2025.html
// 7. 分类页 —— 改URL规则即可
// ==============================
async function category(tid, pg, filter, extend) {
    try {
        pg = Math.max(parseInt(pg)||1, 1);
        let fl = extend||{}; tid = fl.tid||tid;
        // 🔥 【改这里】分类URL拼接规则
         let cateUrl = `${HOST}/vodshow/${fl.cateId||tid}-${fl.area||''}-${fl.by||''}-${fl.class||''}-${fl.lang||''}-${fl.letter||''}---${pg}---${fl.year||''}.html`;
        let list = getCategoryVod(await request(cateUrl, KParams));
        return JSON.stringify({list, page:pg, pagecount:list.length>=10?pg+2:1, limit:list.length, total:list.length*(list.length>=10?pg+2:1)});
    } catch(e) {
        return '{"list":[],"page":1,"pagecount":0,"limit":30,"total":0}';
    }
}


/*function md5(string) {
    return CryptoJS.MD5(string).toString();
}
async function category(tid, pg, filter, extend) {
    try {
        pg = Math.max(parseInt(pg) || 1, 1);
        let timestamp = new Date().getTime().toString();
        let key = md5("DS" + timestamp + "DCC147D11943AF75");

        // 拼音到数字的映射表
        const PINYIN_TO_ID = {
            'dianying': '1',
            'dianshiju': '2',
            'zongyi': '3',
            'dongman': '4',
            'duanju': '39',
            'xijupian': '9',
            'kongbupian': '11',
            'dongzuopian': '7',
            'juqingpian': '6',
            'aiqingqian': '20',
            'kehuanpian': '21',
            'donghuapian': '22',
            'zhanzhengpian': '23',
            'guochanju': '13',
            'oumeiju': '14',
            'ribenju': '15',
            'hanguoju': '16',
            'haiwaiju': '24',
            'daluzongyi': '25',
            'oumeizongyi': '26',
            'rihanzongyi': '27',
            'guochandongman': '28',
            'rihandongman': '29',
            'oumeidongman': '30',
            'haiwaidongman': '31',
            'shenhaoduanju': '44',
            'chongshengduanju': '45',
            'fuchouduanju': '46',
            'chuanyueduanju': '47'
            
        };

        // 优先使用筛选中的 tid（子分类ID）并映射，否则使用大类 tid 映射
        let finalTid;
        if (extend && extend.tid) {
            finalTid = PINYIN_TO_ID[extend.tid] || extend.tid;  // 映射筛选ID
        } else {
            finalTid = PINYIN_TO_ID[tid] || tid;                // 映射大类ID
        }

        let furl = `${HOST}/index.php/api/vod?type=${finalTid}&page=${pg}&time=${timestamp}&key=${key}`;

        // 拼接其他筛选参数（排除 tid，避免重复）
        if (extend && typeof extend === 'object') {
            const fields = ['class', 'area', 'lang', 'version', 'state', 'letter', 'year', 'by'];
            for (let f of fields) {
                if (extend.hasOwnProperty(f) && extend[f] != null) {
                    furl += `&${f}=${encodeURIComponent(extend[f])}`;
                }
            }
        }

        let opt = { headers: KParams.headers, method: 'POST' };
        let resp = await request(furl, opt);
        let fdata = safeParseJSON(resp);
        if (!fdata || typeof fdata !== 'object') throw new Error('无效数据');

        let list = Array.isArray(fdata.list) ? fdata.list : [];
        let videos = list.map(item => ({
            vod_id: '/video/' + (item.vod_id || '') + '.html',
            vod_name: item.vod_name || '',
            vod_pic: item.vod_pic?.startsWith('http') ? item.vod_pic : HOST + (item.vod_pic || ''),
            vod_remarks: item.vod_remarks || ''
        }));

        let pagecount = fdata.total ? Math.ceil(fdata.total / (fdata.limit || 30)) : Math.min(pg + 1, 10);
        return JSON.stringify({ list: videos, page: pg, pagecount });
    } catch (e) {
        console.error('category error:', e);
        return '{"list":[],"page":1,"pagecount":0}';
    }
}*/
// ==============================
// 8. 搜索 —— 改URL规则即可
//==============================
  async function search(wd, quick, pg) {
    try {
        pg = Math.max(parseInt(pg)||1, 1);
        // 🔥 【改这里】搜索URL规则
        
        //https://www.iyd.cn/vodtype/id.html?wd=爱情&page=2
        let url = `${HOST}/vodtype/id.html?wd=${wd}&page=${pg}`;
        let list = getSearchVod(await request(url, KParams));
        return JSON.stringify({list, page:pg, pagecount:list.length>=10?pg+2:1, limit:list.length, total:list.length*(list.length>=10?pg+2:1)});
    } catch(e) {
        return '{"list":[],"page":1,"pagecount":0,"limit":30,"total":0}';
    }
}

//搜索页解析

/*  async function search(wd, pg) {
    try {
        let url = `${HOST}/index.php/ajax/suggest?mid=1&wd=${encodeURIComponent(wd)}&page=${pg}&limit=30`;
        let res = await request(url);
        let json = JSON.parse(res);
        if (json.code !== 1) throw new Error('接口返回失败');
        
        //https://www.yingbas.com/yingba/219807.html

        let list = (json.list || []).map(item => {
            let vod_name = item.name;
            let vod_pic =  item.pic;
            let vod_remarks = item.en; 
            let vod_id = `/yingba/${item.id}.html@${vod_name}@${vod_pic}@${vod_remarks}`;
            return { vod_name, vod_pic, vod_remarks, vod_id };
        });

        return JSON.stringify({
            code: 200,
            page: pg,
            pagecount: json.pagecount,
            list: list
        });
    } catch (e) {
        return JSON.stringify({ code: 200, list: [] });
    }
}*/


/*   async function search(wd, pg) {
    try {
        pg = Math.max(parseInt(pg) || 1, 1);
        let url = `${HOST}/rss/index.xml?wd=${encodeURIComponent(wd)}&page=${pg}`;
        let xml = await request(url, KParams);
        if (!xml) return JSON.stringify({ list: [], page: pg, pagecount: 0 });

        let items = [];
        // 正则匹配每个 <item> 标签的内容
        let itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        let match;
        while ((match = itemRegex.exec(xml))) {
            let itemXml = match[1];

            // 提取标题（可能包含 CDATA）
            let titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
            if (!titleMatch) continue;
            let fullTitle = titleMatch[1].trim();

            // 分离剧名和状态（如“已完结”、“更新至第6集”）
            let name = fullTitle;
            let remark = '';
            let statusMatch = fullTitle.match(/(已完结|完结|更新至第\d+集)/);
            if (statusMatch) {
                remark = statusMatch[1];
                name = fullTitle.replace(remark, '').trim();
            }

            // 提取详情页链接
            let linkMatch = itemXml.match(/<link>([^<]+)<\/link>/);
            let link = linkMatch ? linkMatch[1] : '';
            if (!link) continue;

            // 图片使用默认图
            let pic = 'https://n.sinaimg.cn/sinacn22/744/w959h1385/20181007/efb2-hkrzyan2293352.jpg';

            let vod_id = `${link}@${name}@${pic}@${remark}`;
            items.push({
                vod_name: name,
                vod_pic: pic,
                vod_remarks: remark,
                vod_id: vod_id
            });
        }

        let pagecount = items.length ? pg + 1 : pg;
        return JSON.stringify({ list: items, page: pg, pagecount });
    } catch (e) {
        return JSON.stringify({ list: [], page: pg, pagecount: 0 });
    }
}*/


// ==============================
// 9. 详情页 —— 【全站最常改】
// ==============================
async function detail(ids) {
    try {
        let [id, n, pic, rm] = ids.split('@');
        let url = /^http/.test(id) ? id : HOST + id;
        let h = await request(url, KParams);
        if (!h) return '{"list":[]}';

        let info = {
            vod_id: url, vod_name: n, vod_pic: pic, vod_remarks: rm,
            type_name: pdfh(h, '.data&&a:eq(0)&&Text').trim().replace(/&nbsp;/g, ' '),
            vod_area: pdfh(h, '.data&&a:eq(1)&&Text').trim().replace(/&nbsp;/g, ' '),
            vod_year: pdfh(h, '.data&&a:eq(2)&&Text').trim().replace(/&nbsp;/g, ' '),
            vod_lang: cutStr(h, '语言：', '</p>').trim(),
            vod_director: cutStr(h, '导演：', '</p>').trim().replace(/\//g, ' ').replace(/&nbsp;/g, ' '),
            vod_actor: cutStr(h, '主演：', '</p>').trim().replace(/\//g, ' ').replace(/&nbsp;/g, ' '),
            vod_content: pdfh(h, '.col-pd:eq(3)&&Text').trim().replace(/&nbsp;/g, ' '),
        };

        // 线路、播放列表提取
        let tabs = pdfa(h, '.nav-tabs&&li').map(i => pdfh(i, 'Text').trim());
        let lists = pdfa(h, '.ewave-content__playlist').map(p => pdfa(p, 'a').map(i => `${pdfh(i, 'a&&Text')}$${pd(i, 'a&&href', url)}`).filter(j => !j.includes('дрр滈凊')).join('#'));

        // 屏蔽不需要的线路
        let ban = [];
        let res = tabs.map((t, i) => ({ name: t, url: lists[i] })).filter(x => !ban.some(b => x.name.includes(b)));
        tabs = res.map(x => x.name);
        lists = res.map(x => x.url);

        // ========== 内部硬编码线路排序 ==========
        const orderList = []; // 可修改此数组
        if (orderList.length) {
            let orderedTabs = [];
            let orderedLists = [];
            let used = new Set();
            for (let name of orderList) {
                let idx = tabs.indexOf(name);
                if (idx !== -1) {
                    orderedTabs.push(name);
                    orderedLists.push(lists[idx]);
                    used.add(name);
                }
            }
            for (let i = 0; i < tabs.length; i++) {
                if (!used.has(tabs[i])) {
                    orderedTabs.push(tabs[i]);
                    orderedLists.push(lists[i]);
                }
            }
            tabs = orderedTabs;
            lists = orderedLists;
        }

        // 自定义线路顺序（原有功能，可保留）
        if (KParams.tabsSet) {
            let kt = ctSet(tabs.map((t, i) => ({ type_name: t, type_value: lists[i] })), KParams.tabsSet);
            tabs = kt.map(x => x.type_name);
            lists = kt.map(x => x.type_value);
        }

        tabs = dealSameEle(tabs);

        return JSON.stringify({
            list: [{
                ...info,
                vod_play_from: tabs.join('$$$'),
                vod_play_url: lists.join('$$$')
            }]
        });
    } catch (e) {
        return '{"list":[]}';
    }
}

// ==============================
// 10. 播放解析 —— 【必改！每个站不一样】
// ==============================
async function play(flag, ids) {
    try {
        let h = await request(ids, KParams);
        let jsonStr = cutStr(h, 'var player_aaaa=', '<');
        let obj = safeParseJSON(jsonStr);
        let u = obj?.url || '';
        if (!u) throw new Error();
        // 直链判断（以 .m3u8 或 .mp4 结尾）
        if (/\.(m3u8|mp4)(\?|$)/i.test(u)) {
            return JSON.stringify({ jx:0, parse:0, url:u, header:DefHeader });
        }
        // 非直链调用解析
        let proxyUrl = `https://mo.765365.xyz/proxyjx/?url=${encodeURIComponent(u)}`;
        return JSON.stringify({ jx:0, parse:1, url:proxyUrl, header:DefHeader });
    } catch(e) {
        let proxyUrl = `https://mo.765365.xyz/proxyjx/?url=${encodeURIComponent(ids)}`;
        return JSON.stringify({ jx:0, parse:1, url:proxyUrl, header:DefHeader });
    }
}
// ==============================
// 导出 —— 绝对不动
// ==============================
export function __jsEvalReturn() {
    return { init, home, homeVod, category, search, detail, play, proxy:null };
}
