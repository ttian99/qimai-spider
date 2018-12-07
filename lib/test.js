var _ = require('lodash');
var CNT = require('./CNT');
var moment = require('moment');

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
    const info = _.find(CNT.MARKET_LIST, (item) =>{
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
        fileName = `${market_name}_${category_name}_${data.country}`;
    }
    let str = `qimai.${fileName}.${moment(data.date).format('YYYY.MM.DD')}.csv`
    console.log(str);
    return str;
}

var data = {
    "market": 10,
    "category": 35,
    "country": "us"
}
getUrl(data);


getName(data);