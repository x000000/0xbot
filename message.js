const { randomInt } = require('crypto');

class Message {
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

Object.defineProperty(exports, '__esModule', { value: true });
module.exports = exports = Message;
exports.default = exports;