'use strict';

const tmi = require('tmi.js');
const _fetch = require('node-fetch');
const { EventEmitter } = require('node:events');

function fetch(url, opts) {
    if (!opts) { 
        opts = {};
    }

    return _fetch(url, {
        method:  opts.method,
        headers: opts.headers,
    }).then(data => data.json(), err => err);
}

function getOAuthTokenUrl() {
    const qs = new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        redirect_uri: process.env.CLIENT_REDIRECT_URL,
        response_type: 'code',
    });
    return `https://id.twitch.tv/oauth2/authorize?${qs}`;
}

class Client extends EventEmitter {
    #client;
    #channel;
    #bearerPromise;
    #availableEmotes = {};
    #bttvEmotes;
    #viewerList = [];

    get availableEmotes() { return this.#availableEmotes; }
    get bttvEmotes() { return this.#bttvEmotes; }
    get viewerList() { return this.#viewerList; }

    constructor(opts) {
        super();

        this.#channel = opts.channels[0];
        this.#client = new tmi.client(opts);
        this.#client.on('message', this.#onMessage.bind(this));
        this.#client.on('connected', this.#onConnected.bind(this));
        this.#client.on('disconnected', this.#onDisconnected.bind(this));
        this.#client.on('emotesets', this.#onEmotesetsChanged.bind(this));
        this.#client.connect();

        this.getChannelStatus().then(info => fetch('https://api.betterttv.net/3/cached/users/twitch/' + info.id))
          .then(data => {
            const emotes = data.channelEmotes.map(o => o.code);
            data.sharedEmotes.map(o => o.code).forEach(o => emotes.push(o));
        
            this.#bttvEmotes = emotes.length ? {
              codes: emotes,
              regex: new RegExp('(?<=^|\s)(' + emotes.join('|') + ')(?=\s|$)', 'g'),
            } : null;
        });

        this.updateViewerList();
        setInterval(this.updateViewerList.bind(this), 120 * 1000);
    }

    say(target, msg) {
        this.#client.say(target, msg);
    }
    
    #getBearerToken(/* scopes */) {
        if (!this.#bearerPromise) {
            const url = 'https://id.twitch.tv/oauth2/token?grant_type=client_credentials' 
                + '&client_id=' + process.env.CLIENT_ID 
                + '&client_secret=' + process.env.CLIENT_SECRET 
                // + (scopes ? '&scope=' + scopes : '')
                ;
          
            this.#bearerPromise = fetch(url, { method: 'POST' }).then(data => data.access_token);
        }
        return this.#bearerPromise;
    }
    
    getChannelStatus() {
        return this.#getBearerToken().then(token => {
            return fetch('https://api.twitch.tv/helix/users?login=' + this.#channel, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'client-id': process.env.CLIENT_ID,
                },
            });
        }).then(r => r.data[0]);
    }

    async updateViewerList() {
        const resp = await fetch('https://tmi.twitch.tv/group/user/' + this.#channel + '/chatters');
        this.#viewerList = Object.values(resp.chatters).flatMap(o => o)
    }

    #onMessage(target, context, msg, self) {
        self || this.emit('message', target, context, msg);
    }

    #onConnected(addr, port) {
        console.log(`* Connected to ${addr}:${port}`);
    }

    #onDisconnected() {
        const reason = this.#client.reason;
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

    #onEmotesetsChanged(sets, setsById) {
        if (sets) {
            this.#availableEmotes = Object.values(setsById)
                .flatMap(o => o)
                .reduce((map, o) => {
                    map[o.id] = o.code;
                    return map;
                }, {});
        }
    }
}

Object.defineProperty(exports, '__esModule', { value: true });
module.exports = exports = {
    connect(opts) {
        return new Client(opts);
    }
};

exports.default = exports;