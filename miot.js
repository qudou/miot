/*!
 * miot.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const mosca = require("mosca");
const xmlplus = require("xmlplus");
const ID = "c55d5e0e-f506-4933-8962-c87932e0bc2a";
const SECURE_KEY = __dirname + '/cert/2933686_xmlplus.cn.key';
const SECURE_CERT = __dirname + '/cert/2933686_xmlplus.cn.pem';

xmlplus("miot", (xp, $_, t) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Mosca id='mosca'/>\
                <Proxy id='proxy'/>\
              </main>",
        map: { share: "sqlite/Sqlite" }
    },
    Mosca: { // 本 MQTT 服务器用于连接 MQTT 客户端，一般是主机上的客户端，如树莓派等
        xml: "<main id='mosca' xmlns:i='mosca'>\
                <i:Authorize id='auth'/>\
                <i:Links id='links'/>\
                <i:Parts id='parts'/>\
              </main>",
        fun: async function (sys, items, opts) {
            let server = new mosca.Server({port: 1883});
            server.on("ready", async () => {
                await items.links.offlineAll();
                await items.parts.offlineAll();
                Object.keys(items.auth).forEach(k => server[k] = items.auth[k]);
                console.log("Mosca server is up and running"); 
            });
            server.on("subscribed", async (topic, client) => {
                await items.links.update(topic, 1);
            });
            server.on("unsubscribed", async (topic, client) => {
                await items.links.update(topic, 0);
                await items.parts.update(topic, 0);
                let parts = await items.parts.getPartsByLink(topic);
                parts.forEach(item => this.notify("to-users", {topic: "/SYS", mid: item.id, online: 0}));
            });
            server.on("published", async (packet, client) => {
                if (packet.topic == ID) {
                    let payload = JSON.parse(packet.payload + '');
                    let part = await items.parts.getPartByLink(client.id, payload.pid);
                    if (!part) return;
                    if (payload.topic == "/SYS")
                        await items.parts.cache(part.id, payload);
                    payload.mid = part.id;
                    this.notify("to-users", payload);
                }
            });
            this.watch("to-local", (e, topic, payload) => {
                payload = JSON.stringify(payload);
                server.publish({topic: topic, payload: payload, qos: 1, retain: false});
            });
        }
    },
    Proxy: { // 本代理用于连接客户端，一般是浏览器上的客户端
        xml: "<main id='proxy' xmlns:i='proxy'>\
                <i:Authorize id='auth'/>\
                <i:Users id='users'/>\
                <i:Factory id='factory'/>\
              </main>",
        opt: { port: 1885, https: { port: 443, bundle: true, static: `${__dirname}/static` }, secure: { keyPath: SECURE_KEY, certPath: SECURE_CERT } },
        fun: function (sys, items, opts) {
            let server = new mosca.Server(opts);
            server.on("ready", async () => {
                await items.users.offlineAll();
                Object.keys(items.auth).forEach(k => server[k] = items.auth[k]);
                console.log("Proxy server is up and running"); 
            });
            server.on("clientDisconnected", client => items.users.disconnected(client));
            server.on("published", async (packet, client) => {
                if (client == undefined) return;
                let p = JSON.parse(packet.payload + '');
                let m = await items.factory.getPartById(packet.topic);
                try {
                    p.pid = m.class;
                    p.cid = client.id;
                    p.uid = await items.users.getUidByCid(client.id);
                    p.mid = packet.topic;
                    p.link = m.link;
                    items.factory.create(m['class'], p);
                } catch(e) {
                    console.log(e);
                    let body = { topic: p.topic, body: p.body };
                    this.notify("to-local", [p.link, {pid: p.pid, body: body}]); 
                }
            });
            this.watch("to-user", (e, topic, payload) => {
                payload = JSON.stringify(payload);
                server.publish({topic: topic, payload: payload, qos: 1, retain: false});
            });
            this.watch("to-users", async (e, payload) => {
                let users = await items.users.getUsersByMiddle(payload.mid);
                users.forEach(item => this.notify("to-user", [item.client_id, payload]));
            });
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
                    let stmt = items.sqlite.prepare("UPDATE links SET online=?");
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
                    let stmt = `SELECT * FROM parts WHERE link='${linkId}' AND class = '${partId}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data[0]);
                    });
                });
            }
            function getPartsByLink(linkId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM parts WHERE link='${linkId}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
            return { cache: cache, update: update, offlineAll: offlineAll, getPartByLink: getPartByLink, getPartsByLink: getPartsByLink };
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
                items.users.connected(client, result);
                callback(null, true);
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
                    stmt.run(client.id, user.id, err => {
                        if (err) throw err;
                        resolve(true);
                    });
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
            function getUidByCid(clientId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT user_id FROM status WHERE client_id = '${clientId}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data[0].user_id);
                    });
                });
            }
            return { canSubscribe: canSubscribe, getUsersByMiddle: getUsersByMiddle, connected: connected, disconnected: disconnected, offlineAll: offlineAll, getUidByCid: getUidByCid };
        }
    },
    Factory: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            let table = {};
            function create(klass, p) {
                if (!table[klass]) {
                    require(`${__dirname}/middles/${klass}/index.js`);
                    let c = {map: {}, fun: fun};
                    c.xml = `<Index xmlns='//${klass}'/>`;
                    c.map.msgscope = true;
                    $_("proxy").imports({Middle: c});
                    table[klass] = sys.sqlite.append("Middle");
                }
                table[klass].trigger("/SYS", p, false);
            }
            function fun(sys, items, opts) {
                this.on("/SYS", (e, p) => this.notify(p.topic, p));
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
            this.on("to-user", (e, payload) => {
                let p = payload;
                e.stopPropagation();
                payload = { mid: p.mid, topic: p.topic, data: p.data };
                this.notify("to-user", [p.cid, payload]);
            });
            this.on("to-local", (e, payload) => {
                let p = payload;
                e.stopPropagation();
                let body = { topic: p.topic, body: p.body };
                this.notify("to-local", [p.link, {pid: p.pid, body: body}]);
            });
            return { create: create, getPartById: getPartById };
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