/*!
 * miot.js v1.1.6
 * https://github.com/qudou/miot
 * (c) 2017-2022 qudou
 * Released under the MIT license
 */

const mosca = require("mosca");
const xmlplus = require("xmlplus");

const log4js = require("log4js");
const { resolve } = require("path");
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
        map: { share: "Tools Crypto Sqlite" }
    },
    Mosca: { // 连接内网网关
        xml: "<main id='mosca' xmlns:i='mosca'>\
                <i:Authorize id='auth'/>\
                <i:Links id='links'/>\
                <i:Apps id='apps'/>\
                <i:Middle id='middle'/>\
              </main>",
        fun: async function (sys, items, opts) {
            let server = new mosca.Server({port: config.mqtt_port});
            server.on("ready", async () => {
                await items.links.offlineAll();
                await items.apps.offlineAll();
                Object.keys(items.auth).forEach(k => server[k] = items.auth[k]);
                logger.info("Mosca server is up and running"); 
            });
            server.on("subscribed", async (topic, client) => {
                await items.links.update(topic, 1);
                this.notify("to-users", {topic: "/ui/link", mid: uid, data: {mid: topic, online: 1}});
            });
            server.on("unsubscribed", async (topic, client) => {
                await items.links.update(topic, 0);
                await items.apps.update(topic, 0);
                this.notify("to-users", {topic: "/ui/link", mid: uid, data: {mid: topic, online: 0}});
            });
            server.on("published", async (packet, client) => {
                if (packet.topic !== uid) return;
                let p = JSON.parse(packet.payload + '');
                let m = await items.apps.getAppByLink(client.id, p.pid);
                if (!m) return;
                if (typeof p.online == "number") 
                    await items.apps.cache(m.id, p);
                p.mid = m.id;
                await items.middle.create(m.view, p);
            });
            this.watch("to-local", (e, topic, payload) => {
                payload = JSON.stringify(payload);
                server.publish({topic: topic, payload: payload, qos: 1, retain: false});
            });
        }
    },
    Proxy: { // 连接用户端
        xml: "<main id='proxy' xmlns:i='proxy'>\
                <i:Authorize id='auth'/>\
                <i:Users id='users'/>\
                <i:Middle id='middle'/>\
                <Tools id='tools'/>\
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
                let m = await items.tools.getAppById(packet.topic);
                p.cid = client.id;
                p.mid = packet.topic;
                await items.middle.create(m.view, p);
            });
            this.watch("to-user", (e, topic, p) => {
                p = (p.mid == uid) ? p : {mid: uid, topic: "/ui/app", data: p};
                p = JSON.stringify(p);
                server.publish({topic: topic, payload: p, qos: 1, retain: false});
            });
            this.watch("to-users", async (e, payload) => {
                let users = await items.users.getUsersByMiddle(payload.mid);
                users.forEach(item => this.notify("to-user", [item.client_id, payload]));
            });
        }
    },
    Tools: {
        xml: "<Sqlite id='sqlite'/>",
        fun: function (sys, items, opts) {
            let fs= require("fs");
            function exists(path) {
                return new Promise((resolve, reject) => {
                    fs.exists(path, e => resolve(e));
                });
            }
            function getAppById(appid) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM apps WHERE id = '${appid}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data[0]);
                    });
                });
            }
            return { getAppById: getAppById, exists: exists };
        }
    },
    Crypto: {
        fun: function (sys, items, opts) {
            let crypto = require("crypto");
            function encrypt(secret, salt, iterations = 32, keySize = 128) {
                return new Promise((resolve, reject) => {
                    crypto.pbkdf2(secret, salt, iterations, keySize/2, "sha1", (err, derivedKey) => {
                        if (err) throw err;
                        resolve(derivedKey.toString("hex"));
                    });
                });
            }
            function salt(len = 32) {
                return  crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
            }
            return { encrypt: encrypt, salt: salt };
        }
    },
    Sqlite: {
        fun: function (sys, items, opts) {
            let sqlite3 = require("sqlite3").verbose(),
                db = new sqlite3.Database(`${__dirname}/data.db`);
            // https://stackoverflow.com/questions/53299322/transactions-in-node-sqlite3
            sqlite3.Database.prototype.runAsync = function (sql, ...params) {
                return new Promise((resolve, reject) => {
                    this.run(sql, params, function (err) {
                        if (err) return reject(err);
                        resolve(this);
                    });
                });
            };
            sqlite3.Database.prototype.runBatchAsync = function (statements) {
                var results = [];
                var batch = ['BEGIN', ...statements, 'COMMIT'];
                return batch.reduce((chain, statement) => chain.then(result => {
                    results.push(result);
                    return db.runAsync(...[].concat(statement));
                }), Promise.resolve())
                .catch(err => db.runAsync('ROLLBACK').then(() => Promise.reject(err +
                    ' in statement #' + results.length)))
                .then(() => results.slice(2));
            };
            db.exec("VACUUM");
            db.exec("PRAGMA foreign_keys = ON");
            return db;
        }
    }
});

$_("mosca").imports({
    Authorize: {
        xml: "<main id='authorize'>\
                <Links id='links'/>\
                <Apps id='apps'/>\
              </main>",
        fun: function (sys, items, opts) {
            async function authenticate(client, user, pass, callback) {
                callback(null, await items.links.canLink(client.id));
            }
            return { authenticate: authenticate };
        }
    },
    Links: {
        xml: "<Sqlite id='sqlite' xmlns='/'/>",
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
    Apps: {
        xml: "<Sqlite id='sqlite' xmlns='/'/>",
        fun: function (sys, items, opts) {
            async function cache(mid, payload) {
                let str = "UPDATE apps SET online=% WHERE id=?";
                let stmt = items.sqlite.prepare(str.replace('%', payload.online == undefined ? 1 : payload.online));
                stmt.run(mid, err => {
                    if (err) throw err;
                });
            }
            function update(linkId, online) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE apps SET online=? WHERE link=? AND type>1");
                    stmt.run(online, linkId, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function offlineAll() {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE apps SET online=? WHERE type>1");
                    stmt.run(0, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function getAppByLink(linkId, partId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM apps WHERE link='${linkId}' AND part='${partId}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data[0]);
                    });
                });
            }
            function getAppsByLink(linkId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM apps WHERE link='${linkId}' AND type>1`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
            return { cache: cache, update: update, offlineAll: offlineAll, getAppByLink: getAppByLink, getAppsByLink: getAppsByLink };
        }
    },
    Middle: {
        xml: "<Tools id='tools' xmlns='/'/>",
        fun: function (sys, items, opts) {
            let table = {};
            async function create(klass, p) {
                if (!table[klass]) {
                    let path = `${__dirname}/middles/${klass}/pindex.js`;
                    if (!await items.tools.exists(path))
                        return sys.tools.trigger("to-users", p);
                    table[klass] = middle(klass, path);
                }
                let msgs = xp.messages(table[klass]);
                if(msgs.indexOf(p.topic) == -1)
                    return sys.tools.trigger("to-users", p);
                table[klass].notify(p.topic, p);
            }
            function middle(klass, path) {
                require(path);
                let c = xp.hasComponent(`//${klass}/Index`);
                c.map.msgscope = true;
                return sys.tools.append(`//${klass}/Index`);
            }
            this.on("to-users", (e, p) => {
                e.stopPropagation();
                let payload = {mid: p.mid, topic: p.topic, data: p.data};
                typeof p.online == "number" && (payload.online = p.online);
                this.notify("to-users", payload);
            });
            this.on("to-local", (e, p) => {
                e.stopPropagation();
                let m = items.uitl.getAppById(p.mid);
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
                let result = await items.login(client, user, pass + '');
                if (!result) return callback(true, false);
                result = await items.users.connected(client, result);
                callback(null, result);
            }
            async function authorizeSubscribe(client, topic, callback) {
                callback(null, await items.users.canSubscribe(client, topic));
            }
            async function authorizePublish(client, topic, payload, callback) {
                callback(null, await items.users.canPublish(client, topic), payload);
            }
            return { authenticate: authenticate, authorizeSubscribe: authorizeSubscribe, authorizePublish: authorizePublish };
        }
    },
    Login: {
        xml: "<main id='login' xmlns:i='login'>\
                <i:CheckUser id='checkUser'/>\
                <i:CheckPass id='checkPass'/>\
                <i:Session id='session'/>\
              </main>",
        fun: function (sys, items, opts) {
            async function byAccount(user, pass) {
                let item = await items.checkUser(user);
                let rightPass = await items.checkPass(pass, item.pass, item.salt);
                return item ? (rightPass && item) : false;
            }
            async function bySession(clientId) {
                let s = await items.session.detail(clientId);
                if (s == false)
                    return false;
                let timeout = new Date() - new Date(s.login_time) > s.livetime * 24000 * 3600;
                return timeout ? await items.session.clean(s.client_id) : s;
            }
            return async function (client, user, pass) {
                return user ? await byAccount(user, pass) : await bySession(client.id);
            };
        }
    },
    Users: {
        xml: "<Sqlite id='sqlite' xmlns='/'/>",
        fun: function (sys, items, opts) {
            function canSubscribe(client, topic) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM status
                                WHERE client_id='${client.id}' AND client_id='${topic}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(!!data.length);
                    });
                });
            }
            function canPublish(client, topic) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT status.* FROM status,auths
                                WHERE status.user_id = auths.user AND auths.app = '${topic}' AND status.client_id='${client.id}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(!!data.length);
                    });
                });
            }
            function getUsersByMiddle(mid) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT distinct status.* FROM users,auths,status
                                WHERE users.id = status.user_id AND users.id = auths.user AND auths.app = '${mid}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
            function connected(client, stat) {
                return new Promise((resolve, reject) => {
                    let insert = `REPLACE INTO status VALUES(?,?,1,(datetime('now','localtime')))`;
                    let stmt = items.sqlite.prepare(insert);
                    stmt.run(client.id, stat.id, err => {
                        if (err) throw err;
                        resolve(true)
                    });
                });
            }
            function disconnected(client) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE status SET online=0 WHERE client_id=?");
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
            return { canSubscribe: canSubscribe, canPublish: canPublish, getUsersByMiddle: getUsersByMiddle, connected: connected, disconnected: disconnected, offlineAll: offlineAll };
        }
    },
    Middle: {
        xml: "<Tools id='tools' xmlns='/'/>",
        fun: function (sys, items, opts) {
            let table = {};
            async function create(klass, p) {
                if (!table[klass]) {
                    let path = `${__dirname}/middles/${klass}/uindex.js`;
                    if (!await items.tools.exists(path))
                        return sys.tools.trigger("to-local", p);
                    table[klass] = middle(klass, path);
                }
                let msgs = xp.messages(table[klass]);
                if(msgs.indexOf(p.topic) == -1)
                    return sys.tools.trigger("to-local", p);
                table[klass].notify(p.topic, p);
            }
            function middle(klass, path) {
                require(path);
                let c = xp.hasComponent(`//${klass}/Index`);
                c.map.msgscope = true;
                return sys.tools.append(`//${klass}/Index`);
            }
            this.on("to-users", (e, p) => {
                e.stopPropagation();
                let payload = {mid: p.mid, topic: p.topic, data: p.data};
                p.cid ? this.notify("to-user", [p.cid, payload]) : this.notify("to-users", payload);
            });
            this.on("to-local", async (e, p) => {
                e.stopPropagation();
                let m = await items.tools.getAppById(p.mid);
                let body = { topic: p.topic, body: p.body };
                this.notify("to-local", [m.link, {pid: m.part, body: body}]);
            });
            return { create: create };
        }
    }
});

$_("proxy/login").imports({
    CheckUser: {
        xml: "<Sqlite id='sqlite' xmlns='/'/>",
        fun: function (sys, items, opts) {
            var ureg = /^[a-z0-9_]{4,31}$/i;
            function rightInDB(user) {
                return new Promise(async (resolve, reject) => {
                    let count = await loginTimes(user);
                    let stmt = `SELECT users.* FROM users,auths
                                WHERE name="${user}" AND auths.user = users.id AND (relogin=1 OR ${count}=0)`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(!!rows.length && rows[0]);
                    });
                });
            }
            function loginTimes(user) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT count(*) as count FROM users,status
                                WHERE users.id = status.user_id AND users.name = '${user}' AND status.online = 1`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows[0].count);
                    });
                });
            }
            return async function (user) {
                let strOk = typeof user == "string" && user.length <= 32 && ureg.test(user);
                return strOk ? await rightInDB(user) : false
            };
        }
    },
    CheckPass: {
        xml: "<Crypto id='crypto' xmlns='/'/>",
        fun: function (sys, items, opts) {
            return async function (pass, realPass, salt) {
                let strOk = typeof pass == "string" && 6 <= pass.length && pass.length <= 16;
                let inputPass = await items.crypto.encrypt(pass, salt);
                return strOk && (inputPass == realPass);
            };
        }
    },
    Session: {
        xml: "<Sqlite id='sqlite' xmlns='/'/>",
        fun: function (sys, items, opts) {
            let schedule = require("node-schedule");
            function getClients() {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT status.*,users.livetime FROM users,status
                                WHERE users.id = status.user_id AND status.online = 0`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows);
                    });
                });
            }
            schedule.scheduleJob(`0 1 * * *`, async e => {
                let clients = await getClients();
                clients.forEach(async s => {
                    let timeout = new Date() - new Date(s.login_time) > s.livetime * 24000 * 3600;
                    timeout && await clean(s.client_id)
                });
            });
            function detail(clientId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT status.*,id,livetime FROM users,status
                                WHERE users.id = status.user_id AND status.client_id='${clientId}'`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(!!rows.length && rows[0]);
                    });
                });
            }
            function clean(clientId) {
                return new Promise((resolve, reject) => {
                    let remove = `DELETE FROM status WHERE client_id=?`;
                    let stmt = items.sqlite.prepare(remove);
                    stmt.run(clientId, err => {
                        if (err) throw err;
                        resolve(false);
                    });
                });
            }
            return { detail: detail, clean: clean };
        }
    }
});

}).startup("//miot/Index");
