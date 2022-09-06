'use strict';

const WebSocket = require('ws');
const Centrifuge = require('centrifuge');
const _fetch = require('node-fetch');
const { EventEmitter } = require('node:events');

const authHeaders = { 'Authorization': 'Bearer ' + process.env.VK_AUTH_BEARER };

function fetch(url, opts) {
    return _fetch(url, opts || {}).then(data => data.json(), err => err);
}

class WS extends WebSocket {
    constructor(address, protocol, opts) {
        super(address, protocol, { ... opts, origin: 'https://vkplay.live' });
    }
}

class Client extends EventEmitter {
    #centrifuge;
    #channel;

    constructor(opts) {
        super();
        this.#channel = opts.channel;

        Promise.all([
            fetch('https://api.vkplay.live/v1/ws/connect', { headers: authHeaders }),
            fetch('https://api.vkplay.live/v1/blog/' + this.#channel + '/public_video_stream'),
        ])
        .then(([{ token }, data]) => {
            const wsChat   = data.wsChatChannel;
            const wsStream = data.wsStreamChannel;

            this.#centrifuge = new Centrifuge('wss://pubsub.boosty.to/connection/websocket', {
                websocket: WS,
                debug: true,
            });
            this.#centrifuge.setToken(token);
            
            this.#centrifuge.subscribe(wsChat, ev => {
                const username = ev.data.data.user.name;
                const msg = ev.data.data.data
                    .filter(o => o.type === 'text' && !o.modificator)
                    .map(o => JSON.parse(o.content)[0])
                    .join(' ');

                this.emit('message', this.#channel, { username }, msg);
            });

            this.#centrifuge.connect();
        });
    }

    say(target, msg) {
        const endpoint = 'https://api.vkplay.live/v1/blog/' + target + '/public_video_stream/chat'
        const payload = JSON.stringify({
            createdAt: (new Date().getTime() / 1000) | 0,
            data: [
                {
                    type: 'text',
                    modificator: '',
                    content: JSON.stringify([ msg, 'unstyled', [] ]),
                },
                {
                    type: 'text',
                    modificator: 'BLOCK_END',
                    content: '',
                }
            ]
        });

        fetch(endpoint, { method: 'POST', headers: authHeaders, body: encodeURIComponent(payload) });
    }
}

Object.defineProperty(exports, '__esModule', { value: true });
module.exports = exports = {
    connect(opts) {
        return new Client(opts);
    }
};

exports.default = exports;