const Message = require('./message');

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
    bites,
};

exports.default = exports;