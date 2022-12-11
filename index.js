'use strict';

require('dotenv').config();
const twitch = require('./twitch');
// const vklive = require('./vklive');
const { bites } = require('./bite');
const aihhho = require('./aihhho');
const { randomInt } = require('crypto');

const notFound = process.env.NOT_FOUND_MESSAGE || 'The quote not found';
const responseTimeout = +process.env.RESPONSE_TIMEOUT || 1000;

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

let sayCount = 0;
function buildSay(client, timeout) {
  if (!client.lastResponseTimeByChannel) {
    client.lastResponseTimeByChannel = {};
  }
  const timeProp = 'say' + sayCount++;
  
  return function(target, msg) {
    const now = Date.now();
    let lastResponseTime = client.lastResponseTimeByChannel[target];
    
    if (!lastResponseTime) {
      client.lastResponseTimeByChannel[target] = lastResponseTime = {
        shared: 0,
        [timeProp]: 0,
      };
    }
    
    if ((now - (lastResponseTime[timeProp] || 0) < timeout) || (now - lastResponseTime.shared < responseTimeout)) {
      return false;
    }
  
    lastResponseTime[timeProp] = now;
    lastResponseTime.shared = now;
    client.say(target, msg);

    return true;
  };
}

const quoteProviders = {
  '#aihhho': aihhho.quotesProvider,
};
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
      const provider = quoteProviders[target];
      if (provider) {
        const id = quoteId || provider.quoteIds[randomInt(0, provider.quoteIds.length)];
        say(target, (provider.quotes[id] || notFound).toString());
      }
    };
  },
};

function onMessage(target, context, msg) {
  if (!msg.startsWith('!')) {
    if (this.say.chant && (msg === 'Jebaited' || msg === 'CoolStoryBob')) {
      this.say.chant(target, msg);
    } else if (msg === '+' || msg === '-') {
      this.say.vote(target, msg);
    } else if (this.say.emoteChant && isEmoteChant(this.availableEmotes, this.bttvEmotes, context.emotes, msg)) {
      this.say.emoteChant(target, msg);
    }
    return;
  }
  
  if (this.say.bite && msg === '!кусь') {
    this.say.bite(target, context);
    return;
  }
  
  const match = msg.match(/^!qu(?:\s+(\d+))?$/i);
  if (match) {
    this.say.qu(target, match[1]);
  } else {
    console.warn(`* Unknown command: ${msg}`);
  }
}

/*
const vkClient = vklive.connect({ channel: process.env.VK_CHANNEL_NAME });
Object.assign(vkClient.say, {
  vote: sayProto.vote(buildSay(vkClient, 60000)),
  qu: sayProto.qu(buildSay(vkClient, responseTimeout)),
});
vkClient.addListener('message', onMessage);
*/

const ttvClient = twitch.connect({
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.OAUTH_TOKEN,
  },
  channels: process.env.TTV_CHANNELS.split(',').map(c => c.trim()),
});
Object.assign(ttvClient.say, {
  chant: sayProto.chant(buildSay(ttvClient, 16000)),
  emoteChant: sayProto.emoteChant(buildSay(ttvClient, 16000)),
  vote: sayProto.vote(buildSay(ttvClient, 60000)),
  bite: sayProto.bite(buildSay(ttvClient, 10000)).bind(ttvClient),
  qu: sayProto.qu(buildSay(ttvClient, responseTimeout)),
});

ttvClient.addListener('message', onMessage);