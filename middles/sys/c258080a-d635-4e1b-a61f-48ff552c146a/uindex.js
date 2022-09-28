/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const fs = require("fs");
const xmlplus = require("xmlplus");
const { Worker } = require('worker_threads');

xmlplus("c258080a-d635-4e1b-a61f-48ff552c146a", (xp, $_) => { // 视图管理

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Select id='select'/>\
                <Signup id='signup'/>\
                <Remove id='remove'/>\
                <Update id='update'/>\
				<ViewMiddle id='viewMiddle'/>\
				<PartMiddle id='partMiddle'/>\
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
        xml: "<Flow id='signup' xmlns:i='signup'>\
                <i:Validate/>\
                <i:Signup/>\
              </Flow>",
        fun: function (sys, items, opts) {
            this.watch("/views/signup", items.signup.start);
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
        xml: "<Flow id='update' xmlns:i='update'>\
                <i:Validate/>\
                <i:Update/>\
              </Flow>",
        fun: function (sys, items, opts) {
            this.watch("/views/update", items.update.start);
        }
    },
    Flow: {
        fun: function (sys, items, opts) {
            var ptr, first = this.first();
            this.on("next", (e, p) => {
                e.stopPropagation();
                ptr = ptr.next();
                ptr.trigger("exec", p);
            });
            function start(e, p) {
                ptr = first;
                ptr.trigger("exec", p);
            }
            this.on("exec", e => e.stopPropagation());
            return { start: start };
        }
    }
});

$_().imports({
	ViewMiddle: {
		xml: "<Common id='middle' xmlns='//miot'/>",
		fun: async function (sys, items, opts) {
			let table = {};
			let cdir = `${__dirname}/../../user`;
			let mids = fs.readdirSync(cdir);
			for (let mid of mids)
				if (await items.middle.exists(`${cdir}/${mid}/uindex.js`))
					table[mid] = sys.middle.append("Worker", {mid: mid, type: "uindex"}).val();
			this.watch("uindex", (e, mid, p) => {
				table[mid] ? table[mid].notify(p) : this.trigger("to-local", p);
			});
		}
	},
	PartMiddle: {
		xml: "<Common id='middle' xmlns='//miot'/>",
		fun: async function (sys, items, opts) {
			let table = {};
			let cdir = `${__dirname}/../../user`;
			let mids = fs.readdirSync(cdir);
			for (let mid of mids)
				if (await items.middle.exists(`${cdir}/${mid}/pindex.js`))
					table[mid] = sys.middle.append("Worder", {mid: mid, type: "pindex"}).val();
			this.watch("pindex", (e, mid, p) => {
				table[mid] ? table[mid].notify(p) : this.trigger("to-users", p);
			});
		}
	},
	Worker: {
		xml: "<main id='common'>\
		        <Logger id='logger' xmlns='//miot'/>\
		      </main>",
		fun: function (sys, items, opts) {
			let worker = null;
			let file = `${__dirname}/../../relay.js`;
			let middle = `${__dirname}/../../user/${opts.mid}/${opts.type}.js`;
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
					setTimeout(()=> makeWorker(), 10*1000);
				});
			}())
			function notify(payload) {
				worker && worker.postMessage(payload);
			}
			return { notify: notify };
		}
	}
});

$_("signup").imports({
    Validate: {
        fun: function ( sys, items, opts ) {
            this.on("exec", (e, p) => {
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
            this.on("exec", (e, p) => {
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
            this.on("exec", (e, p) => {
                let update = "UPDATE views SET name=?, desc=? WHERE id=?";
                let stmt = items.update.prepare(update);
                stmt.run(p.body.name,p.body.desc,p.body.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-users", p);
                });
            });
        }
    }
});

});