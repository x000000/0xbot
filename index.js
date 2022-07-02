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

const rawQuotes = require('./quotes.json');
const quoteIds  = Object.keys(rawQuotes);
const quotes = Object.keys(quoteIds).reduce((m, id) => {
  const quote = rawQuotes[id];
  m[id] = new Message(typeof quote === 'string' ? `📜 #${id}. ${quote}` : quote);
  return m;
}, {});

require('dotenv').config();
const { randomInt } = require('crypto');
const _fetch = require('node-fetch');

const notFound = process.env.NOT_FOUND_MESSAGE || 'The quote not found';
const responseTimeout = +process.env.RESPONSE_TIMEOUT || 1000;

function buildText(text, args) {
  return text.replace(/\{(\d)\}/g, match => {
    const replacement = args[ match[1] ];
    return Array.isArray(replacement) 
      ? replacement[randomInt(0, replacement.length)]
      : replacement;
  });
}

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

let bearerPromise;
let availableEmotes = {};
let bttvEmotes;
let viewerList = [];

const client = new tmi.client(opts);
client.on('message', onMessage);
client.on('connected', onConnected);
client.on('disconnected', onDisconnected);
client.on('emotesets', onEmotesetsChanged);
client.connect();

function fetch(url, opts) {
  if (!opts) { 
    opts = {};
  }

  return _fetch(url, {
    method:  opts.method,
    headers: opts.headers,
  }).then(data => data.json(), err => err);
}

function getBearerToken(/* scopes */) {
  if (!bearerPromise) {
    const url = 'https://id.twitch.tv/oauth2/token?grant_type=client_credentials' 
      + '&client_id=' + process.env.CLIENT_ID 
      + '&client_secret=' + process.env.CLIENT_SECRET 
      // + (scopes ? '&scope=' + scopes : '')
      ;
    
    bearerPromise = fetch(url, { method: 'POST' }).then(data => data.access_token);
  }
  return bearerPromise;
}

function getOAuthTokenUrl() {
  const qs = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.CLIENT_REDURECT_URL,
    response_type: 'code',
  });
  return `https://id.twitch.tv/oauth2/authorize?${qs}`;
}

function getChannelStatus() {
  return getBearerToken().then(token => {
    return fetch('https://api.twitch.tv/helix/users?login=' + process.env.CHANNEL_NAME, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'client-id': process.env.CLIENT_ID,
      },
    });
  }).then(r => r.data[0]);
}

async function updateViewerList()
{
  const resp = await fetch('https://tmi.twitch.tv/group/user/' + process.env.CHANNEL_NAME + '/chatters');
  viewerList = Object.values(resp.chatters).flatMap(o => o)
}

updateViewerList();
setInterval(updateViewerList, 120 * 1000);


getChannelStatus().then(info => fetch('https://api.betterttv.net/3/cached/users/twitch/' + info.id))
  .then(data => {
    const emotes = data.channelEmotes.map(o => o.code);
    data.sharedEmotes.map(o => o.code).forEach(o => emotes.push(o));

    bttvEmotes = emotes.length ? {
      codes: emotes,
      regex: new RegExp('(?<=^|\s)(' + emotes.join('|') + ')(?=\s|$)', 'g'),
    } : null;
});

let lastResponseTime = 0;

function buildSay(timeout) {
  let _lastResponseTime = 0;
  
  return function(target, msg) {
    const now = Date.now();

    if ((now - _lastResponseTime < timeout) || (now - lastResponseTime < responseTimeout)) {
      return false;
    }
  
    lastResponseTime = _lastResponseTime = now;
    client.say(target, msg);

    return true;
  };
}

function isEmoteChant(emotes, msg) {
  const emoteIds = emotes && Object.keys(emotes);
  if (emoteIds && emoteIds.length > 0) {
    const chars = msg.split('');
    let count = 0;

    for (const id of emoteIds) {
      if (!availableEmotes[id]) {
        return false;
      }

      const spans = emotes[id];
      count += spans.length;

      for (const span of spans) {
        const [since, until] = span.split('-');
        for (let i = +since, l = +until; i <= l; i++) {
          chars[i] = ' ';
        }
      }
    }

    let msg1 = chars.join('').trim();

    if (msg1 && bttvEmotes) {
      const m = msg1.replace(bttvEmotes.regex, m => {
        count++;
        return '';
      }).trim();
      if (m !== msg1) {
        msg1 = m;
      }
    }

    return count > 5 && !msg1;
  }
}


const chant = (say => {
  return (target, msg) => say(target, msg);
})(buildSay(16000));

const emoteChant = (say => {
  return function (target, msg) {
    console.log('< ' + msg);
    say(target, msg);
  };
})(buildSay(16000));

const vote = (say => {
  let choices = {};
  let timeout, retryTimeout, alive = false;

  function compute() {
    let total = 0;
    let max = -1, maxv;
    let min = Number.MAX_VALUE, minv;
  
    for (const key of Object.keys(choices)) {
      const val = choices[key];
      total += val;
  
      if (max < val) {
        max  = val;
        maxv = key;
      }
      if (min > val || min === -1) {
        min  = val;
        minv = key;
      }
    }

    if (total > 1) {
      const ratio = max / total;
      return ratio > 0.8 ? maxv : minv;
    }
  }

  function computeAndHandle(target) {
    const choice = compute();
    if (!choice || say(target, choice)) {
      choices = {};
      timeout = retryTimeout = null;
    } else {
      alive = false;
      retryTimeout = setTimeout(() => {
        if (alive) {
          computeAndHandle(target);
        } else {
          choices = {};
          timeout = retryTimeout = null;
        }
      }, 2000);
    }
  }

  return (target, msg) => {
    choices[msg] = (choices[msg] || 0) + 1;
    
    if (retryTimeout) {
      alive = true;
    } else if (!timeout) {
      timeout = setTimeout(() => computeAndHandle(target), 3000);
    }
  };
})(buildSay(60000));

const bite = (say => {
  return function (target, context) {
    let index = randomInt(-1, bites.length);
    const user = viewerList.length > 0 ? viewerList[randomInt(0, viewerList.length)] : context.username;
    
    let resp;
    if (index < 0) {
      index = randomInt(0, bites.length);
      resp = `/me @${context.username} пытается сделать кусь @${user} за ${bites[index]}, но @${user} ловко уворачивается`;
    } else {
      resp = `/me @${context.username} делает кусь @${user} за ${bites[index]}`;
    
      if (user === context.username) {
        resp += '. совсем крыша поехала Jebaited';
      } else {
        const flavor = randomInt(0, 100);
        if (flavor < 5) {
          resp += ' и выплевывает. может, стоит помыть сначала WutFace';
        } else if (flavor < 10) {
          resp += '. кажется, понравилось Jebaited';
        } else if (flavor < 15) {
          resp += ' и хочет еще FeelsAmazingMan';
        }
      }
    }
    
    console.log('< ' + resp);
    say(target, resp);
  };
})(buildSay(10000));

const qu = (say => {
  return function (target, quoteId) {
    const id = quoteId || quoteIds[randomInt(0, quoteIds.length)];
    say(target, (quotes[id] || notFound).toString());
  };
})(buildSay(responseTimeout));


function onMessage(target, context, msg, self) {
  if (self) {
    return;
  }

  if (!msg.startsWith('!')) {
    if (msg === 'Jebaited' || msg === 'CoolStoryBob') {
      chant(target, msg);
    } else if (msg === '+' || msg === '-') {
      vote(target, msg);
    } else if (isEmoteChant(context.emotes, msg)) {
      emoteChant(target, msg);
    }
    return;
  }

  if (msg === '!кусь') {
    bite(target, context);
    return;
  }

  const match = msg.match(/^!qu(?:\s+(\d+))?$/i);
  if (match) {
    qu(target, match[1]);
  } else {
    console.warn(`* Unknown command: ${msg}`);
  }
}

function onConnected(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

function onDisconnected() {
  const reason = client.reason;
  const loginFailed = reason.includes('Login unsuccessful')
    || reason.includes('Login authentication failed')
    || reason.includes('Error logging in')
    || reason.includes('Improperly formatted auth');

  if (loginFailed) {
    console.error('****************************************************************');
    console.error('OAuth token has expired');
    console.error('Go to ' + getOAuthTokenUrl() + ' to generate a new token');
    console.error('****************************************************************');
  }
}

function onEmotesetsChanged(sets, setsById) {
  if (sets) {
    availableEmotes = Object.values(setsById).flatMap(o => o).reduce((map, o) => {
      map[o.id] = o.code;
      return map;
    }, {});
  }
}
