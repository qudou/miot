/*!
 * miot.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const mosca = require("mosca");
const xmlplus = require("xmlplus");
const ID = "c55d5e0e-f506-4933-8962-c87932e0bc2a";

xmlplus("miot", (xp, $_, t) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Mosca id='mosca'/>\
                <Proxy id='proxy'/>\
              </main>",
        map: { share: "sqlite/Sqlite" }
    },
    Mosca: { // 本 MQTT 服务器用于连接 MQTT 客户端，一般是主机上的客户端，如树莓派等等
        xml: "<main id='mosca' xmlns:i='mosca'>\
                <i:Authorize id='auth'/>\
                <i:Links id='links'/>\
                <i:Parts id='parts'/>\
              </main>",
        fun: async function (sys, items, opts) {
            let options = await items.parts.options();
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
                parts.forEach(item => this.notify("to-users", {mid: item.id, online: 0, topic: "options"}));
            });
            server.on("published", async (packet, client) => {
                if (client == undefined) return;
                if (packet.topic == ID) {
                    let payload = JSON.parse(packet.payload + '');
                    let part = await items.parts.getPartByLink(client.id, payload.pid);
                    if (!part) return;
                    xp.extend(options[part.id], payload.data);
                    items.parts.cache(part.id, payload.online, options[part.id]);
                    payload.mid = part.id;
                    payload.topic = "options";
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
        opt: { port: 1885, http: { port: 8082, bundle: true, static: `${__dirname}/static` } },
        fun: function (sys, items, opts) {
            let server = new mosca.Server(opts);
            server.on("ready", async () => {
                await items.auth.init();
                await items.users.offlineAll();
                delete items.auth.init;
                Object.keys(items.auth).forEach(k => server[k] = items.auth[k]);
                console.log("Proxy server is up and running"); 
            });
            server.on("clientConnected", client => items.users.connected(client));
            server.on("clientDisconnected", client => items.users.disconnected(client));
            server.on("published", async (packet, client) => {
                if (client == undefined) return;
                let p = JSON.parse(packet.payload + '');
                let m = await items.factory.getPartById(packet.topic);
                try {
                    p.pid = m.part, p.uid = client.id;
                    p.mid = packet.topic, p.link = m.link;
                    items.factory.create(m['class']).trigger("start", p);
                } catch(e) {
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
            function options() {
                return new Promise(resolve => {
                    items.sqlite.all("SELECT * FROM parts", (err, rows) => {
                        if (err) throw err;
                        let table = {};
                        rows.forEach(item => table[item.id] = JSON.parse(item.data));
                        resolve(table);
                    });
                });
            }
            function cache(id, online, data) {
                let str = "UPDATE parts SET data=?, online=% WHERE id=?";
                let stmt = items.sqlite.prepare(str.replace('%', online == undefined ? 1 : online));
                stmt.run(JSON.stringify(data), id, err => {
                    if (err) throw err;
                });
            }
            function update(linkId, online) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE parts SET online=? WHERE link = ?");
                    stmt.run(online, linkId, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function offlineAll() {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare(`UPDATE parts SET online=?`);
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
                    let stmt = `SELECT * FROM parts WHERE link='${linkId}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
            return { options: options, cache: cache, update: update, offlineAll: offlineAll, getPartByLink: getPartByLink, getPartsByLink: getPartsByLink };
        }
    }
});

$_("proxy").imports({
    Authorize: {
        xml: "<main id='authorize'>\
                <Login id='login'/>\
                <Users id='users'/>\
                <Sqlite id='sqlite' xmlns='/sqlite'/>\
              </main>",
        fun: function (sys, items, opts) {
            async function init() {
                let [xpath, doc, auths] = [require("xpath"), await toXML(), await table("authorizations")];
                for (let auth of auths) {
                    let arr = [];
                    let result = xpath.select(auth.parts, doc);
                    result.forEach(item => arr.push(item.getAttribute('id')));
                    await updateAuth(auth.id, arr.join(','));
                }
            }
            async function toXML() {
                let root_ = xp.parseXML("<areas/>");
                let [areas,links,parts] = [await table("areas"), await table("links"), await table("parts")];
                areas.forEach(area => {
                    let a = root_.lastChild.appendChild(Element(root_, "area_", area));
                    links.forEach(link => {
                        if (link.area == area.id) {
                            let l = a.appendChild(Element(root_, "link_", link));
                            parts.forEach(part => {
                                part.link == link.id && l.appendChild(Element(root_, "part_", part));
                            });
                        };
                    });
                });
                return root_;
            }
            async function updateAuth(id, memo) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE authorizations SET memo=? WHERE id=?");
                    stmt.run(memo, id, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            };
            function Element(root_, name, data) {
                let item = root_.createElement(name);
                item.setAttribute("id", data.id);
                return item;
            }
            async function table(name) {
                return new Promise((resolve, reject) => {
                    items.sqlite.all(`SELECT * FROM ${name}`, (err, rows) => {
                        if (err) throw err;
                        resolve(rows);
                    });
                });
            }
            async function authenticate(client, user, pass, callback) {
                let result = await items.login(user, pass + '');
                callback(result ? null : true, result);
            }
            async function authorizeSubscribe(client, topic, callback) {
                callback(null, await items.users.canSubscribe(client, topic));
            }
            return { init: init, authenticate: authenticate, authorizeSubscribe: authorizeSubscribe };
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
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT users.* FROM users,authorizations AS a
                                WHERE name="${name}" AND users.id = a.user AND (a.repeat_login=1 OR count=0)`;
                    items.sqlite.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(!!rows.length && checkPass(pass, rows[0]));
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
                    let stmt = `SELECT status.* FROM users,authorizations AS a, status
                                WHERE users.id = substr(status.client_id,1,32) AND users.id = a.user AND a.memo LIKE '%' || '${mid}' || '%'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
            function connected(client) {
                return new Promise((resolve, reject) => {
                    let insert = `INSERT INTO status VALUES(?,(datetime('now','localtime')))`;
                    let stmt = items.sqlite.prepare(insert);
                    stmt.run(client.id, async err => {
                        if (err) throw err;
                        await changeCount(client, +1);
                        resolve(true);
                    });
                });
            }
            function disconnected(client) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("DELETE FROM status WHERE client_id=?");
                    stmt.run(client.id, async err => {
                        if (err) throw err;
                        await changeCount(client, -1);
                        resolve(true);
                    });
                });
            }
            function changeCount(client, inc) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare(`UPDATE users SET count=count+${inc} WHERE id=?`);
                    stmt.run(client.id.substr(0, 32), err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function offlineAll() {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("DELETE FROM status");
                    stmt.run(async err => {
                        if (err) throw err;
                        await clearCount();
                        resolve(true);
                    });
                });
            }
            function clearCount() {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare(`UPDATE users SET count=0`);
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
        fun: function (sys, items, opts) {
            let first = this.first();
            this.on("start", (e, payload) => {
                e.stopPropagation();
                payload.ptr = [first];
                first && first.trigger("enter", payload);
            });
        }
    },
    Factory: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            let table = {};
            function create(klass) {
                if (!table[klass]) {
                    require(`${__dirname}/parts/${klass}/index.js`);
                    let Middle = `//${klass}/Index`;
                    xp.hasComponent(Middle).map.msgscope = true;
                    table[klass] = sys.sqlite.append(Middle);
                }
                return table[klass];
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
                this.notify("to-user", [p.uid, payload]);
            });
            this.on("to-local", (e, payload) => {
                let p = payload;
                e.stopPropagation();
                this.notify("to-local", [p.link, {pid: p.pid, body: p.body}]);
            });
            return { create: create, getPartById: getPartById };
        }
    }
});

$_("proxy/login").imports({
    InputCheck: {
        fun: function (sys, items, opts) {
            var ureg = /^[A-Z0-9]{6,}$/i,
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