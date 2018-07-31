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
    Mosca: {
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
                parts.forEach(item => {
                    this.notify("to-users", {ssid: item.id, online: 0});
                });
            });
            server.on("published", async (packet, client) => {
                if (client == undefined) return;
                if (packet.topic == ID) {
                    let payload = JSON.parse(packet.payload + '');
                    let part = await items.parts.getPartByLink(client.id, payload.ssid);
                    if (!part) return;
                    xp.extend(options[part.id], payload.data);
                    items.parts.cache(part.id, payload.online, options[part.id]);
                    payload.ssid = part.id;
                    this.notify("to-users", payload);
                }
            });
            this.watch("to-local", (e, topic, msg) => {
                delete msg.ptr;
                delete msg.args;
                server.publish({topic: topic, payload: JSON.stringify(msg), qos: 1, retain: false});
            });
        }
    },
    Proxy: {
        xml: "<main id='proxy' xmlns:i='proxy'>\
                <i:Authorize id='auth'/>\
                <i:Users id='users'/>\
                <i:Areas id='areas'/>\
                <i:Links id='links'/>\
                <i:Parts id='parts'/>\
              </main>",
        opt: { port: 1885, http: { port: 8000, bundle: true, static: `${__dirname}/static` } },
        fun: function (sys, items, opts) {
            let first = sys.areas;
            let server = new mosca.Server(opts);
            server.on("ready", async () => {
                await items.users.offlineAll();
                Object.keys(items.auth).forEach(k => server[k] = items.auth[k]);
                console.log("Proxy server is up and running"); 
            });
            server.on("clientConnected", client => {
                items.users.update(client.id, 1);
            });
            server.on("clientDisconnected", client => {
                items.users.update(client.id, 0);
            });
            server.on("subscribed", (topic, client) => {
                let body = {user: client.id};
                first.trigger("enter", {ssid: topic, topic: "/areas/select", body: body, ptr:[first]});
            });
            server.on("published", async (packet, client) => {
                if (client == undefined) return;
                let payload = JSON.parse(packet.payload + '');
                if (packet.topic == ID) {
                    payload.ptr = [first];
                    first.trigger("enter", payload, false);
                } else {
                    let part = await items.parts.getPartById(packet.topic);
                    this.notify("to-local", [part.link, {ssid: part.part, body: payload}]);
                }
            });
            this.on("publish", (e, payload) => {
                delete payload.ptr;
                let topic = payload.ssid;
                payload.ssid = ID;
                publish(topic, payload);
            });
            this.watch("to-users", async (e, payload, linkId) => {
                let users = await items.users.getUsersByPart(payload.ssid);
                users.forEach(user => publish(user.name, payload));
            });
            function publish(topic, payload) {
                payload = JSON.stringify(payload);
                server.publish({topic: topic, payload: payload, qos: 1, retain: false});
            }
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
              </main>",
        fun: function (sys, items, opts) {
            async function authenticate(client, user, pass, callback) {
                callback(null, await items.login(user, pass + ''));
            }
            async function authorizeSubscribe(client, topic, callback) {
                callback(null, await items.users.canSubscribe(client.id, topic));
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
            var cryptoJS = require("crypto-js");
            function checkName(name, pass) {
                return new Promise((resolve, reject) => {
                    let userId = cryptoJS.MD5(name).toString();
                    let stmt = `SELECT * FROM users WHERE id="${userId}" AND name="${name}" AND online=0`;
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
            function canSubscribe(clientId, name) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM users WHERE id='${clientId}' AND online = 1 AND name='${name}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(!!data.length);
                    });
                });
            }
            function getUsersByPart(partId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT users.name FROM users,areas,authorizations,parts WHERE parts.id='${partId}' AND authorizations.link = parts.link AND authorizations.area = areas.id AND areas.user = users.id`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
            function update(userId, online) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE users SET online=? WHERE id=?");
                    stmt.run(online, userId, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function offlineAll() {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE users SET online=?");
                    stmt.run(0, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            return { canSubscribe: canSubscribe, getUsersByPart: getUsersByPart, update: update, offlineAll: offlineAll };
        }
    },
    Areas: {
        xml: "<i:Flow xmlns:i='areas'>\
                <i:Router id='router' url='/areas/:action'/>\
                <i:Select id='select'/>\
              </i:Flow>"
    },
    Links: {
        xml: "<i:Flow xmlns:i='areas'>\
                <i:Router id='router' url='/links/:action'/>\
                <Select id='select' xmlns='links'/>\
              </i:Flow>"
    },
    Parts: {
        xml: "<i:Flow xmlns:i='areas'>\
                <i:Router id='router' url='/parts/:action'/>\
                <Select id='select' xmlns='parts'/>\
                <Sqlite id='sqlite' xmlns='/sqlite'/>\
              </i:Flow>",
        fun: function (sys, items, opts) {
            function getPartById(partId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM parts WHERE id = '${partId}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data[0]);
                    });
                });
            }
            return { getPartById: getPartById };
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

$_("proxy/areas").imports({
    Flow: {
        xml: "<main id='flow'/>",
        fun: function (sys, items, opts) {
            let first = this.first(),
                table = this.find("./*[@id]").hash();
            this.on("enter", (e, d, next) => {
                d.ptr.unshift(first);
                first.trigger("enter", d, false);
            });
            this.on("next", (e, d, next) => {
                if ( e.target == sys.flow ) return;
                e.stopPropagation();
                if ( next == null ) {
                    d.ptr[0] = d.ptr[0].next();
                    d.ptr[0] ? d.ptr[0].trigger("enter", d, false) : this.trigger("reject", [d, next]);
                } else if ( table[next] ) {
                    (d.ptr[0] = table[next]).trigger("enter", d, false);
                } else {
                    this.trigger("reject", [d, next]);
                }
            });
            this.on("reject", (e, d, next) => {
                d.ptr.shift();
                e.stopPropagation();
                this.trigger("next", [d, next]);
            });
        }
    },
    Router: {
        xml: "<ParseURL id='router'/>",
        opt: { url: "/*" },
        map: { attrs: {"router": "url"} },
        fun: function (sys, items, opts) {
            this.on("enter", (e, d) => {
                d.args = items.router(d.topic);
                if ( d.args == false )
                    return this.trigger("reject", d);
                this.trigger("next", d);
            });
        }
    },
    ParseURL: {
        fun: function (sys, items, opts) {
            let pathRegexp = require("path-to-regexp"),
                regexp = pathRegexp(opts.url || "/", opts.keys = [], {});
            function decode(val) {
                if ( typeof val !== "string" || val.length === 0 ) return val;
                try {
                    val = decodeURIComponent(val);
                } catch(e) {}
                return val;
            }
            return path => {
                let res = regexp.exec(path);
                if (!res) return false;
                let params = {};
                for (let i = 1; i < res.length; i++) {
                    let key = opts.keys[i - 1], val = decode(res[i]);
                    if (val !== undefined || !(hasOwnProperty.call(params, key.name)))
                        params[key.name] = val;
                }
                return params;
            };
        }
    },
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, payload) => {
                items.sqlite.all(`SELECT * FROM areas WHERE user='${payload.body.user}'`, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
                    this.trigger("publish", payload);
                });
            });
        }
    }
});

$_("proxy/links").imports({
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, payload) => {
                items.sqlite.all(`SELECT links.* FROM links,authorizations WHERE authorizations.area='${payload.body.area}' AND authorizations.link = links.id`, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
                    this.trigger("publish", payload);
                });
            });
        }
    }
});

$_("proxy/parts").imports({
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, payload) => {
                let stmt = `SELECT * FROM parts WHERE link='${payload.body.link}'`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    data.forEach(item => {
                        item.ssid = item.id;
                        delete item.id;
                        item.data = JSON.parse(item.data);
                    });
                    payload.data = data;
                    this.trigger("publish", payload);
                });
            });
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
    },
    Prepare: {
        fun: function (sys, items, opts) {
            return stmt => {
                let args = [].slice.call(arguments).slice(1);
                args.forEach(item => {
                    stmt = stmt.replace("?", typeof item == "string" ? '"' + item + '"' : item);
                });
                return stmt;
            };
        }
    }
});

}).startup("//miot/Index");