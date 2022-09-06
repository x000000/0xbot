class Message  
{
  constructor(opts) {
    if (typeof opts === 'string') {
      this.text = opts;
    } else {
      Object.assign(this, opts);
    }
  }

  toString() {
    return this.args ? buildText(this.text, this.args) : this.text;
  }
}

function buildText(text, args) {
  return text.replace(/\{(\d)\}/g, match => {
    const replacement = args[ match[1] ];
    return Array.isArray(replacement) 
      ? replacement[randomInt(0, replacement.length)]
      : replacement;
  });
}

const rawQuotes = require('./quotes.json');
const quoteIds  = Object.keys(rawQuotes);
const quotes = Object.keys(quoteIds).reduce((m, id) => {
  const quote = rawQuotes[id];
  m[id] = new Message(typeof quote === 'string' ? `📜 #${id}. ${quote}` : quote);
  return m;
}, {});

const leftRightM     = [ ['левый', 'правый'] ];
const leftRightF     = [ ['левую', 'правую'] ];
const leftRightF_alt = [ ['левой', 'правой'] ];
const leftRightU     = [ ['левое', 'правое'] ];

const topBottomM = [ ['верхний', 'нижний'] ];
const topBottomF = [ ['верхнюю', 'нижнюю'] ];
const topBottomU = [ ['верхнее', 'нижнее'] ];

const bites = [
  'нос',
  'шею',
  'пузо',
  'пупок',
  'спину',
  'волосы',
  { text: '{0} бок',                args: leftRightM },
  { text: '{0} ухо',                args: leftRightU },
  { text: '{0} губу',               args: topBottomF },
  { text: '{0} щеку',               args: leftRightF },
  { text: '{0} сосок',              args: leftRightM },
  { text: '{0} ляшку',              args: leftRightF },
  { text: '{0} пятку',              args: leftRightF },
  { text: '{0} плечо',              args: leftRightU },
  { text: '{0} локоть',             args: leftRightM },
  { text: '{0} ноздрю',             args: leftRightF },
  { text: '{0} коленку',            args: leftRightF },
  { text: '{0} подмыху',            args: leftRightF },
  { text: '{0} полужопие',          args: leftRightU },
  { text: 'мизинец {0} руки',       args: leftRightF_alt },
  { text: 'мизинец {0} ноги',       args: leftRightF_alt },
  { text: 'большой палец {0} руки', args: leftRightF_alt },
  { text: 'большой палец {0} ноги', args: leftRightF_alt },
].map(o => new Message(o));


Object.defineProperty(exports, '__esModule', { value: true });
module.exports = exports = {
    quoteIds,
    quotes,
    bites,
};

exports.default = exports;