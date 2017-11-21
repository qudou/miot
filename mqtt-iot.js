const viewId = "00000";
const xmlplus = require("xmlplus");

xmlplus("mqtt-iot", (xp, $_, t) => {

$_().imports({
    Index: {
        xml: "<Mosca xmlns:i='mosca'>\
                <Homes id='homes'/>\
                <Rooms id='rooms'/>\
                <Parts id='parts'/>\
              </Mosca>",
        map: { share: "sqlite/Sqlite" }
    },
    Mosca: {
        xml: "<Parts id='parts' xmlns='mosca'/>",
        opt: { port: 3000, http: { port: 8000, bundle: true, static: "./static" } },
        fun: function (sys, items, opts) {
            let first = this.first(),
                table = this.find("./*[@id]").hash(),
                server = new require('mosca').Server(opts);
            this.on("next", (e, d, next) => {
                d.ptr[0] = table[next] || d.ptr[0].next();
                d.ptr[0] ? d.ptr[0].trigger("enter", d, false) : this.trigger("reject", d);
            });
            this.on("reply", (e, d) => {
                let topic = d.ssid;
                delete d.ptr; delete d.ssid;
                server.publish({topic: topic, payload: JSON.stringify(d), qos: 1, retain: false});
            });
            this.on("reject", (e, d) => {
                d.code = -1;
                this.trigger("reply", d);
            });
            server.on('ready', () => {
                items.parts.updateAll(0);
                server.authenticate = (client, user, pwd, cb) => cb(null, user == "qudouo");
                console.log('Mosca server is up and running');
            });
            server.on('published', (packet, client) => {
                if ( packet.topic == "server" ) {
                    let data = JSON.parse(packet.payload + '');
                    data.ptr = [first];
                    first.trigger("enter", data, false);
                }
            });
            server.on('subscribed', (topic, client) => {
                if (topic == viewId) {
                    items.parts.update(topic, 1);
                    first.trigger("enter", {ssid: topic, topic: "/homes/select", ptr:[first]}, false);
                }
            });
            server.on('unsubscribed', (topic, client) => items.parts.update(topic, 0));
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
    },
    Parts: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            let UPDATE = "UPDATE parts SET online=? WHERE id=?";
            function update(partId, online) {
                let stmt = items.sqlite.prepare(UPDATE);
                stmt.run(online, partId, err => {
                    if (err) throw err;
                });
            }
            let UPDATE_ALL = "UPDATE parts SET online=?";
            function updateAll(online) {
                let stmt = items.sqlite.prepare(UPDATE_ALL);
                stmt.run(online, err => {
                    if (err) throw err;
                });
            }
            return { update: update, updateAll: updateAll };
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
            let SELECT = "SELECT * FROM parts WHERE room=";
            this.on("enter", (e, d) => {
                items.sqlite.all(SELECT + d.body.roomId, (err, data) => {
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

}).startup("//mqtt-iot/Index");