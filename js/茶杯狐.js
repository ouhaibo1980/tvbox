/*
title: '茶杯狐', author: '小可乐/v6.2.1'
说明：可以不写ext，也可以写ext，ext支持的参数和格式参数如下
"ext": {
    "host": "xxxxx", //站点网址
    "timeout": 6000,  //请求超时，单位毫秒
    "catesSet": "剧集&动漫&综艺",  //指定分类和顺序，支持模糊匹配和精准匹配，默认模糊匹配，加前缀e:精准匹配
    "tabsSet": "线路2&线路1"  //指定线路和顺序，其余同上
}
*/
import {Crypto} from 'assets://js/lib/cat.js';
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36';
var HOST;
var KParams = {
    headers: {'User-Agent': MOBILE_UA},
    timeout: 5000
};

async function init(cfg) {
    try {
        HOST = (cfg.ext?.host?.trim() || 'https://www.cupfox.ai').replace(/\/$/, '');
        KParams.headers['Referer'] = HOST;
        let parseTimeout = parseInt(cfg.ext?.timeout?.trim(), 10);
        if (parseTimeout > 0) {KParams.timeout = parseTimeout;}
        KParams.catesSet = cfg.ext?.catesSet?.trim() || '';
        KParams.tabsSet = cfg.ext?.tabsSet?.trim() || '';
        KParams.resHtml = await request(HOST);
    } catch (e) {
        console.error('初始化参数失败：', e.message);
    }
}

async function home(filter) {
    try {
        let resHtml = KParams.resHtml;
        if (!resHtml) {throw new Error('源码为空');}
        let typeArr = cutStr(resHtml, '<a class="bm', '/a>', '', false, 0, true).filter(flt => flt.includes('/type/') );
        let classes = typeArr.map((it, idx) => {
            let cName = cutStr(it, '>', '<', `分类${idx+1}`);
            let cId = cutStr(it, '/type/', '.', `值${idx+1}`);
            return {type_name: cName, type_id: cId};
        });
        if (KParams.catesSet) { classes = namePick(classes, KParams.catesSet); }
        let filters = {};
        try {
            const nameObj = {class: 'class,剧情', area: 'area,地区', year: 'year,年份'};
            const regObj = {class: /\d+---([^-]+)-/, area: /\/\d+-([^-]+)-/, year: /-([^-]+)\./};
            let resHtmlList = await Promise.all(
                classes.map(async (it) => {
                    try {return await request(`${HOST}/show/${it.type_id}-----------.html`);} catch (sErr) {return '';}
                })
            );
            classes.forEach((it,idx) => {
                let resfHtml = resHtmlList[idx];
                if (resfHtml) {
                    let flValArr = cutStr(resfHtml, 'filter-panel"£>', '</div>', '', false, 0, true);
                    filters[it.type_id] = Object.entries(nameObj).map(([nObjk, nObjv]) => {
                        let [kkey, kname] = nObjv.split(',');
                        let tgVal = flValArr.find(fv => regObj[kkey].test(fv)) ?? '';
                        let tValArr = cutStr(tgVal, '<a', '/a>', '', false, 0, true).slice(1);
                        let kvalue = tValArr.map(el => {
                            let n = cutStr(el, '>', '<', '空白');
                            let v = n;
                            return {n: n, v: v}; 
                        });
                        kvalue.unshift({n: '全部', v: ''});
                        return {key: kkey, name: kname, value: kvalue};
                    }).filter(flt => flt.key && flt.value.length > 1);
                }
            });
        } catch (e) {
            filters = {}
        }
        return JSON.stringify({class: classes, filters: filters});
    } catch (e) {
        console.error('获取分类失败：', e.message);
        return JSON.stringify({class: [], filters: {}});
    }
}

async function homeVod() {
    try {
        let resHtml = KParams.resHtml;
        let VODS = getVodList(resHtml, 'rec');
        return JSON.stringify({list: VODS});
    } catch (e) {
        console.error('推荐页获取失败：', e.message);
        return JSON.stringify({list: []});
    }
}

async function category(tid, pg, filter, extend) {
    try {
        pg = parseInt(pg, 10), pg = pg > 0 ? pg : 1;
        let fl = extend || {};
        let cateUrl = `${HOST}/show/${fl.cateId || tid}-${fl.area ?? ''}-${fl.by ?? ''}-${fl.class ?? ''}-${fl.lang ?? ''}-${fl.letter ?? ''}---${pg}---${fl.year ?? ''}.html`;
        let resHtml = await request(cateUrl);
        let VODS = getVodList(resHtml);
        let limit = VODS.length;
        let pagecount = Number(cutStr(resHtml, '下一页<£--------', '-', '1000'));
        return JSON.stringify({list: VODS, page: pg, pagecount: pagecount, limit: limit, total: limit*pagecount});
    } catch (e) {
        console.error('类别页获取失败：', e.message);
        return JSON.stringify({list: [], page: 1, pagecount: 0, limit: 30, total: 0});
    }
}

async function search(wd, quick, pg) {
    try {
        pg = parseInt(pg, 10), pg = pg > 0 ? pg : 1;
        let searchUrl = `${HOST}/search/${wd}----------${pg}---.html`;
        let resHtml = await request(searchUrl);
        let VODS = getVodList(resHtml, 'sch');
        let limit = VODS.length;
        let pagecount = Number(cutStr(resHtml, '下一页<£----------', '-', '10'));
        return JSON.stringify({list: VODS, page: pg, pagecount: pagecount, limit: limit, total: limit*pagecount});
    } catch (e) {
        console.error('搜索页获取失败：', e.message);
        return JSON.stringify({list: [], page: 1, pagecount: 0, limit: 30, total: 0});
    }
}

function getVodList(khtml, flag='') {
    try {
        if (!khtml) {throw new Error('源码为空');}
        let twoCut = flag === 'sch' ? cutStr(khtml, 'movie-list-body flex', 'sidebar', '', false).replaceAll('</p>', '</ap>') : flag === 'rec' ? cutStr(khtml, 'tab1"', '"tab2', '', false, 0, true).join('').replaceAll('</a>', '</ap>') : cutStr(khtml, 'movie-list-body flex', 'module-footer">', '', false).replaceAll('</a>', '</ap>');
        let listArr = cutStr(twoCut, '<a', '/ap>', '', false, 0, true).filter(Boolean);
        let kvods = [];
        for (let it of listArr) {
            let kname = cutStr(it, 'title="', '"', '名称');
            let kpic = cutStr(it, 'data-original="', '"', '图片');
            kpic = !/^http/.test(kpic) ? `${HOST}${kpic}` : kpic;
            let remarkPre = flag === 'sch' ? 'getop txtHide">' : 'movie-item-note">';
            let kremarks = cutStr(it, remarkPre, '</div>', '状态');
            let kyear = cutStr(it, 'movie-item-score">', '</div>');
            let kid = cutStr(it, 'href="', '"');
            if (kid) {
                kvods.push({
                    vod_name: kname,
                    vod_pic: kpic,
                    vod_remarks: kremarks,
                    vod_year: kyear,
                    vod_id: `${kid}@${kname}@${kpic}`
                });
            }
        }
        return kvods;
    } catch (e) {
        console.error(`生成视频列表失败：`, e.message);
        return [];
    }
}

async function detail(ids) {
    try {
        let [id, kname, kpic] = ids.split('@');
        let detailUrl = !/^http/.test(id) ? `${HOST}${id}` : id;
        let resHtml = await request(detailUrl);
        if (!resHtml) {throw new Error('源码为空');}  
        let intros = cutStr(resHtml, 'detail">', '"play-select', '', false);
        let tags = cutStr(intros, 'scroll-content">', '</div>', '', false);
        let ktabs = cutStr(resHtml, 'titleName', '/a>', '', false, 0, true).map((it,idx) => cutStr(it, '>', '<', `线-${idx+1}`) );
        let kurls = cutStr(resHtml, 'content_playlist', '</ul>', '', false, 0, true).map(item => {
            return cutStr(item, '<a', '/a>', '', false, 0, true).map((it,i) => `${cutStr(it, '>', '<', `epi${i+1}`)}$${cutStr(it, 'href="', '"', 'noUrl')}` ).join('#') 
        });
        ktabs = dealSameEle(ktabs);
        if (KParams.tabsSet) {
            let ktus = ktabs.map((it, idx) => ({type_name: it, type_value: kurls[idx]}) );
            ktus = namePick(ktus, KParams.tabsSet);
            ktabs = ktus.map(it => it.type_name);
            kurls = ktus.map(it => it.type_value);
        }
        let VOD = {
            vod_id: detailUrl,
            vod_name: kname,
            vod_pic: kpic,
            vod_remarks: cutStr(intros, '状态：', '</div>', '状态'),
            type_name: cutStr(intros, 'scroll-content">', '</div>', '状态'),
            vod_year: cutStr(tags, '<a£>', '</a>', '1000', true, -2),
            vod_area: cutStr(tags, '<a£>', '</a>', '地区', true, -3),
            vod_lang: cutStr(tags, '<a£>', '</a>', '语言', true, -1),
            vod_director: cutStr(intros, '导演：', '</div>', '导演'),
            vod_actor: cutStr(intros, '演员：', '</div>', '主演'),
            vod_content: cutStr(intros, 'detailsTxt">', '</div>', kname),
            vod_play_from: ktabs.join('$$$'),
            vod_play_url: kurls.join('$$$')
        };
        return JSON.stringify({list: [VOD]});
    } catch (e) {
        console.error('详情页获取失败：', e.message);
        return JSON.stringify({list: []});
    }
}

async function play(flag, ids, flags) {
    try {
        let playUrl = !/^http/.test(ids) ? `${HOST}${ids}` : ids;
        let kp = 0, kurl = '', pheaders = {'User-Agent': MOBILE_UA};
        let resHtml = await request(playUrl);
        let kcode = safeParseJSON(cutStr(resHtml, 'var player_£=', '<', '', false));
        kurl = encodeURIComponent(kcode?.url ?? '');
        if (kurl) {
            let resObj = safeParseJSON(await request(`${HOST}/foxplay/api.php`, {
                headers: {...KParams.headers, 'Content-Type': 'application/x-www-form-urlencoded'},
                method: 'post',
                body: `vid=${kurl}`
            }));
            if (resObj?.code === 200) {
                kurl = resObj.data?.url ?? '';
                let urlMode = resObj.data?.urlmode ?? 0;
                kurl = urlMode === 1 ? Decoder1.decode(kurl) : urlMode === 2 ? Decoder2.decode(kurl) : kurl;
            }
        }
        if (!/^http/.test(kurl)) {kp = 1, kurl = playUrl;}
        return JSON.stringify({jx: 0, parse: kp, url: kurl, header: pheaders});
    } catch (e) {
        console.error('播放失败：', e.message);
        return JSON.stringify({jx: 0, parse: 0, url: '', header: {}});
    }
}

function safeB64Decode(b64Str) {
    try {
        if (typeof b64Str !== 'string' || !b64Str) {return '';}
        const cleanB64 = b64Str.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/=]/g, '');
        return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(cleanB64));
    } catch (e) {
        return '';
    }
}

function safeParseJSON(jStr){
    try {return JSON.parse(jStr);} catch(e) {return null;}
}

const Decoder1 = {
    key: Crypto.MD5('test').toString(),
    letterReg: /[a-zA-Z]/,
    decode(encodedStr) {
        try {
            const decodedStr = this.xorB64Decode(encodedStr);
            const parts = decodedStr.split('/');
            if (parts.length < 3) {return '';}      
            const [mapStrB, mapStrA, ...pathParts] = parts;
            const path = pathParts.join('/');       
            const cipherMap = safeParseJSON(safeB64Decode(mapStrA));
            const plainMap = safeParseJSON(safeB64Decode(mapStrB));
            const decodedPath = safeB64Decode(path); 
            return this.mapChars(cipherMap, plainMap, decodedPath);
        } catch (e) {
            return '';
        }
    },    
    xorB64Decode(str) {
        if (typeof str !== 'string' || !str.trim()) {return '';}
        const b64Once = safeB64Decode(str);
        const key = this.key;
        if (!b64Once || !key) {return '';}
        const keyLen = key.length;
        const xorChars = [...b64Once].map((_, i) => String.fromCharCode(b64Once.charCodeAt(i) ^ key.charCodeAt(i % keyLen)) );
        return safeB64Decode(xorChars.join(''));
    },   
    mapChars(cipherList, plainList, text) {
        if (!Array.isArray(cipherList) || !Array.isArray(plainList) || typeof text !== 'string' || !text.trim()) {return '';}
        const resultArr = [...text].map((char) => {
            if (this.letterReg.test(char) && plainList.includes(char)) {
                const idx = cipherList.indexOf(char);
                return (idx !== -1 ? plainList[idx] : char) || char;
            }
            return char;
        });
        return resultArr.join('');
    }
};

const Decoder2 = {  
    decode(strB64) {
        try {
            if (typeof strB64 !== 'string' || !strB64.trim()) {throw new Error('密文须为非全空白字符串');}
            const raw = safeB64Decode(strB64);
            if (!raw) {return '';}    
            const charMap = this.createCharMap();
            const result = Array.from({length: Math.ceil(raw.length/3)}, (_, k) => 1 + k * 3).reduce((str, pos) => str + (charMap[raw[pos]] ?? raw[pos]), '');
            return result;
        } catch (e) {
            console.error('Decoder2.decode解密错误：', e.message);
            return '';
        }
    },
    createCharMap() {   
        if (this.charMapCache) {return this.charMapCache;}  
        const dict = 'PXhw7UT1B0a9kQDKZsjIASmOezxYG4CHo5Jyfg2b8FLpEvRr3WtVnlqMidu6cN';
        const dictLen = dict.length;
        const charMap = dict.split('').reduce((obj, char, idx) => {
            obj[char] = dict[(idx + 59) % dictLen];
            return obj;
        }, {});    
        this.charMapCache = charMap;
        return charMap;
    }
};

function dealSameEle(arr) {
    try {
        if (!Array.isArray(arr)) {throw new Error('输入参数非数组');}
        const countMap = new Map();
        let newArr = arr.map(item => {
            let count = countMap.get(item) || 0;
            let currentCount = count + 1;
            countMap.set(item, currentCount);
            return currentCount > 1 ? `${item}${currentCount}` : item;
        });
        return newArr;
    } catch (e) {
        return [];
    }
}

function namePick(itemArr, nameStr) {
    try {
        if (!Array.isArray(itemArr) || !itemArr.length || typeof nameStr !== 'string' || nameStr === '' || nameStr === 'e:') {throw new Error('第一参数须为非空数组，第二参数须为带(或不带)e:字头的非空字符串');}        
        const isExact = nameStr.startsWith('e:');
        const pureStr = isExact ? nameStr.slice(2) : nameStr;
        const nameArr = [...new Set(pureStr.split('&').filter(Boolean))];
        if (!nameArr.length) {return [itemArr[0]];}
        let result = [], existSet = new Set(), typeName, isMatch;
        for (const tgName of nameArr) {
            for (const item of itemArr) {
                if (!item || typeof item.type_name !== 'string') {continue;}
                typeName = item.type_name;
                isMatch = isExact ? typeName === tgName : typeName.includes(tgName);
                if (isMatch && !existSet.has(typeName)) {
                    existSet.add(typeName);
                    result.push(item);
                    if (isExact) {break;}
                }
            }
        }
        return result.length ? result : [itemArr[0]];
    } catch (e) {
        console.error('namePick 执行异常：', e.message);
        return itemArr;
    }
}

function cutStr(str, prefix = '', suffix = '', defVal = '', clean = true, i = 0, all = false) {
    try {
        if (typeof str !== 'string') {throw new Error('被截取对象必须为字符串');}
        const cleanStr = cs => String(cs).replace(/<[^>]*?>/g, ' ').replace(/(&nbsp;|[\u0020\u00A0\u3000\s])+/g, ' ').trim().replace(/\s+/g, ' ');
        const esc = s => String(s).replace(/[.*+?${}()|[\]\\/^]/g, '\\$&');
        let pre = esc(prefix).replace(/£/g, '[^]*?'), end = esc(suffix);
        const regex = new RegExp(`${pre || '^'}([^]*?)${end || '$'}`, 'g');
        const matchIter = str.matchAll(regex);
        if (all) {
            const matchArr = [...matchIter];           
            return matchArr.length ? matchArr.map(ela => ela[1] !== undefined ? (clean ? (cleanStr(ela[1]) || defVal) : ela[1]) : defVal ) : [defVal];
        }
        const idx = parseInt(i, 10);
        if (isNaN(idx)) {throw new Error('序号必须为整数');}
        let tgResult, matchIdx = 0;
        if (idx >= 0) {
            for (let elt of matchIter) {
                if (matchIdx++ === idx) {tgResult = elt[1]; break;}
            }
        } else {
            const matchArr = [...matchIter];
            tgResult = matchArr.length ? matchArr[matchArr.length + idx]?.[1] : undefined;
        }
        return tgResult !== undefined ? (clean ? (cleanStr(tgResult) || defVal) : tgResult) : defVal;
    } catch (e) {
        console.error(`字符串截取错误：`, e.message);
        return all ? ['cutErr'] : 'cutErr';
    }
}

async function request(reqUrl, options = {}) {
    try {
        if (typeof reqUrl !== 'string' || !reqUrl.trim()) { throw new Error('reqUrl需为字符串且非空'); }
        if (typeof options !== 'object' || Array.isArray(options) || options === null) { throw new Error('options类型需为非null对象'); }
        let {headers, timeout, method, withHeaders, ...restOpts} = options;
        const timeoutParse = parseInt(timeout, 10);
        const finalMethod = (method ?? 'get').toLowerCase();
        if (['get', 'head'].includes(finalMethod)) {
            delete restOpts.body;
            delete restOpts.data;
            delete restOpts.postType;
        }
        const optObj = {
            headers: (typeof headers === 'object' && !Array.isArray(headers) && headers !== null) ? headers : KParams.headers,
            timeout: timeoutParse > 0 ? timeoutParse : KParams.timeout,
            method: finalMethod,
            ...restOpts
        };
        const res = await req(reqUrl, optObj);
        if (withHeaders) { return {headers: res?.headers ?? {}, content: res?.content ?? ''}; }
        return res?.content ?? '';
    } catch (e) {
        console.error(`${reqUrl}→请求失败：`, e.message);
        return options?.withHeaders ? {headers: {}, content: ''} : '';
    }
}

export function __jsEvalReturn() {
    return {
        init,
        home,
        homeVod,
        category,
        search,
        detail,
        play,
        proxy: null
    };
}