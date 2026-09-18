# coding = utf-8
# !/usr/bin/python

from Crypto.Util.Padding import unpad
from Crypto.Util.Padding import pad
from urllib.parse import unquote
from Crypto.Cipher import ARC4
from urllib.parse import quote
from base.spider import Spider
from Crypto.Cipher import AES
from datetime import datetime
from bs4 import BeautifulSoup
from base64 import b64decode
import urllib.request
import urllib.parse
import datetime
import binascii
import requests
import base64
import json
import time
import sys
import re
import os

sys.path.append('..')

xurl = "https://www.miguvideo.com"

headerx = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0'
          }
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
    "Content-Type": "application/json"
          }
class Spider(Spider):
    global xurl
    global headerx
    global headers

    def getName(self):
        return "首页"

    def init(self, extend):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def extract_middle_text(self, text, start_str, end_str, pl, start_index1: str = '', end_index2: str = ''):
        if pl == 3:
            plx = []
            while True:
                start_index = text.find(start_str)
                if start_index == -1:
                    break
                end_index = text.find(end_str, start_index + len(start_str))
                if end_index == -1:
                    break
                middle_text = text[start_index + len(start_str):end_index]
                plx.append(middle_text)
                text = text.replace(start_str + middle_text + end_str, '')
            if len(plx) > 0:
                purl = ''
                for i in range(len(plx)):
                    matches = re.findall(start_index1, plx[i])
                    output = ""
                    for match in matches:
                        match3 = re.search(r'(?:^|[^0-9])(\d+)(?:[^0-9]|$)', match[1])
                        if match3:
                            number = match3.group(1)
                        else:
                            number = 0
                        if 'http' not in match[0]:
                            output += f"#{match[1]}${number}{xurl}{match[0]}"
                        else:
                            output += f"#{match[1]}${number}{match[0]}"
                    output = output[1:]
                    purl = purl + output + "$$$"
                purl = purl[:-3]
                return purl
            else:
                return ""
        else:
            start_index = text.find(start_str)
            if start_index == -1:
                return ""
            end_index = text.find(end_str, start_index + len(start_str))
            if end_index == -1:
                return ""

        if pl == 0:
            middle_text = text[start_index + len(start_str):end_index]
            return middle_text.replace("\\", "")

        if pl == 1:
            middle_text = text[start_index + len(start_str):end_index]
            matches = re.findall(start_index1, middle_text)
            if matches:
                jg = ' '.join(matches)
                return jg

        if pl == 2:
            middle_text = text[start_index + len(start_str):end_index]
            matches = re.findall(start_index1, middle_text)
            if matches:
                new_list = [f'{item}' for item in matches]
                jg = '$$$'.join(new_list)
                return jg

    def homeContent(self, filter):
        result = {}
        result = {"class": [{"type_id": "1000", "type_name": "电影"},
                            {"type_id": "1001", "type_name": "电视剧"},
                            {"type_id": "1007", "type_name": "动漫"},
                            {"type_id": "601382", "type_name": "少儿"},
                            {"type_id": "1005", "type_name": "综艺"},
                            {"type_id": "1002", "type_name": "纪录片"}
                            ],

                  }

        return result
    def homeVideoContent(self):
        pass

    def categoryContent(self, cid, pg, filter, ext):
        result = {}
        videos = []
        url=f'https://jadeite.migu.cn/search/v3/category?&pageStart={pg}&pageNum=21&contDisplayType={cid}'
        res = requests.get(url=url, headers=headerx)
        res.encoding = "utf-8"
        kjson=json.loads(res.text)
        for i in kjson['body']['data']:
            id= i['pID']
            name=i['name']
            pic=i['pics']['highResolutionV']

            score= i.get('score', '')

            remark = i.get('remark', '') + "评分 " + score

            video = {
                "vod_id": id,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": remark
            }
            videos.append(video)

        result = {'list': videos}
        result['page'] = pg
        result['pagecount'] = 9999
        result['limit'] = 90
        result['total'] = 999999
        return result

    def detailContent(self, ids):
        did = ids[0]

        result = {}
        videos = []
        play_url = ''
        play_from = ''
        res = requests.get(url=f'https://webapi.miguvideo.com/gateway/program/v3/cont/content-info/{did}',
                           headers=headerx)
        res.encoding = "utf-8"
        kjson = json.loads(res.text)
        # print('detailContent详情内数据')
        # print(res.text)
        # if 'publishTime' in kjson['body']['data']:
        #     remark1 = kjson['body']['data']['publishTime']
        # else:
        #     remark1 = ''
        # if 'updateEP' in kjson['body']['data']:
        #     remark2 = kjson['body']['data']['updateEP']
        # else:
        #     remark2 = ''
        actor = kjson['body']['data'].get('actor', '')
        director = kjson['body']['data'].get('director', '')
        area = kjson['body']['data'].get('area', '')
        year = kjson['body']['data'].get('year', '')
        content = kjson['body']['data'].get('detail', '')
        publishTime = kjson['body']['data'].get('publishTime', '')
        updateEP = kjson['body']['data'].get('updateEP', '')
        remark = '时间:' + publishTime + ' 集数:' + updateEP
        # # == != >=   <=
        if 'datas' in kjson['body']['data']:
            for i in kjson['body']['data']['datas']:
                pid = i.get('pID')  # 或者 pid = item['pID'] 如果你确定 pID 一定存在
                play_from += '小咕影视' + '$$$'
                play_url += str(i['index']) + '$' + f'https://www.miguvideo.com/p/detail/{pid}' + '#'
            play_url = play_url[:-1]
            play_from = play_from[:-3]
            # play_url = play_url.rstrip('#')
            # play_from = play_from.rstrip('$$$')
        elif 'playing' in kjson['body']['data']:
            play_from += '小咕影视'
            play_url = f'https://www.miguvideo.com/p/detail/{did}'#xurl https://www.miguvideo.com
        videos.append({
            "vod_id": did,
            "vod_actor": actor,
            "vod_director": director,
            "vod_content": content,
            "vod_remarks": remark,
            "vod_year": year,
            "vod_area": area,
            "vod_play_from": play_from,
            "vod_play_url": play_url
        })

        result['list'] = videos

        return result
    def playerContent(self, flag, id, vipFlags):
         return {'jx': 1, 'parse': 1, 'url': id, 'header': ''}

    def searchContentPage(self, key, quick, page):
        result = {}
        videos = []

        payload = {
            "k": key,
            "pageIdx": str(page)
                  }
        payload_str = json.dumps(payload, ensure_ascii=False)
        print(payload_str)
        urlz = 'https://jadeite.migu.cn/search/v3/open-search'
        response = requests.post(url=urlz, headers=headers, data=payload_str)
        if response.status_code == 200:
            data = response.json()

            stup = data['body']['shortMediaAssetList']

            for vod in stup:
                name = vod['name']

                id = vod['pID']

                pic = vod['pics']['highResolutionV']

                remark = vod.get('contentType', '推荐')

                video = {
                    "vod_id": id,
                    "vod_name": name,
                    "vod_pic": pic,
                    "vod_remarks": remark
                }
                videos.append(video)

        result['list'] = videos
        result['page'] = page
        result['pagecount'] = 9999
        result['limit'] = 90
        result['total'] = 999999
        return result

    def searchContent(self, key, quick, pg="1"):
        return self.searchContentPage(key, quick, '1')

    def localProxy(self, params):
        if params['type'] == "m3u8":
            return self.proxyM3u8(params)
        elif params['type'] == "media":
            return self.proxyMedia(params)
        elif params['type'] == "ts":
            return self.proxyTs(params)
        return None


if __name__ == "__main__":
    spider = Spider()

    # # 1. 调试首页内容
    # home_data = spider.homeContent(filter=True)
    # print("homeContent:")
    # print(json.dumps(home_data, ensure_ascii=False, indent=2))
    #
    # # 2. 调试分类内容
    # cid = "1001"  # 电影
    # category_data = spider.categoryContent(cid, 1, filter=True, ext={})
    # print("\ncategoryContent:")
    # print(json.dumps(category_data, ensure_ascii=False, indent=2))
    #
    # # 3. 调试详情内容
    ids = ["926050989"]
    detail_data = spider.detailContent(ids)
    print("\ndetailContent:")
    print(json.dumps(detail_data, ensure_ascii=False, indent=2))
    #
    # # 4. 调试播放内容
    #
    #
    # play_url = detail_data["list"][0]["vod_play_url"].split('#')[0]  # 取第一条播放链接
    # play_parts = play_url.split('$')
    # play_name = play_parts[0] if len(play_parts) > 1 else 'default'
    # play_url_final = play_parts[1] if len(play_parts) > 1 else play_parts[0]
    # player_data = spider.playerContent(flag=play_name, id=play_url_final, vipFlags=[])
    # print("playerContent（播放内容）", player_data)