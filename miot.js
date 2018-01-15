const xmlplus = require("xmlplus");

xmlplus("miot", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<Mosca id='index'>\
                <Homes id='homes'/>\
                <Rooms id='rooms'/>\
                <Parts id='parts'/>\
              </Mosca>",
        map: { share: "sqlite/Sqlite" }
    },
    Mosca: {
        xml: "<main id='mosca' xmlns:i='mosca'>\
                <i:Users id='users'/>\
                <i:Links id='links'/>\
                <i:Parts id='parts'/>\
                <i:Authorize id='authorize'/>\
              </main>",
        opt: { port: 3001, http: { port: 8001, bundle: true, static: "./static" } },
        fun: function (sys, items, opts) {
            let first = this.first();
            let table = this.find("./*[@id]").hash();
            let server = new require('mosca').Server(opts);

            this.on("next", (e, d, next) => {
                d.ptr[0] = table[next] || d.ptr[0].next();
                d.ptr[0] ? d.ptr[0].trigger("enter", d, false) : this.trigger("reject", d);
            });
            this.on("reply", (e, d) => {
                let topic = d.ssid;
                delete d.ptr; d.ssid = "00000"; publish(topic, d);
            });
            this.on("reject", (e, d) => {
                d.code = -1;
                this.trigger("reply", d);
            });
            server.on("ready", async () => {
                await items.users.offlineAll(), await items.links.offlineAll(), await items.parts.offlineAll();
                server.authenticate = items.authorize.authenticate;
                server.authorizeSubscribe = items.authorize.authorizeSubscribe;
                //server.authorizePublish = items.authorize.authorizePublish;
                console.log("Mosca server is up and running"); 
            });
            server.on("published", async (packet, client) => {
                if (client == undefined || packet.topic !== "00000") return;
                let data = JSON.parse(packet.payload + '');
                if (await items.users.isLogin(client.id)) {
                    data.ptr = [first];
                    first.trigger("enter", data, false);
                } else if (await items.parts.isSubscribed(data.ssid)) {
                    let users = await items.parts.getUsersByPart(data.ssid);
                    users.forEach(user => publish(user.name, data));
                }
            });
            server.on("subscribed", async (topic, client) => {
                if (await items.users.isLogin(client.id)) {
                    first.trigger("enter", {ssid: topic, topic: "/homes/select", ptr:[first]});
                } else if (await items.parts.canSubscribe(topic)) {
                    let users = await items.parts.getUsersByPart(topic);
                    await items.parts.update(topic, 1);
                    users.forEach(user => publish(user.name, {ssid: topic, data: {online: 1}}));
                }
            });
            server.on("unsubscribed", async (topic, client) => {
                if (await items.parts.isSubscribed(topic)) {
                    let users = await items.parts.getUsersByPart(topic);
                    await items.parts.update(topic, 0);
                    users.forEach(user => publish(user.name, {ssid: topic, data: {online: 0}}));
                }
            });
            server.on("clientDisconnected", async client => {
                if (await items.users.isLogin(client.id)) {
                    await items.users.offline(client.id);
                } else if (await items.links.isLinked(client.id)) {
                    await items.links.update(client.id, 0);
                }
            });
            function publish(topic, payload) {
                server.publish({topic: topic, payload: JSON.stringify(payload), qos: 1, retain: false});
            }
        }
    },
    Homes: {
        xml: "<i:Flow xmlns:i='mosca' xmlns:h='homes'>\
                <i:Router id='router' url='/homes/:action'/>\
                <h:Select id='select'/>\
              </i:Flow>"
    },
    Rooms: {
        xml: "<i:Flow xmlns:i='mosca' xmlns:r='rooms'>\
                <i:Router id='router' url='/rooms/:action'/>\
                <r:Select id='select'/>\
              </i:Flow>"
    },
    Parts: {
        xml: "<i:Flow xmlns:i='mosca' xmlns:p='parts'>\
                <i:Router id='router' url='/parts/:action'/>\
                <p:Select id='select'/>\
              </i:Flow>"
    },
    Signup: {
        xml: "<i:Flow xmlns:i='mosca' xmlns:s='signup'>\
                <i:Router id='router' url='/signup'/>\
                <s:Validate id='validate'/>\
                <s:Register id='register'/>\
              </i:Flow>"
    }
});

$_("mosca").imports({
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
    }
});

$_("mosca").imports({
    Authorize: {
        xml: "<main id='mosca'>\
                <Login id='login'/>\
                <Users id='users'/>\
                <Links id='links'/>\
                <Parts id='parts'/>\
              </main>",
        fun: function (sys, items, opts) {
            async function authenticate(client, user, pass, callback) {
                let answer = false;
                let key = pass + '';
                if (pass != undefined) {
                    answer = await items.login(user, key);
                    answer && await items.users.online(user, client.id);
                } else {
                    answer = await items.links.canLink(client.id);
                    answer && await items.links.update(client.id, 1);
                }
                callback(null, answer);
            }
            async function authorizeSubscribe(client, topic, callback) {
                let answer = await items.users.canSubscribe(client.id, topic) || await items.parts.canSubscribe(topic);
                callback(null, answer);
            }
            async function authorizePublish(client, topic, callback) {
                // 这里要对校验合法性
                callback(null, true);
            }
            return { authenticate: authenticate, authorizeSubscribe: authorizeSubscribe, authorizePublish: authorizePublish };
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
                    let stmt = `SELECT * FROM users WHERE name="${name}" AND client='0'`;
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
            function isLogin(clientId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM users WHERE client='${clientId}' AND client <> '0'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(!!data.length);
                    });
                });
            }
            function canSubscribe(clientId, name) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM users WHERE client='${clientId}' AND client <> '0' AND name='${name}'`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(!!data.length);
                    });
                });
            }
            function online(user, clientId) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE users SET client=? WHERE name=?");
                    stmt.run(clientId, user, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function offline(clientId) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE users SET client=? WHERE client=? AND client <> '0'");
                    stmt.run('0', clientId, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function offlineAll() {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE users SET client=?");
                    stmt.run('0', err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            return { isLogin: isLogin, canSubscribe: canSubscribe, online: online, offline: offline, offlineAll: offlineAll };
        }
    },
    Links: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            function canLink(linkId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM links WHERE links.id = '${linkId}' AND links.online = 0`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(!!data.length);
                    });
                });
            }
            function isLinked(linkId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM links WHERE links.id = '${linkId}' AND links.online = 1`;
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
            return { canLink: canLink, isLinked: isLinked, update: update, offlineAll: offlineAll };
        }
    },
    Parts: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            function canSubscribe(partId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT authorizations.* FROM parts,links,authorizations WHERE authorizations.part='${partId}' AND authorizations.part=parts.id AND parts.online=0 AND parts.link=links.id AND links.online=1`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(!!data.length);
                    });
                });
            }
            function isSubscribed(partId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT authorizations.* FROM parts,links,authorizations WHERE authorizations.part='${partId}' AND authorizations.part=parts.id AND parts.online=1 AND parts.link=links.id AND links.online=1`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(!!data.length);
                    });
                });
            }
            function getUsersByPart(partId) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT users.name FROM parts,authorizations,rooms,homes,users WHERE parts.id='${partId}' AND parts.id=authorizations.part AND authorizations.room=rooms.id AND rooms.home=homes.id AND homes.user=users.id`;
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
            function update(partId, online) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE parts SET online=? WHERE id=?");
                    stmt.run(online, partId, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function offlineAll() {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare("UPDATE parts SET online=?");
                    stmt.run(0, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            return { canSubscribe: canSubscribe, isSubscribed: isSubscribed, getUsersByPart: getUsersByPart, update: update, offlineAll: offlineAll };
        }
    }
});

$_("mosca/login").imports({
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

$_("sinup").imports({
    Validate: {
        xml: "<main id='top' xmlns:h='/mosca/login' xmlns:s='/sqlite'>\
                <s:Sqlite id='sqlite'/>\
                <h:InputCheck id='check'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            this.on("enter", (e, d) => {
                e.stopPropagation();
                if ( items.check("e", d.email) && items.check("u", d.body.name) || items.check("p", d.body.pass) )
                    return checkName(d);
                this.trigger("reject", xp.extend(d, {desc: "邮箱、用户名或密码有误"}));
            });
            function checkName(d) {
                var stmt = "SELECT * FROM users WHERE name='" + d.body.name + "' limit 1";
                items.sqlite.all(stmt, (err, rows) => {
                    if ( err ) { throw err; }
                    if ( !rows.length )
                        return checkEmail(d);
                    this.trigger("reject", xp.extend(d, {desc: "用户已存在"}));
                });
            }
            function checkEmail(d) {
                var stmt = "SELECT * FROM users WHERE email='" + d.body.email + "' limit 1";
                items.sqlite.all(stmt, function(err, rows) {
                    if ( err ) { throw err; }
                    if ( !rows.length )
                        return this.trigger("next", d);
                    this.trigger("reject", xp.extend(d, {desc: "邮箱已存在"}));
                });
            }
        }
    },
    Register: {
       xml: "<main id='top' xmlns:t='/login' xmlns:i='/sqlite'>\
                <i:Sqlite id='sqlite'/>\
                <t:Crypto id='crypto'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            this.on("enter", (e, d) => {
                var salt = items.crypto.salt(),
                    pass = items.crypto.encrypt(d.body.pass, salt),
                    stmt = items.sqlite.prepare("INSERT INTO users (email,name,pass,salt) values(?, ?,?,?)");
                stmt.run(d.body.email, d.body.name, d.body.pass, salt);
                stmt.finalize(e => {
                    this.trigger("reply", xp.extend(d, {desc: "注册成功"}));
                }); 
            });
        }
    }
});

$_("homes").imports({
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            let SELECT = "SELECT * FROM homes";
            this.on("enter", (e, d) => {
                items.sqlite.all(SELECT, (err, data) => {
                    if (err) { throw err; }
                    d.data = data;
                    this.trigger("reply", d);
                });
            });
        }
    },
});

$_("rooms").imports({
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            let SELECT = "SELECT * FROM rooms WHERE home=";
            this.on("enter", (e, d) => {
                items.sqlite.all(SELECT + d.body.homeId, (err, data) => {
                    if ( err ) { throw err; }
                    d.data = data;
                    this.trigger("reply", d);
                });
            });
        }
    },
});

$_("parts").imports({
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, d) => {
                let stmt = `SELECT parts.* FROM parts,authorizations WHERE authorizations.room=${d.body.roomId} AND authorizations.part=parts.id`;
                items.sqlite.all(stmt, (err, data) => {
                    if ( err ) { throw err; }
                    d.data = data;
                    this.trigger("reply", d);
                });
            });
        }
    },
    Update: {
        xml: "<main xmlns:v='validate' xmlns:i='/sqlite'>\
                <i:Sqlite id='sqlite'/>\
                <v:Update id='validate'/>\
              </main>",
        fun: function (sys, items, opts) {
            let SELECT = "SELECT * FROM parts WHERE id=",
                UPDATE = "UPDATE parts SET name=?, room=?, class=?, online=? WHERE id=?";
            this.on("enter", async (e, d) => {
                d.body = xp.extend({}, await select(d.body.id), d.body);
                items.validate(e, d);
            });
            sys.validate.on("success", (e, r) => {
                let d = r.body,
                    stmt = items.sqlite.prepare(UPDATE);
                stmt.run(d.name, d.room, d.class, d.online, d.id, function (err) {
                    if (err) throw err;
                    r.body.code = this.changes ? 0 : -1;
                    sys.sqlite.trigger("reply", r);
                });
            });
            function select(partId) {
                return new Promise((resolve, reject) => {
                    items.sqlite.all(SELECT + partId, (err, data) => {
                        if (err) { throw err; }
                        resolve(data);
                    });
                });
            }
        }
    }
});

$_("parts/validate").imports({
    Validate: {
        fun: function (sys, items, opts) {
            function id(value) {
                return xp.isNumeric(value) && /^\d+$/.test(value + "");
            }
            function name(value) {
                return typeof value == "string" && /^[a-z_][a-z0-9_]*$/i.test(value);
            }
            return { id: id, name: name };
        }
    },
    Update: {
        xml: "<Validate id='validate'/>",
        fun: function (sys, items, opts) {
            let check = items.validate;
            return (e, d) => {
                d.code = check.id(d.body.id) && check.name(d.body.name) ? 0 : -1;
                this.trigger(d.code == 0 ? "success" : "reply", d);
            };
        }
    }
});

$_("sqlite").imports({
    Sqlite: {
        fun: function (sys, items, opts) {
            let sqlite = require("sqlite3").verbose(),
                db = new sqlite.Database("data.db");
			db.exec("VACUUM");
            db.exec("PRAGMA foreign_keys = ON");
            return db;
        }
    },
    Prepare: {
        fun: function (sys, items, opts) {
            return stmt => {
                var args = [].slice.call(arguments).slice(1);
                args.forEach(item => {
                    stmt = stmt.replace("?", typeof item == "string" ? '"' + item + '"' : item);
                });
                return stmt;
            };
        }
    }
});

}).startup("//miot/Index");