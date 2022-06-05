/*!
 * miot.js v1.1.12
 * https://github.com/qudou/miot
 * (c) 2017-2022 qudou
 * Released under the MIT license
 */

const mosca = require("mosca");
const xmlplus = require("xmlplus");
const uid = "5ab6f0a1-e2b5-4390-80ae-3adf2b4ffd40";
const config = JSON.parse(require("fs").readFileSync(`${__dirname}/config.json`)
                                       .toString().replace(/dir/g, __dirname));
xmlplus("miot", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Logger id='logger'/>\
                <Mosca id='mosca'/>\
                <Proxy id='proxy'/>\
              </main>",
        cfg: { logger: config.logger },
        map: { share: "Tools Crypto Sqlite Logger" }
    },
    Mosca: { // 连接内网网关
        xml: "<main id='mosca' xmlns:i='mosca'>\
                <i:Authorize id='auth'/>\
                <i:Links id='links'/>\
                <i:Apps id='apps'/>\
                <i:Middle id='middle'/>\
                <Logger id='logger'/>\
              </main>",
        fun: async function (sys, items, opts) {
            let server = new mosca.Server(config.gateway);
            server.on("ready", async () => {
                await items.links.offlineAll();
                await items.apps.offlineAll();
                Object.keys(items.auth).forEach(k => server[k] = items.auth[k]);
                items.logger.info("Mosca server is up and running"); 
            });
            server.on("subscribed", async (topic, client) => {
                await items.links.update(topic, 1);
                this.notify("to-users", {topic: "/stat/link", mid: uid, data: {mid: topic, online: 1}});
            });
            server.on("unsubscribed", async (topic, client) => {
                await items.links.update(topic, 0);
                await items.apps.update(topic, 0);
                this.notify("to-users", {topic: "/stat/link", mid: uid, data: {mid: topic, online: 0}});
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
                <i:Session id='session'/>\
                <Tools id='tools'/>\
                <Logger id='logger'/>\
              </main>",
        map: { share: "proxy/Session" },
        fun: function (sys, items, opts) {
            let server = new mosca.Server(config.view);
            server.on("ready", async () => {
                await items.users.offlineAll();
                Object.keys(items.auth).forEach(k => server[k] = items.auth[k]);
                items.logger.info("Proxy server is up and running"); 
            });
            server.on("subscribed", async (topic, client) => {
                let s = await items.session.byClientId(client.id);
                let p = {mid: uid, topic: "/session", data: {session: s.session}};
                p = JSON.stringify(p);
                server.publish({topic: client.id, payload: p, qos: 1, retain: false});
            });
            server.on("clientDisconnected", async client => await items.users.disconnected(client));
            server.on("published", async (packet, client) => {
                if (client == undefined) return;
                let p = JSON.parse(packet.payload + '');
                let m = await items.tools.getAppById(packet.topic);
                p.cid = client.id;
                p.mid = packet.topic;
                await items.middle.create(m.view, p);
            });
            this.watch("to-user", (e, topic, p) => {
                p = (p.mid == uid) ? p : {mid: uid, topic: p.topic ? "/ui/app" : "/stat/app", data: p};
                p = JSON.stringify(p);
                server.publish({topic: topic, payload: p, qos: 1, retain: false});
            });
            this.watch("to-users", async (e, payload) => {
                let users = await items.users.getUsersByMiddle(payload.mid);
                users.forEach(item => this.notify("to-user", [item.client_id, payload]));
            });
        }
    },
    Logger: {
        opt: { level: "info", appender: "default" },
        fun: function (sys, items, opts) {
            let results = {};
            let levels = {"trace":0,"debug":1,"info":2,"warn":3,"error":4,"fatal":5};
            let min = levels[opts.level];
            function format(date, fmt) {
                var o = { "y+" : date.getFullYear(), "M+" : date.getMonth() + 1, "d+" : date.getDate(), "h+" : date.getHours(), "m+" : date.getMinutes(), "s+" : date.getSeconds(), "S+" : date.getMilliseconds() };
                var z = { "y+" : '0000', 'M+': '00', 'd+': '00', 'h+': '00', 'm+': '00', 's+': '00', 'S+': '000' };
                for (var k in o)
                    if (new RegExp("(" + k + ")").test(fmt))
                        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : ((z[k] + o[k]).substr(("" + o[k]).length)));
                return fmt;
            }
            function printf(level, appender, text) {
                // [2010-01-17 11:43:37.987] [DEBUG] [default] - Some debug messages
                let date = format(new Date, "yyyy-MM-dd hh:mm:ss.SSS")
                console.log(`[${date}] [${level}] [${appender}] - ${text}`);
            }
            for (let l in levels )
                results[l] = text => (levels[l] >= min && printf(l, opts.appender, text));
            return results;
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
                let result = await items.login(client, user, pass);
                if (!result) return callback(true, false);
                await items.users.connected(client, result);
                callback(null, true);
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
                <Session id='session'/>\
                <i:CheckUser id='checkUser'/>\
                <i:CheckPass id='checkPass'/>\
              </main>",
        fun: function (sys, items, opts) {
            async function byAccount(user, pass) {
                let u = await items.checkUser(user);
                if (u && await items.checkPass(pass, u.pass, u.salt)) {
                    u.session = Math.random().toString(16).substr(2, 8) + `@${u.name}`;
                    items.session.insert(u.session, u.id);
                    return u;
                }
            }
            async function bySession(session) {
                let s = await items.session.detail(session);
                if (s == false)
                    return false;
                let timeout = new Date() - new Date(s.update_time) > s.livetime * 24000 * 3600;
                if (timeout)
                    return await items.session.remove(session);
                return await items.session.update(session), s;
            }
            return async function (client, user, pass) {
                return pass ? await byAccount(user, pass+'') : await bySession(user);
            };
        }
    },
    Users: {
        xml: "<main id='users'>\
                  <Session id='session'/>\
                  <Sqlite id='sqlite' xmlns='/'/>\
              </main>",
        fun: function (sys, items, opts) {
            // The registered subject must be consistent with the client ID
            function canSubscribe(client, topic) {
                return client.id == topic;
            }
            // Here, topic need to be legal
            function canPublish(client, topic) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT status.* FROM status,auths,sessions
                                WHERE sessions.id = status.session AND sessions.user_id = auths.user AND auths.app = '${topic}' AND status.client_id='${client.id}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(!!data.length);
                    });
                });
            }
            function getUsersByMiddle(mid) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT distinct status.* FROM auths,status,sessions
                                WHERE sessions.id = status.session AND sessions.user_id = auths.user AND auths.app = '${mid}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
            function connected(client, data) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("INSERT INTO status(client_id,session) VALUES(?,?)");
                    stmt.run(client.id, data.session, () => {
                        resolve(true);
                    });
                });
            }
            async function disconnected(client) {
                let s = await items.session.byClientId(client.id);
                if (s.livetime == 0)
                    return await items.session.remove(s.session);
                let stmt = items.sqlite.prepare("DELETE FROM status WHERE client_id=?");
                stmt.run(client.id, err => {
                    if (err) throw err;
                });
            }
            function offlineAll() {
                return new Promise((resolve, reject) => {
                    let statements = [
                        ["DELETE FROM status"],
                        ["DELETE FROM sessions"]
                    ];
                    items.sqlite.runBatchAsync(statements).then(results => {
                        resolve(true);
                    }).catch(err => {
                        throw err;
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
    },
    Session: {
        xml: "<Sqlite id='sqlite' xmlns='/'/>",
        fun: function (sys, items, opts) {
            function getSessions() {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT users.*,sessions.id AS session FROM users,sessions
                                WHERE users.id = sessions.user_id`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows);
                    });
                });
            }
            // clean once an hour
            let schedule = require("node-schedule");
            schedule.scheduleJob(`0 1 * * *`, async e => {
                let sessions = await getSessions();
                sessions.forEach(async s => {
                    let timeout = new Date() - new Date(s.update_time) > s.livetime * 24000 * 3600;
                    timeout && await clean(s.session)
                });
            });
            function detail(value) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT users.*,sessions.id as session FROM users,sessions
                                WHERE sessions.id='${value}' AND sessions.user_id=users.id`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(!!rows.length && rows[0]);
                    });
                });
            }
            function byClientId(clientId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT users.*,sessions.id as session, sessions.update_time FROM users,sessions,status
                                WHERE status.client_id='${clientId}' AND sessions.id=status.session AND sessions.user_id=users.id`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows[0]);
                    });
                });
            }
            function insert(sid, user_id) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("INSERT INTO sessions (id,user_id) VALUES(?,?)");
                    stmt.run(sid, user_id, () => {
                        resolve(true);
                    });
                });
            }
            function update(sid) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE sessions SET update_time=(datetime('now', 'localtime')) WHERE id=?");
                    stmt.run(sid, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function remove(session) {
                return new Promise((resolve, reject) => {
                    let remove = `DELETE FROM sessions WHERE id=?`;
                    let stmt = items.sqlite.prepare(remove);
                    stmt.run(session, err => {
                        if (err) throw err;
                        resolve(false);
                    });
                });
            }
            return { detail: detail, byClientId: byClientId, insert: insert, update: update, remove: remove };
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
                    let stmt = `SELECT count(*) as count FROM users,sessions,status
                                WHERE users.id = sessions.user_id AND users.name = '${user}' AND status.session = sessions.id`;
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
    }
});

$_().imports({
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

}).startup("//miot/Index");
