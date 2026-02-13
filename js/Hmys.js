// 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
// 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

import { Crypto } from 'assets://js/lib/cat.js';
const key = 'ZT8g6QH2kS3Xj7G5wG4JtU1F', iv = '51518888';
const encrypt_domain_def = 'vT1RQRz8YzlzTgN26pIXNJ7Mi65juwSP';
const play_headers = { 'User-Agent': 'Mozi' };
let host = '', play_domain = '', encrypt_domain = encrypt_domain_def, siteKey = '', siteType = 0;
let headers = {
    'User-Agent': 'Android', 'Connection': 'Keep-Alive', 'Accept': 'application/vnd.yourapi.v1.full+json',
    'Device-Id': '', 'Screen-Width': '2670', 'Channel': 'guan', 'Cur-Time': '', 'Mob-Mfr': 'xiaomi',
    'prefersex': '1', 'Mob-Model': 'xiaomi', 'token': '', 'Sys-Release': '15', 'appid': '',
    'Version-Code': '', 'Sys-Platform': 'Android', 'Screen-Height': '1200', 'timestamp': ''
};

async function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype;
    try {
        let ext = typeof cfg.ext === 'string' ? JSON.parse(cfg.ext) : cfg.ext;
        host = ext.host.replace(/\/$/, '');
        Object.assign(headers, {
            appid: ext.app_id, 'Version-Code': ext.versionCode, 'Channel': ext.UMENG_CHANNEL,
            'Device-Id': ext.deviceid || await local.get('Hmys_deviceid', `${ext.app_id}_${ext.UMENG_CHANNEL}`) || generateDeviceId()
        });
        if (!ext.deviceid) await local.set('Hmys_deviceid', `${ext.app_id}_${ext.UMENG_CHANNEL}`, headers['Device-Id']);
        if (ext.EncryptDomain) encrypt_domain = ext.EncryptDomain;
        await login(host);
    } catch (e) {}
}

async function login(loginHost) {
    if (headers.token && play_domain) return;
    headers['Cur-Time'] = headers.timestamp = getTimestamp();
    try {
        const resp = await req(loginHost + '/api/user/init', { method: 'POST', postType: 'form', headers: headers, data: { 'password': '', 'account': '' } });
        const json = JSON.parse(resp.content);
        if (json.data) {
            const result = JSON.parse(decryptData(json.data)).result;
            headers.token = result.user_info.token;
            play_domain = result.sys_conf.play_domain;
            host = result.sys_conf.host_main;
            await request(host + '/api/stats/login', { 'action': '6' });
        }
    } catch (e) {}
}

async function home(filter) {
    if (!host) return '{}';
    const data = await request(host + '/api/block/category_type', {});
    const classes = [], filters = {};
    if (data && data.result) {
        data.result.forEach(item => {
            classes.push({ type_id: item.type_pid.toString(), type_name: item.type_name });
            const parseAttr = (str) => str.split(',').map(s => ({ n: s.trim(), v: s.trim() }));
            filters[item.type_pid.toString()] = [
                { key: 'class', name: '类型', value: parseAttr(item.cate), init: '全部' },
                { key: 'area', name: '地区', value: parseAttr(item.area), init: '全部' },
                { key: 'year', name: '年份', value: parseAttr(item.year), init: '全部' },
                { key: 'sort', name: '排序', value: parseAttr(item.order), init: '最热' }
            ];
        });
    }
    return JSON.stringify({ class: classes, filters: filters });
}

async function homeVod() {
    if (!host) return '{}';
    const navData = await request(host + '/api/nav/list', {});
    const rec = navData && navData.result ? navData.result.find(i => i.nav_name === '推荐') : null;
    const indexData = await request(host + '/api/nav/index', { nav_id: rec ? rec.nav_id : '253' });
    let videos = [];
    if (indexData && indexData.result) {
        indexData.result.forEach(item => {
            if (item.block_list) item.block_list.forEach(block => {
                if (block.vod_list) block.vod_list.forEach(vod => videos.push(parseVodShort(vod)));
            });
        });
    }
    return JSON.stringify({ list: videos });
}

async function category(tid, pg, filter, extend) {
    if (!host) return '{}';
    const payload = {
        'area': extend.area || '全部', 'cate': extend.class || '全部', 'type_pid': tid,
        'year': extend.year || '全部', 'length': '12', 'page': pg.toString(), 'order': extend.sort || '最热'
    };
    const data = await request(host + '/api/block/category', payload);
    const videos = (data && data.result) ? data.result.map(parseVodShort) : [];
    return JSON.stringify({ list: videos, page: parseInt(pg), limit: 12, total: 999 });
}

async function search(wd, quick, pg) {
    if (!host) return '{}';
    const data = await request(host + '/api/search/result', { 'type_pid': "0", 'kw': wd, 'pn': pg || '1' });
    let videos = [];
    if (data && data.result) {
        videos = data.result.map(i => {
            let remark = i.type_pid != '1' ? `${i.serial}集` : i.tags;
            if (i.short_video == 1) remark += ',短剧';
            return {
                vod_id: i.vod_id.toString(), vod_name: i.title, vod_pic: i.pic,
                vod_remarks: remark, vod_year: i.year
            };
        });
    }
    return JSON.stringify({ list: videos, page: parseInt(pg || 1) });
}

async function detail(id) {
    if (!host) return '{}';
    const data = await request(host + '/api/vod/info', { 'vod_id': id });
    if (data && data.result) {
        const res = data.result;
        const playUrls = res.map_list ? res.map_list.map(i => `${i.title}$${id}@${i.id}@${i.collection}`).join('#') : '';
        return JSON.stringify({
            list: [{
                vod_id: res.vod_id.toString(), vod_name: res.title, vod_pic: res.pic, vod_remarks: res.remarks,
                vod_year: res.year, vod_area: res.area, vod_actor: res.actor, vod_director: res.director,
                vod_content: res.intro, vod_play_from: '河马', vod_play_url: playUrls, type_name: res.tags
            }]
        });
    }
    return '{}';
}

async function play(flag, id, flags) {
    const [video_id, vod_map_id, collection] = id.split('@');
    const data = await request(host + '/api/vod/play_url', { 'xz': "0", 'vod_map_id': vod_map_id, 'vod_id': video_id, 'collection': collection });
    if (data && data.result) {
        const res = data.result;
        let ck = res.ck;
        try { ck = Crypto.enc.Base64.parse(ck).toString(Crypto.enc.Utf8) || ck; } catch (e) {}

        if (res.check_url) {
            return JSON.stringify({ parse: 0, url: res.check_url, header: play_headers });
        } else {
            const targetUrl = encodeURIComponent(`${res.vod_url}?${ck}`);
            const proxyUrl = await js2Proxy(false, siteType, siteKey, targetUrl, play_headers);
            return JSON.stringify({ parse: 0, url: proxyUrl, header: play_headers });
        }
    }
    return '{}';
}

async function proxy(params) {
    let payload = decodeURIComponent(params[0]);
    if (payload.indexOf('TS@') > -1) {
        const realUrl = payload.split('TS@')[1];
        const signUrl = realUrl + hlsSign(realUrl);
        if (typeof getProxy === 'function' && typeof MD5 !== 'function'){
            const res = await req(signUrl, {headers: play_headers, buffer: 2});
            return JSON.stringify({
                code: 200,
                buffer: 2,
                content: res.content,
                headers: res.headers
            });
        }
        return JSON.stringify({
            code: 302, content: '',
            headers: {'Location': signUrl}
        });
    } else {
        const resp = await req(payload + hlsSign(payload), { headers: play_headers });
        if (!resp.content) return JSON.stringify({ code: 500, content: "fetch failed", headers: play_headers });

        const basePath = payload.substring(0, payload.indexOf('?') > -1 ? payload.indexOf('?') : payload.length).replace(/[^\/]+$/, '');
        const ck = payload.split('?')[1] || '';
        const newLines = [];

        for (let line of resp.content.split('\n')) {
            const tLine = line.trim();
            if (tLine && !tLine.startsWith('#')) {
                const fullUrl = tLine.startsWith('http') ? tLine : basePath + tLine;
                const proxyPayload = 'TS@' + encodeURIComponent(fullUrl + (ck ? '&' + ck : ''));
                newLines.push(await js2Proxy(false, siteType, siteKey, proxyPayload, play_headers));
            } else {
                newLines.push(line);
            }
        }
        return JSON.stringify({
            code: 200, content: newLines.join('\n'),
            headers: { "Content-Type": "application/vnd.apple.mpegurl", ...play_headers }
        });
    }
}

async function request(url, data) {
    headers.timestamp = getTimestamp();
    const opt = { method: 'POST', postType: 'form', headers: headers, data: data, timeout: 10000 };
    try {
        const resp = await req(url, opt);
        const json = JSON.parse(resp.content);
        if (json.data) {
            const decrypted = decryptData(json.data);
            if (decrypted) return JSON.parse(decrypted);
        }
        return json;
    } catch (e) { return {}; }
}

function decryptData(ciphertext) {
    if (!ciphertext) return null;
    const cleanCipher = ciphertext.replace(/[\r\n\s]/g, '');
    if (typeof desX === 'function') {
        try { return desX('DESede/CBC/PKCS7Padding', false, cleanCipher, true, key, iv, false); } catch (e) {}
    }
    try {
        const decrypted = Crypto.TripleDES.decrypt(
            { ciphertext: Crypto.enc.Base64.parse(cleanCipher) },
            Crypto.enc.Utf8.parse(key),
            { iv: Crypto.enc.Utf8.parse(iv), mode: Crypto.mode.CBC, padding: Crypto.pad.Pkcs7 }
        );
        return decrypted.toString(Crypto.enc.Utf8);
    } catch (e) {}
    return null;
}

function hlsSign(url) {
    const signUrl = url.split('?')[0];
    const hexTime = getHexTime();
    const data = signUrl.replace(play_domain, encrypt_domain) + hexTime;
    const wsSecret = (typeof md5X === 'function') ? md5X(data) : Crypto.MD5(data).toString();
    return `&wsSecret=${wsSecret}&wsTime=${hexTime}`;
}

function generateDeviceId() {
    const chars = '0123456789abcdef';
    let res = '';
    for (let i = 0; i < 16; i++) res += chars[Math.floor(Math.random() * chars.length)];
    return res;
}

function parseVodShort(v) {
    let remark = v.type_pid != 1 ? (v.is_end == 1 ? `${v.serial}集全` : `更新至${v.serial}集`) : `评分：${v.score}`;
    return {
        vod_id: v.vod_id.toString(),
        vod_name: v.title,
        vod_pic: v.pic,
        vod_remarks: remark
    };
}

const getTimestamp = () => String(new Date().getTime());
const getHexTime = () => Math.floor(new Date().getTime() / 1000).toString(16);

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, play, search, proxy };
}