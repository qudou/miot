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

$("signin").imports({
    Validate: {
        xml: "<main id='top' xmlns:s='/sqlite'>\
                <s:Sqlite id='sqlite'/>\
                <Crypto id='crypto'/>\
                <InputCheck id='check'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            this.on("enter", function( e, o ) {
                e.stopPropagation();
                if ( !items.check("u", o.body.name) || !items.check("p", o.body.pass) ) {
                    o.data = {code: -1, desc: "用户名或密码有误"};
                    return this.trigger("reply", [o, -1]);
                }
                checkName(o);
            });
            function checkName( o ) {
                var stmt = "SELECT * FROM users WHERE name='" + o.body.name + "' limit 1";
                items.sqlite.all(stmt, function(err, rows) {
                    if ( err ) { throw err; }
                    if ( rows.length )
                        return checkPass(o, rows[0]);
                    o.data = {code: -1, desc: "用户不存在"};
                    sys.top.trigger("reply", [o, -1]);
                });
            }
            function checkPass( o, record ) {
                var pass = items.crypto.encrypt(o.body.pass, record.salt);
                if ( pass == record.pass ) {
                    o.user = record.id;
                    o.data = {code: 0, desc: "登录成功"};
                    sys.top.trigger("next", o);
                } else {
                    o.data = {code: -1, desc: "密码有误"};
                    sys.top.trigger("reply", [o, -1]);
                }
            }
        }
    },
    Signin: {
        xml: "<main xmlns:i='//xmlweb/session'>\
                <i:Cookie id='cookie'/>\
                <i:Session id='session'/>\
              </main>",
        fun: function ( sys, items, opts ) {
            var table = {};
            this.on("enter", function( e, o ) {
                items.session.destroy(table[o.user]);
                table[o.user] = items.session.generate(o.user);
                o.res.setHeader("Set-Cookie", [items.cookie.serialize("ssid", table[o.user])]);
                o.data = {code: 0, desc: "登录成功"};
                this.trigger("reply", o);
            });
        }
    },
    InputCheck: {
        fun: function ( sys, items, opts ) {
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
        fun: function ( sys, items, opts ) {
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

}).startup("//mqtt-iot/Index");