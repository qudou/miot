/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const fs = require("fs");
const xmlplus = require("xmlplus");
const { Worker } = require('worker_threads');

xmlplus("c258080a-d635-4e1b-a61f-48ff552c146a", (xp, $_) => { // 服务管理

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Select id='select'/>\
                <Signup id='signup'/>\
                <Remove id='remove'/>\
                <Update id='update'/>\
                <Service id='service'/>\
              </main>"
    },
    Select: {
        xml: "<Sqlite id='select' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/views/select", (e, p) => {
                let stmt = `SELECT * FROM views WHERE type<>0`;
                items.select.all(stmt, (err, data) => {
                    if (err) throw err;
                    p.data = data;
                    this.trigger("to-users", p);
                });
            });
        }
    },
    Signup: {
        xml: "<Falls id='signup' xmlns:i='signup'>\
                <i:Validate id='validate'/>\
                <i:Signup id='signup'/>\
              </Falls>",
        fun: function (sys, items, opts) {
            this.watch("/views/signup", (e, p) => sys.validate.trigger("validate", p));
        }
    },
    Remove: {
        xml: "<Sqlite id='remove' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.watch("/views/remove", (e, p) => {
                let remove = "DELETE FROM views WHERE id=?";
                let stmt = items.remove.prepare(remove);
                stmt.run(p.body.id, function (err) {
                    if (err) throw err;
                    p.data = this.changes ? {code: 0, desc: "删除成功"} : {code: -1, desc: "删除失败"};
                    sys.remove.trigger("to-users", p);
                });
            });
        }
    },
    Update: {
        xml: "<Falls id='update' xmlns:i='update'>\
                <i:Validate id='validate'/>\
                <i:Update id='update'/>\
              </Falls>",
        fun: function (sys, items, opts) {
            this.watch("/views/update", (e, p) => sys.validate.trigger("validate", p));
        }
    },
	Service: {
        xml: "<main xmlns:i='service'>\
                <i:ViewMiddle id='viewMiddle'/>\
                <i:PartMiddle id='partMiddle'/>\
              </main>"
	},
    Falls: {
        fun: function (sys, items, opts) {
            let kids = this.kids();
            for (i = kids.length-2; i >= 0; i--)
                kids[i+1].append(kids[i]);
        }
    }
});

$_("service").imports({
    ViewMiddle: {
        xml: "<Common id='middle' xmlns='//miot'/>",
        fun: async function (sys, items, opts) {
            let table = {};
            let cdir = `${__dirname}/../../usr`;
            let mids = fs.readdirSync(cdir);
            for (let mid of mids)
                if (await items.middle.exists(`${cdir}/${mid}/uindex.js`))
                    table[mid] = sys.middle.append("Worker", {mid: mid, type: "uindex"}).val();
			let topic = "to-local";
            this.watch("uindex", (e, mid, p) => {
                table[mid] ? table[mid].notify({topic: topic, payload: p}) : this.trigger(topic, p);
            });
			this.watch("/views/reboot", async (e, p) => {
				let mid = p.body;
				if (!table[mid])
					if (await items.middle.exists(`${cdir}/${mid}/uindex.js`))
						table[mid] = sys.middle.append("Worder", {mid: mid, type: "uindex"}).val();
				table[mid] && table[mid].terminate();
			});
        }
    },
    PartMiddle: {
        xml: "<Common id='middle' xmlns='//miot'/>",
        fun: async function (sys, items, opts) {
            let table = {};
            let cdir = `${__dirname}/../../usr`;
            let mids = fs.readdirSync(cdir);
            for (let mid of mids)
                if (await items.middle.exists(`${cdir}/${mid}/pindex.js`))
                    table[mid] = sys.middle.append("Worder", {mid: mid, type: "pindex"}).val();
			let topic = "to-users";
            this.watch("pindex", (e, mid, p) => {
                table[mid] ? table[mid].notify({topic: topic, payload: p}) : this.trigger(topic, p);
            });
			this.watch("/views/reboot", async (e, p) => {
				let mid = p.body;
				if (!table[mid])
					if (await items.middle.exists(`${cdir}/${mid}/pindex.js`))
						table[mid] = sys.middle.append("Worder", {mid: mid, type: "pindex"}).val();
				table[mid] && table[mid].terminate();
			});
        }
    },
    Worker: {
        xml: "<main id='common'>\
                <Logger id='logger' xmlns='//miot'/>\
              </main>",
        fun: function (sys, items, opts) {
            let worker = null;
            let file = `${__dirname}/relay.js`;
            let middle = `${__dirname}/../../usr/${opts.mid}/${opts.type}.js`;
            (function makeWorker() {
                worker = new Worker(file, {workerData: middle});
                worker.on('message', msg => {
                    sys.common.trigger(msg.topic, msg.payload);
                });
                worker.on('error', (error) => {
                    worker = null;
                    items.logger.error(error);
                });
                worker.on('exit', (code) => {
                    worker = null;
                    items.logger.info(`middle ${opts.mid}/${opts.type} finished with exit code ${code}`);
                    setTimeout(()=> makeWorker(), 5000);
                });
            }());
            function notify(payload) {
                worker && worker.postMessage(payload);
            }
            function terminate() {
                worker && worker.terminate();
            }
            return { notify: notify, terminate: terminate };
        }
    }
});

$_("signup").imports({
    Validate: {
        fun: function ( sys, items, opts ) {
            this.on("validate", (e, p) => {
                e.stopPropagation();
                if (p.body.name.length > 1)
                    return this.trigger("next", p);
                p.data = {code: -1, desc: "视图名称至少2个字符"};
                this.trigger("to-users", p);
            });
        }
    },
    Signup: {
       xml: "<Sqlite id='signup' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.on("next", (e, p) => {
                e.stopPropagation();
                let stmt = items.signup.prepare("INSERT INTO views (id,name,desc) VALUES(?,?,?)");
                let id = require("uuid/v1")();
                stmt.run(id, p.body.name, p.body.desc);
                stmt.finalize(() => {
                    p.data = {code: 0, desc: "注册成功"};
                    sys.signup.trigger("to-users", p);
                }); 
            });
        }
    }
});

$_("update").imports({
    Validate: {
        map: {extend: {"from": "../signup/Validate"}}
    },
    Update: {
        xml: "<Sqlite id='update' xmlns='//miot'/>",
        fun: function (sys, items, opts) {
            this.on("next", (e, p) => {
                e.stopPropagation();
                let update = "UPDATE views SET id=?, name=?, desc=? WHERE id=?";
                let stmt = items.update.prepare(update);
                stmt.run(p.body.new_id, p.body.name,p.body.desc,p.body.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-users", p);
                });
            });
        }
    }
});

});