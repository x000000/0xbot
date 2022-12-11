const Message = require('./message');
const fetch = require('node-fetch');

async function loadQuotes(url) {
    const resp = await fetch(url);
    let data = await resp.text();

    try {
        data = JSON.parse(data);
    } catch (e) {
        data = data.split('\n');
    }

    if (Array.isArray(data)) {
        const res = {};
        let i = 1;
        for (const txt of data) {
            if (typeof txt !== 'string' || txt.trim()) {
                res[i] = txt.trim();
            }
            i++;
        }
        return res;
    }

    return data;
}

function populateTarget(target, rawQuotes) {
    const quoteIds = Object.keys(rawQuotes);
    const quotes = quoteIds.reduce((m, id) => {
        const quote = rawQuotes[id];
        m[id] = new Message(typeof quote === 'string' ? `📜 #${id}. ${quote}` : quote);
        return m;
    }, {});
    
    Object.assign(target, { quoteIds, quotes });
}

function getQuotesProvider(srcUrl) {
    const target = {};

    setInterval(() => loadQuotes(srcUrl).then(q => populateTarget(target, q)), 300 * 1000);
    loadQuotes(srcUrl).then(q => populateTarget(target, q)).catch(e => console.error(e));

    return target;
}

Object.defineProperty(exports, '__esModule', { value: true });
module.exports = exports = {
    getQuotesProvider,
};

exports.default = exports;