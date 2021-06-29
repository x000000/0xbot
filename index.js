const quotes   = require('./quotes.json');
const quoteIds = Object.keys(quotes);

require('dotenv').config();
const notFound = process.env.NOT_FOUND_MESSAGE || 'The quote not found';
const responseTimeout = +process.env.RESPONSE_TIMEOUT || 1000;

const tmi = require('tmi.js');
const opts = {
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.OAUTH_TOKEN,
  },
  channels: [
    process.env.CHANNEL_NAME,
  ]
};

const client = new tmi.client(opts);
client.on('message', onMessage);
client.on('connected', onConnected);
client.connect();

let lastResponseTime = 0;

function onMessage(target, context, msg, self) {
  if (self || !msg.startsWith('!')) {
    return;
  }

  const match = msg.match(/^!qu(?:\s+(\d+))?$/i);
  if (match) {
    const now = Date.now();
    if (now - lastResponseTime < responseTimeout) {
      return;
    }
  
    let resp;
    
    const id = match[1] || quoteIds[Math.round(Math.random() * quoteIds.length)];
    resp = quotes[id];
    resp = resp ? `📜 #${id}. ${resp}` : notFound;
    
    lastResponseTime = now;
    client.say(target, resp);
  } else {
    console.warn(`* Unknown command: ${msg}`);
  }
}

function onConnected(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}
