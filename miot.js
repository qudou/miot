/*!
 * miot.js v1.0.8
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const mosca = require("mosca");
const xmlplus = require("xmlplus");

const log4js = require("log4js");
log4js.configure({
    appenders: { "miot": { type: "file", filename: `${__dirname}/miot.log` } },
    categories: { default: { appenders: ["miot"], level: "info" } }
});
const logger = log4js.getLogger("miot");
const uid = "5ab6f0a1-e2b5-4390-80ae-3adf2b4ffd40";
const config = JSON.parse(require("fs").readFileSync(`${__dirname}/config.json`));

xmlplus("miot", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Mosca id='mosca'/>\
                <Proxy id='proxy'/>\
              </main>",
        map: { share: "sqlite/Sqlite Util" }
    },
    Mosca: { // 本服务器用于连接内网网关
        xml: "<main id='mosca' xmlns:i='mosca'>\
                <i:Authorize id='auth'/>\
                <i:Links id='links'/>\
                <i:Parts id='parts'/>\
                <i:Middle id='middle'/>\
              </main>",
        fun: async function (sys, items, opts) {
            let server = new mosca.Server({port: config.mqtt_port});
            server.on("ready", async () => {
                await items.links.offlineAll();
                await items.parts.offlineAll();
                Object.keys(items.auth).forEach(k => server[k] = items.auth[k]);
                logger.info("Mosca server is up and running"); 
            });
            server.on("subscribed", async (topic, client) => {
                await items.links.update(topic, 1);
                this.notify("to-users", {topic: "/ui/link", mid: uid, data: {mid: topic, online: 1}});
            });
            server.on("unsubscribed", async (topic, client) => {
                await items.links.update(topic, 0);
                await items.parts.update(topic, 0);
                this.notify("to-users", {topic: "/ui/link", mid: uid, data: {mid: topic, online: 0}});
            });
            server.on("published", async (packet, client) => {
                if (packet.topic !== "/SYS") return;
                let p = JSON.parse(packet.payload + '');
                let m = await items.parts.getPartByLink(client.id, p.pid);
                if (!m) return;
                if (p.topic == "/SYS")
                    await items.parts.cache(m.id, p);
                p.mid = m.id;
                await items.middle.create(m['class'], p);
            });
            this.watch("to-local", (e, topic, payload) => {
                payload = JSON.stringify(payload);
                server.publish({topic: topic, payload: payload, qos: 1, retain: false});
            });
        }
    },
    Proxy: { // 本服务器用于连接用户端
        xml: "<main id='proxy' xmlns:i='proxy'>\
                <i:Authorize id='auth'/>\
                <i:Users id='users'/>\
                <i:Middle id='middle'/>\
                <Util id='util' xmlns='.'/>\
              </main>",
        opt: { port: 1888, http: { port: config.http_port, static: `${__dirname}/static`, bundle: true } },
        fun: function (sys, items, opts) {
            let server = new mosca.Server(opts);
            server.on("ready", async () => {
                await items.users.offlineAll();
                Object.keys(items.auth).forEach(k => server[k] = items.auth[k]);
                logger.info("Proxy server is up and running"); 
            });
            server.on("clientDisconnected", client => items.users.disconnected(client));
            server.on("published", async (packet, client) => {
                if (client == undefined) return;
                let p = JSON.parse(packet.payload + '');
                let m = await items.util.getPartById(packet.topic);
                p.cid = client.id;
                p.mid = packet.topic;
                await items.middle.create(m['class'], p);
            });
            this.watch("to-user", (e, topic, p) => {
                p = (p.mid == uid) ? p : {mid: uid, topic: "/ui/part", data: p};
                p = JSON.stringify(p);
                server.publish({topic: topic, payload: p, qos: 1, retain: false});
            });
            this.watch("to-users", async (e, payload) => {
                let users = await items.users.getUsersByMiddle(payload.mid);
                users.forEach(item => this.notify("to-user", [item.client_id, payload]));
            });
        }
    },
    Util: {
        xml: "<Sqlite id='sqlite' xmlns='sqlite'/>",
        fun: function (sys, items, opts) {
            let fs= require("fs");
            function exists(path) {
                return new Promise((resolve, reject) => {
                    fs.exists(path, e => resolve(e));
                });
            }
            function getPartById(partId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM parts WHERE id = '${partId}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data[0]);
                    });
                });
            }
            return { getPartById: getPartById, exists: exists };
        }
    }
});

$_("mosca").imports({
    Authorize: {
        xml: "<main id='authorize'>\
                <Links id='links'/>\
                <Parts id='parts'/>\
              </main>",
        fun: function (sys, items, opts) {
            async function authenticate(client, user, pass, callback) {
                callback(null, await items.links.canLink(client.id));
            }
            return { authenticate: authenticate };
        }
    },
    Links: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            function canLink(linkId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM links WHERE id = '${linkId}' AND online = 0`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(!!data.length);
                    });
                });
            }
            function update(linkId, online) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE links SET online=? WHERE id=?");
                    stmt.run(online, linkId, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function offlineAll() {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE links SET online=? WHERE id <> '79b6a4b2-599c-49d0-8f22-8cee7d7b7ada'");
                    stmt.run(0, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            return { canLink: canLink, update: update, offlineAll: offlineAll };
        }
    },
    Parts: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            async function cache(mid, payload) {
                let str = "UPDATE parts SET online=% WHERE id=?";
                let stmt = items.sqlite.prepare(str.replace('%', payload.online == undefined ? 1 : payload.online));
                stmt.run(mid, err => {
                    if (err) throw err;
                });
            }
            function update(linkId, online) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE parts SET online=? WHERE link=? AND type>1");
                    stmt.run(online, linkId, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function offlineAll() {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE parts SET online=? WHERE type>1");
                    stmt.run(0, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function getPartByLink(linkId, partId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM parts WHERE link='${linkId}' AND part = '${partId}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data[0]);
                    });
                });
            }
            function getPartsByLink(linkId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM parts WHERE link='${linkId}' AND type>1`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
            return { cache: cache, update: update, offlineAll: offlineAll, getPartByLink: getPartByLink, getPartsByLink: getPartsByLink };
        }
    },
    Middle: {
        xml: "<Util id='util' xmlns='/'/>",
        fun: function (sys, items, opts) {
            let table = {};
            async function create(klass, p) {
                if (!table[klass]) {
                    let path = `${__dirname}/middles/${klass}/pindex.js`;
                    if (!await items.util.exists(path))
                        return sys.util.trigger("to-users", p);
                    table[klass] = middle(klass, path);
                }
                let msgs = xp.messages(table[klass]);
                if(msgs.indexOf(p.topic) == -1)
                    return sys.util.trigger("to-users", p);
                table[klass].notify(p.topic, p);
            }
            function middle(klass, path) {
                require(path);
                let c = xp.hasComponent(`//${klass}/Index`);
                c.map.msgscope = true;
                return sys.util.append(`//${klass}/Index`);
            }
            this.on("to-users", (e, p) => {
                e.stopPropagation();
                let payload = {mid: p.mid, topic: p.topic, data: p.data};
                p.topic == "/SYS" && (payload.online = p.online);
                this.notify("to-users", payload);
            });
            this.on("to-local", (e, p) => {
                e.stopPropagation();
                let m = items.uitl.getPartById(p.mid);
                let body = { topic: p.topic, body: p.body };
                this.notify("to-local", [m.link, {pid: m.part, body: body}]);
            });
            return { create: create };
        }
    }
});

$_("proxy").imports({
    Authorize: {
        xml: "<main id='authorize'>\
                <Login id='login'/>\
                <Users id='users'/>\
              </main>",
        fun: function (sys, items, opts) {
            async function authenticate(client, user, pass, callback) {
                let result = await items.login(user, pass + '');
                if (!result) return callback(true, false);
                result = items.users.connected(client, result);
                callback(null, result);
            }
            async function authorizeSubscribe(client, topic, callback) {
                callback(null, await items.users.canSubscribe(client, topic));
            }
            return { authenticate: authenticate, authorizeSubscribe: authorizeSubscribe };
        }
    },
    Login: {
        xml: "<main id='login' xmlns:i='login'>\
                <Sqlite id='sqlite' xmlns='/sqlite'/>\
                <i:Crypto id='crypto'/>\
                <i:InputCheck id='check'/>\
              </main>",
        fun: function (sys, items, opts) {
            function checkName(name, pass) {
                return new Promise(async (resolve, reject) => {
                    let count = await login_count(name);
                    let stmt = `SELECT users.* FROM users,auths
                                WHERE name="${name}" AND auths.user = users.id AND (repeat_login=1 OR ${count}=0)`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(!!rows.length && checkPass(pass, rows[0]) && rows[0]);
                    });
                });
            }
            function login_count(name) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT count(*) as count FROM users,status
                                WHERE users.id = status.user_id AND users.name = '${name}'`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows[0].count);
                    });
                });
            }
            function checkPass(pass, record) {
                return items.crypto.encrypt(pass, record.salt) == record.pass;
            }
            return async (name, pass) => {
                return items.check("u", name) && items.check("p", pass) && await checkName(name, pass);
            };
        }
    },
    Users: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            function canSubscribe(client) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM status WHERE client_id='${client.id}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(!!data.length);
                    });
                });
            }
            function getUsersByMiddle(mid) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT distinct status.* FROM users,auths,status
                                WHERE users.id = status.user_id AND users.id = auths.user AND auths.part = '${mid}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
            function connected(client, user) {
                return new Promise((resolve, reject) => {
                    let insert = `INSERT INTO status VALUES(?,?,(datetime('now','localtime')))`;
                    let stmt = items.sqlite.prepare(insert);
                    stmt.run(client.id, user.id, err => resolve(!!!err));
                });
            }
            function disconnected(client) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("DELETE FROM status WHERE client_id=?");
                    stmt.run(client.id, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function offlineAll() {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("DELETE FROM status");
                    stmt.run(err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            return { canSubscribe: canSubscribe, getUsersByMiddle: getUsersByMiddle, connected: connected, disconnected: disconnected, offlineAll: offlineAll };
        }
    },
    Middle: {
        xml: "<Util id='util' xmlns='/'/>",
        fun: function (sys, items, opts) {
            let table = {};
            async function create(klass, p) {
                if (!table[klass]) {
                    let path = `${__dirname}/middles/${klass}/uindex.js`;
                    if (!await items.util.exists(path))
                        return sys.util.trigger("to-local", p);
                    table[klass] = middle(klass, path);
                }
                let msgs = xp.messages(table[klass]);
                if(msgs.indexOf(p.topic) == -1)
                    return sys.util.trigger("to-local", p);
                table[klass].notify(p.topic, p);
            }
            function middle(klass, path) {
                require(path);
                let c = xp.hasComponent(`//${klass}/Index`);
                c.map.msgscope = true;
                return sys.util.append(`//${klass}/Index`);
            }
            this.on("to-users", (e, p) => {
                e.stopPropagation();
                let payload = {mid: p.mid, topic: p.topic, data: p.data};
                p.cid ? this.notify("to-user", [p.cid, payload]) : this.notify("to-users", payload);
            });
            this.on("to-local", async (e, p) => {
                e.stopPropagation();
                let m = await items.util.getPartById(p.mid);
                let body = { topic: p.topic, body: p.body };
                this.notify("to-local", [m.link, {pid: m.part, body: body}]);
            });
            return { create: create };
        }
    }
});

$_("proxy/login").imports({
    InputCheck: {
        fun: function (sys, items, opts) {
            var ureg = /^[A-Z0-9]{4,}$/i,
                ereg = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
            var table = { u: user, p: pass, e: email };
            function user( v ) {
                return v.length <= 32 && ureg.test(v);
            }
            function pass( v ) {
                return 6 <= v.length && v.length <= 16 
            }
            function email( v ) {
                return v.length <= 32 && ereg.test(v);
            }
            function check( key, value ) {
                return typeof value == "string" && table[key](value);
            }
            return check;
        }
    },
    Crypto: {
        opt: { keySize: 512/32, iterations: 32 },
        map: { format: { "int": "keySize iterations" } },
        fun: function (sys, items, opts) {
            var cryptoJS = require("crypto-js");
            function encrypt(plaintext, salt) {
                return cryptoJS.PBKDF2(plaintext, salt, opts).toString();
            }
            function salt() {
                return cryptoJS.lib.WordArray.random(128/8).toString();
            }
            return { encrypt: encrypt, salt: salt };
        }
    }
});

$_("sqlite").imports({
    Sqlite: {
        fun: function (sys, items, opts) {
            let sqlite = require("sqlite3").verbose(),
                db = new sqlite.Database(`${__dirname}/data.db`);
            db.exec("VACUUM");
            db.exec("PRAGMA foreign_keys = ON");
            return db;
        }
    }
});

}).startup("//miot/Index");
