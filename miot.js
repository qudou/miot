/*!
 * miot.js v1.1.14
 * https://github.com/qudou/miot
 * (c) 2017-2022 qudou
 * Released under the MIT license
 */

const mosca = require("mosca");
const xmlplus = require("xmlplus");
const uid = "5ab6f0a1-e2b5-4390-80ae-3adf2b4ffd40";
const fs = require("fs");
const config = JSON.parse(fs.readFileSync(`${__dirname}/config.json`).toString().replace(/dir/g, __dirname));
xmlplus("miot", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Logger id='logger'/>\
                <Mosca id='mosca'/>\
                <Proxy id='proxy'/>\
              </main>",
        cfg: { logger: config.logger },
        map: { share: "Logger Crypto Sqlite Common mosca/Middle" }
    },
    Mosca: { // 连接内网网关
        xml: "<main id='mosca' xmlns:i='mosca'>\
                <i:Authorize id='auth'/>\
                <i:Links id='links'/>\
                <i:Apps id='apps'/>\
                <i:Middle id='middle'/>\
                <Logger id='logger'/>\
              </main>",
        fun: function (sys, items, opts) {
            let server = new mosca.Server(config.gateway);
            server.on("ready", async () => {
                await items.links.offlineAll();
                await items.apps.offlineAll();
                Object.keys(items.auth).forEach(k => server[k] = items.auth[k]);
                items.logger.info("Mosca server is up and running"); 
            });
            server.on("subscribed", async (topic, client) => {
                await items.links.update(topic, 1);
                this.notify("to-users", {mid: uid, topic: "/stat/link", data: {mid: topic, data: 1}});
            });
            server.on("unsubscribed", async (topic, client) => {
                await items.links.update(topic, 0);
                await items.apps.update(topic, 0);
                this.notify("to-users", {mid: uid, topic: "/stat/link", data: {mid: topic, data: 0}});
            });
            server.on("published", async (packet, client) => {
                if (packet.topic !== uid) return;
                let p = JSON.parse(packet.payload + '');
                let m = await items.apps.getAppByLink(client.id, p.pid);
                if (!m) return;
                if (!p.topic) 
                    await items.apps.cache(m.id, p);
                p.mid = m.id;
                await items.middle.notify(m.view, "pindex", p);
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
                <Middle id='middle' xmlns='mosca'/>\
                <i:Session id='session'/>\
                <Logger id='logger'/>\
                <Common id='common'/>\
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
                let s = await items.common.getUserByClient(client.id);
                let p = {topic: "/ui/session", data: {session: s.session, username: s.name}};
                p = JSON.stringify(p);
                server.publish({topic: client.id, payload: p, qos: 1, retain: false});
            });
            server.on("clientDisconnected", async client => items.users.disconnected(client));
            server.on("published", async (packet, client) => {
                if (client == undefined) return;
                let p = JSON.parse(packet.payload + '');
                let m = await items.common.getAppById(packet.topic);
				let u = await items.common.getUserByClient(client.id);
                p.cid = client.id;
                p.mid = packet.topic;
				p.user = u.name;
                await items.middle.notify(m.view, "uindex", p);
            });
            this.watch("to-user", (e, topic, p) => {
                p = (p.mid == uid) ? p : {topic: p.topic ? "/ui/app" : "/stat/app", data: p};
                p = JSON.stringify(p);
                server.publish({topic: topic, payload: p, qos: 1, retain: false});
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
                let stmt = items.sqlite.prepare(str.replace('%', payload.topic ? 1 : payload.data));
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
        xml: "<Common id='middle' xmlns='/'/>",
        fun: async function (sys, items, opts) {
            let table = {};
			let viewId = "c258080a-d635-4e1b-a61f-48ff552c146a";
			let sdir = `${__dirname}/middles/sys`;
			let mids = fs.readdirSync(sdir);
			for (let mid of mids)
				if (await items.middle.exists(`${sdir}/${mid}/uindex.js`))
					table[mid] = sys.middle.append("System", { mid: mid }).val();
            this.on("to-users", (e, p) => {
                e.stopPropagation();
                let payload = {mid: p.mid, topic: p.topic, data: p.data};
                p.cid ? this.notify("to-user", [p.cid, payload]) : this.notify("to-users", payload);
            });
            this.on("to-local", async (e, p) => {
                e.stopPropagation();
                let m = await items.middle.getAppById(p.mid);
                let body = { topic: p.topic, body: p.body };
                this.notify("to-local", [m.link, {pid: m.part, body: body}]);
            });
			function notify(mid, type, p) {
				table[mid] ? table[mid].notify(p) : table[viewId].notify(type, [mid, p]);
            }
            return { notify: notify };
        }
    },
    System: {
        xml: "<main id='system'/>",
		map: { msgscope: true },
        fun: function (sys, items, opts) {
			require(`${__dirname}/middles/sys/${opts.mid}/uindex.js`);
			sys.system.append(`//${opts.mid}/Index`);
            function notify(p) {
                let msgs = xp.messages(sys.system);
                if(msgs.indexOf(p.topic) == -1)
                    return sys.system.trigger("to-users", p);
                sys.system.notify(p.topic, p);
            }
			return { notify: notify };
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
                let user_ = await items.login(client, user, pass);
                if (!user_) return callback(true, false);
                callback(null, await items.users.connected(client, user_));
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
                let user_ = await items.checkUser(user);
                if (!user_) return;
                return await items.checkPass(pass, user_.pass, user_.salt) && user_;
            }
            async function bySession(session) {
                return await items.session.detail(session);
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
                  <Logger id='logger' xmlns='/'/>\
              </main>",
        fun: function (sys, items, opts) {
            // The registered subject must be consistent with the client ID
            function canSubscribe(client, topic) {
                return client.id == topic;
            }
            // Here, topic need to be legal
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
                    let stmt = `SELECT distinct status.* FROM auths,status
                                WHERE status.user_id = auths.user AND auths.app = '${mid}'`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows);
                    });
                });
            }
            function connected(client, user) {
                return new Promise((resolve, reject) => {
                    let statements = [
                        [`INSERT INTO status(client_id,user_id) VALUES(?,?)`, client.id, user.id],
                        [`UPDATE users SET last_login=datetime('now', 'localtime') WHERE id=?`, user.id]
                    ];
                    items.sqlite.runBatchAsync(statements).then(results => {
                        resolve(true);
                    }).catch(err => { // When client_id is repeated, it will be executed here
                        items.logger.error(err.toString());
                        resolve(false);
                    });
                });
            }
            function disconnected(client) {
                let stmt = items.sqlite.prepare("DELETE FROM status WHERE client_id=?");
                stmt.run(client.id, err => {
                    if (err) throw err;
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
    Session: {
        xml: "<Sqlite id='sqlite' xmlns='/'/>",
        fun: function (sys, items, opts) {
            // check sessions once an hour
            let schedule = require("node-schedule");
            schedule.scheduleJob(`0 1 * * *`, async e => {
                let stmt = `SELECT * FROM users`;
                items.sqlite.all(stmt, (err, users) => {
                    if (err) throw err;
                    users.forEach(user => {
                        if (new Date() - new Date(user.last_login) > user.livetime * 24000 * 3600)
                            replace(user.id, Math.random().toString(16).substr(2, 8));
                    });
                });
            });
            function replace(user_id, session) {
                let stmt = items.sqlite.prepare("UPDATE users SET session=? WHERE id=?");
                stmt.run(session, user_id, err => {
                    if (err) throw err;
                });
            }
            function detail(session) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM users WHERE session='${session}'`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows[0]);
                    });
                });
            }
            return { detail: detail };
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
                                WHERE users.id = status.user_id AND users.name = '${user}'`;
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
    Logger: {//自定义日志模块
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
    },
    Common: {
        xml: "<Sqlite id='sqlite'/>",
        fun: function (sys, items, opts) {
            let fs= require("fs");
            function exists(path) {
                return new Promise((resolve, reject) => fs.exists(path, e => resolve(e)));
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
            function getUserByClient(client_id) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT users.* FROM users,status
                                WHERE status.client_id='${client_id}' AND users.id=status.user_id`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows[0]);
                    });
                });
            }
            return { getAppById: getAppById, exists: exists, getUserByClient: getUserByClient };
        }
    }
});

}).startup("//miot/Index");
