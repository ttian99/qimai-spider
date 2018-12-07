const puppeteer = require('puppeteer');
const _ = require('lodash');
const csv = require('fast-csv');
const fs = require('fs-extra');
const moment = require('moment');
const utils = require('./lib/utils');
const path = require('path');
const CNT = require('./lib/CNT');

/**
 * 拼接URL
 * 1.vivo单机榜: https://www.qimai.cn/rank/marketRank/market/8/category/5/date/2018-12-07
 * 2.谷歌美国热门免费游戏: https://www.qimai.cn/rank/marketRank/market/10/category/35/country/us/collection/topselling_freedate/2018-12-07
 *  */
function getUrl(data) {
    const BASE_URL = 'https://www.qimai.cn/rank/marketRank';
    let str = '';
    for (key in data) {
        str += `/${key}/${data[key]}`;
    }
    console.log(BASE_URL + str);
    return BASE_URL + str;
}
// 获取表格名字
async function getName(data) {
    const info = _.find(CNT.MARKET_LIST, (item) => {
        return item.market_id == data.market;
    });
    console.log(info);

    const market_name = info.market_name;
    const category = await _.find(info.categoryList, (item) => {
        return item.category_id == data.category;
    })
    const category_name = category.category_name;
    let fileName = `${market_name}_${category_name}`;

    if (data.country) {
        fileName += `_${data.country}`;
    }
    if (data.collection) {
        const collection_name = CNT.COLLECTION[data.collection];
        fileName += `_${collection_name}`;
    }
    let str = `qimai.${fileName}.${moment(data.date).format('YYYY.MM.DD')}.csv`
    console.log(str);
    return str;
}

async function getSpider(initData, resolve) {
    const fileName = await getName(initData);
    const FILE = path.join(__dirname, 'temp', fileName);
    const NEW_FILE = path.join(__dirname, 'db', fileName);
    const URL = getUrl(initData);


    const browser = await (puppeteer.launch({
        timeout: 50000,
        ignoreHTTPSErrors: true,
        devtools: true,
        headless: false
    }));
    const page = await browser.newPage();

    // 创建可写流
    fs.ensureFileSync(FILE);
    const writeStream = fs.createWriteStream(FILE);
    const csvStream = csv.createWriteStream({ headers: true });
    writeStream.on('finish', async function () {
        console.log('spider over');
        fs.ensureFileSync(NEW_FILE);
        await utils.utf8ToGbk(FILE, NEW_FILE);
        console.log('DONE!');
        resolve && resolve();
        browser.close();
    });
    csvStream.pipe(writeStream);

    // 监听请求的response函数
    async function logResponse(data) {
        const url = data.url();
        const reg = new RegExp('https://api.qimai.cn/rank/marketRank');
        if (reg.test(url)) {
            console.log(`==== get matched Url : ${url}`);

            try {
                json = await data.json();
            } catch (error) {
                throw error;
            }
            // console.log(json);
            // 获取数据总量
            const arr = json.rankInfo;
            const promiseArr = [];
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                const appInfo = item.appInfo;
                const company = item.company;
                const rankInfo = item.rankInfo;
                const newData = {
                    '排名': rankInfo.ranking,
                    '排名变化': rankInfo.change,
                    '游戏名称': appInfo.appName,
                    '发行公司': appInfo.publisher,
                    '昨日新增下载量': item.downloadNum,
                    'icon': appInfo.icon,
                    '类别': item.genre,
                    'appid': appInfo.appId,
                    '公司名称': company.name,
                    '公司链接': company.id !== 0 ? `https://www.qimai.cn/company/product/id/${company.id}` : '无',
                    // '最后更新': item.releaseTime,
                };
                // 写入数据到表格
                csvStream.write(newData);
                promiseArr.push(Promise.resolve());
            }

            await Promise.all(promiseArr).then(() => {
                csvStream.end();
            });
        }
    }
    page.on('response', logResponse);
    console.log(`==== start goto ${URL}`);
    page.goto(URL, { timeout: 500000 }).catch(err => console.log(`==== error goto ${URL} : ${err}`));
    console.log(`==== over goto ${URL}`);

    console.log('==== load over');
}

async function spider(data) {
    return new Promise((resolve, reject) => {
        getSpider(data, resolve);
    });
};

module.exports = spider;