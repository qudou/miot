const xmlplus = require("xmlplus");
const viewId = "x827ex27795f";

xmlplus("mqtt-iot", (xp, $_, t) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Mosca id='mosca'/>\
                <Mongo id='mongo'/>\
              </main>",
        map: { defer: "mosca" },
        fun: function (sys, items, opts) {
            sys.mongo.on("connected", e => sys.mosca.show());
        }
    },
    Mosca: {
        xml: "<main id='mosca'/>",
        opt: { port: 3000, http: { port: 8000, bundle: true, static: "./static" } },
        fun: function (sys, items, opts) {
            let mosca = require('mosca'),
                server = new mosca.Server(opts);
            server.on('subscribed', (topic, client) => {
                update(topic, true);
                topic == viewId && this.notify("mongo", ["query", {table: 'homes'}]);
            });
            server.on('unsubscribed', (topic, client) => {
                update(topic, false);
            });
            server.on('published', (packet, client) => {
                if ( packet.topic == "server" ) {
                    let payload = JSON.parse(packet.payload.toString());
                    this.notify("mongo", [payload.topic, payload.data]);
                }
            });
            server.on('ready', () => {
                server.authenticate = (client, user, pwd, callback) => {
                    callback(null, user == "qudouo");
                };
                console.log('Mosca server is up and running');
                this.notify("mongo", ["update", {table: "parts", where: {}, data: {online: false}}]);
            });
            this.watch("publish", (e, topic, payload, sid) => {
                payload = JSON.stringify({topic: topic, data: payload, sid: sid});
                server.publish({topic: viewId, payload: payload, qos: 1, retain: false});
            });
            function update(clientId, online) {
                let object = {table: "parts", where: {_id: clientId}, data: {online: online}};
                sys.mosca.notify("mongo", ["update", object]);
                sys.mosca.notify("publish", ["update", object.data, clientId]);
            }
        }
    },
    Mongo: {
        xml: "<main id='mongo' xmlns:i='mongo'>\
                <i:Homes id='homes'/>\
                <i:Rooms id='rooms'/>\
                <i:Parts id='parts'/>\
              </main>",
        map: { share: "mongo/Mongoose" },
        fun: function (sys, items, opts) {
            function update (table, where, data) {
                return new Promise((resolve, reject) => {
                    items[table].update(where, data, {multi: true}, (err, res) => {
                        if (err) throw err;
                        resolve(res);
                    });
                });
            }
            function query (table, where = {}) {
                return new Promise((resolve, reject) => {
                    items[table].find(where, (err, res) => {
                        if (err) throw err;
                        resolve(res);
                    });
                });
            }
            this.watch("mongo", async (e, topic, d) => {
                let payload;
                switch (topic) {
                    case "query":
                        d.data = await query(d.table, d.where);
                        this.notify("publish", ["list-" + d.table, d]);
                        break;
                    case "update":
                        payload = await update(d.table, d.where, d.data);
                        break;
                    default:;
                }
            });
        }
    }
});

$_("mongo").imports({
    Mongoose: {
        fun: function (sys, items, opts) {
            var mongoose = require('mongoose'),
                DB_URL = 'mongodb://localhost:27017/mosca';
            mongoose.connect(DB_URL,{useMongoClient: true});
            mongoose.connection.on('connected', () => {
                this.trigger("connected");
                console.log('Mongoose connection open to ' + DB_URL);  
            });
            mongoose.connection.on('error', err => {    
                console.log('Mongoose connection error: ' + err);  
            });
            mongoose.connection.on('disconnected', () => {    
                console.log('Mongoose connection disconnected');  
            });    
            return mongoose;
        }
    },
    Homes: {
        xml: "<Mongoose id='mongoose'/>",
        fun: function (sys, items, opts) {
            let Schema = items.mongoose.Schema;
            const ObjectId = Schema.Types.ObjectId;
            let HomeSchema = new Schema({
                _id : { type: ObjectId },
                name: {type: String}                   
            });
            return items.mongoose.model('Home',HomeSchema);
        }
    },
    Rooms: {
        xml: "<Mongoose id='mongoose'/>",
        fun: function (sys, items, opts) {
            let Schema = items.mongoose.Schema;
            const ObjectId = Schema.Types.ObjectId;
            let RoomSchema = new Schema({
                _id : { type: ObjectId },
                name: {type: String}                   
            });
            return items.mongoose.model('Room',RoomSchema);
        }
    },
    Parts: {
        xml: "<Mongoose id='mongoose'/>",
        fun: function (sys, items, opts) {
            let Schema = items.mongoose.Schema;
            const ObjectId = Schema.Types.ObjectId;
            let PartSchema = new Schema({
                _id : { type: ObjectId },
                name: {type: String},
                'class': {type: String},
                room: {type: String},
                online: {type: Boolean}                     
            });
            return items.mongoose.model('Part',PartSchema);
        }
    }
});

$("homes").imports({
    Mapping: {
        fun: function ( sys, items, opts ) {
            this.on("enter", function( e, o ) {
                e.target.trigger("next", [o, o.args.action]);
            });
        }
    },
    Select: {
        xml: "<i:Sqlite id='sqlite' xmlns:i='/sqlite'/>",
        fun: function ( sys, items, opts ) {
            var select = "SELECT * FROM project WHERE user=";
            this.on("enter", function( e, r ) {
                items.sqlite.all(select + r.user, function(err, data) {
                    if ( err ) { throw err; }
                    r.data = data;
                    sys.sqlite.trigger("reply", r);
                });
            });
        }
    },
    Insert: {
        xml: "<main id='top' xmlns:v='validate' xmlns:i='/sqlite'>\
                <i:Sqlite id='sqlite'/>\
                <v:Insert id='validate'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            var fs = require("fs"),
                project = "INSERT INTO project(user,name) VALUES(?,?)",
                namespace = "INSERT INTO namespace(name,parent,project) VALUES(?,-1,?)";
            function mkdir( r ) {
                var folder = "static/res/" + r.rowid;
                fs.mkdir(folder, function ( err ) {
                    if ( err ) throw err;
                    r.data = { rowid: r.rowid };
                    sys.top.trigger("reply", r);
                })
            }
            sys.validate.on("success", function ( e, r ) {
                var stmt = items.sqlite.prepare(project);
                stmt.run(r.user, r.body.name, function( err ) {
                    if ( err ) throw err;
                    r.rowid = this.lastID;
                    stmt = items.sqlite.prepare(namespace);
                    stmt.run(r.body.name, this.lastID, function( err ) {
                        if ( err ) throw err;
                        mkdir(r);
                    });
                });
            });
            this.on("enter", items.validate);
        }
    },
    Delete: {
        xml: "<main id='top' xmlns:v='validate' xmlns:i='/sqlite'>\
                <i:Sqlite id='sqlite'/>\
                <v:Delete id='validate'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            var rimraf = require("rimraf"),
                remove = "DELETE FROM project WHERE id=? AND user=?";
            function rmdir( r ) {
                var folder = "static/res/" + r.body.id;
                rimraf(folder, function ( err ) {
                    if ( err ) throw err;
                    sys.top.trigger("reply", r);
                });
            }
            sys.validate.on("success", function( e, r ) {
                var stmt = items.sqlite.prepare(remove);
                stmt.run(r.body.id, r.user, function ( err ) {
                    if ( err ) throw err;
                    this.changes ? rmdir(r) : sys.top.trigger("reply", [r, -1]);
                });
            });
            this.on("enter", items.validate);
        } 
    },
    Update: {
        xml: "<main xmlns:v='validate' xmlns:i='/sqlite'>\
                <i:Sqlite id='sqlite'/>\
                <v:Update id='validate'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            var update = "UPDATE project SET name=?, env=?, theme=? WHERE id=? AND user=?";
            sys.validate.on("success", function( e, r ) {
                var stmt = items.sqlite.prepare(update);
                stmt.run(r.body.name, r.body.env, r.body.theme, r.body.id, r.user, function( err ) {
                    if ( err ) throw err;
                    this.changes ? next(r) : sys.sqlite.trigger("reply", [r, -1]);
                });
            });
            var namespace = "UPDATE namespace SET name=? WHERE parent=-1 AND project=?";
            function next( r ) {
                var stmt = items.sqlite.prepare(namespace);
                stmt.run(r.body.name, r.body.id, function ( err ) {
                    if ( err ) throw err;
                    sys.sqlite.trigger("reply", r);
                });
            }
            this.on("enter", items.validate);
        }
    }
});

});

xmlplus("mqtt-iot", (xp, $_, t) => {

$_().imports({
    Index: {
        xml: "<Mosca xmlns:i='mosca'>\
                <Homes id='homes'/>\
                <Rooms id='rooms'/>\
                <Parts id='parts'/>\
              </Mosca>"
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
                d.ptr[0] ? d.ptr[0].trigger("enter", d, 0) : this.trigger("reject", d);
            });
            this.on("reply", (e, d) => {
                delete d.ptr;
                server.publish({topic: d.ssid, payload: d, qos: 1, retain: 0});
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
                    first.trigger("enter", data, 0);
                }
            });
            server.on('subscribed', (topic, client) => {
                if (topic == viewId) {
                    items.parts.update(topic, 1);
                    first.trigger("enter", {ssid: topic, topic: "/homes/select", ptr:[first]}, 0);
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

$("mosca").imports({
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
            this.on("enter", async (e, d) => {
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
                let stmt = items.sqlite.prepare(update);
                stmt.run(d.online, d.id, err => {
                    if ( err ) throw err;
                });
            });
            let UPDATE_ALL = "UPDATE parts SET online=?";
            function updateAll(online) {
                let stmt = items.sqlite.prepare(updateAll);
                stmt.run(d.online, err => {
                    if ( err ) throw err;
                });
            });
            return { update: update, updateAll: updateAll };
        }
    }
});

$("homes").imports({
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='/sqlite'/>",
        fun: function (sys, items, opts) {
            let SELECT = "SELECT * FROM homes";
            this.on("enter", (e, r) => {
                items.sqlite.all(SELECT, (err, data) => {
                    if (err) { throw err; }
                    r.data = data;
                    sys.sqlite.trigger("reply", r);
                });
            });
        }
    },
});

$("rooms").imports({
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

$("parts").imports({
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
            this.on("enter" async (e, d) => {
                d.body = xp.extend({}, await select(d.body.id), d.body);
                items.validate(e, d);
            });
            sys.validate.on("success", (e, r) => {
                let d = r.body,
                    stmt = items.sqlite.prepare(UPDATE);
                stmt.run(d.name, d.room, d.class, d.online, d.id, function (err) {
                    if ( err ) throw err;
                    r.body.code = this.changes ? 0 : 1;
                    sys.sqlite.trigger("reply", r);
                });
            });
            function select(partId) {
                return new Promise((resolve, reject) => {
                    items.sqlite.all(SELECT + partId, (err, data) => {
                        if ( err ) { throw err; }
                        resolve(data);
                    });
                });
            }
        }
    }
});

$("parts/validate").imports({
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

$("sqlite").imports({
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