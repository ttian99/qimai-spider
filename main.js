const config = require('./config');
const spider = require('./spider');

async function main(params) {
    const date = config.date;
    const arr = config.list;
    for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        item.date = date;
        await spider(item);
    }
}

main();