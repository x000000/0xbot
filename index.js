'use strict';

require('dotenv').config();
const twitch = require('./twitch');
const { quoteIds, quotes, bites } = require('./aihhho');
const { randomInt } = require('crypto');

const notFound = process.env.NOT_FOUND_MESSAGE || 'The quote not found';
const responseTimeout = +process.env.RESPONSE_TIMEOUT || 1000;

const opts = {
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.OAUTH_TOKEN,
  },
  channels: [
    process.env.CHANNEL_NAME,
  ]
};

function isEmoteChant(availableEmotes, bttvEmotes, emotes, msg) {
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

function buildSay(client, timeout) {
  client.lastResponseTime = 0;
  let _lastResponseTime = 0;
  
  return function(target, msg) {
    const now = Date.now();

    if ((now - _lastResponseTime < timeout) || (now - client.lastResponseTime < responseTimeout)) {
      return false;
    }
  
    client.lastResponseTime = _lastResponseTime = now;
    client.say(target, msg);

    return true;
  };
}

const sayProto = {
  chant: say => {
    return (target, msg) => say(target, msg);
  },
  
  emoteChant: say => {
    return function (target, msg) {
      console.log('< ' + msg);
      say(target, msg);
    };
  },
  
  vote: say => {
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
  },
  
  bite: say => {
    return function (target, context) {
      let index = randomInt(-1, bites.length);
      const user = this.viewerList.length > 0 
        ? this.viewerList[randomInt(0, this.viewerList.length)] 
        : context.username;
      
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
  },
  
  qu: say => {
    return function (target, quoteId) {
      const id = quoteId || quoteIds[randomInt(0, quoteIds.length)];
      say(target, (quotes[id] || notFound).toString());
    };
  },
};

const client = twitch.connect(opts);
Object.assign(client.say, {
  chant: sayProto.chant(buildSay(client, 16000)),
  emoteChant: sayProto.emoteChant(buildSay(client, 16000)),
  vote: sayProto.vote(buildSay(client, 60000)),
  bite: sayProto.bite(buildSay(client, 10000)).bind(client),
  qu: sayProto.qu(buildSay(client, responseTimeout)),
});

client.addListener('message', function(target, context, msg) {
  if (!msg.startsWith('!')) {
    if (msg === 'Jebaited' || msg === 'CoolStoryBob') {
      this.say.chant(target, msg);
    } else if (msg === '+' || msg === '-') {
      this.say.vote(target, msg);
    } else if (isEmoteChant(this.availableEmotes, this.bttvEmotes, context.emotes, msg)) {
      this.say.emoteChant(target, msg);
    }
    return;
  }

  if (msg === '!кусь') {
    this.say.bite(target, context);
    return;
  }

  const match = msg.match(/^!qu(?:\s+(\d+))?$/i);
  if (match) {
    this.say.qu(target, match[1]);
  } else {
    console.warn(`* Unknown command: ${msg}`);
  }
});