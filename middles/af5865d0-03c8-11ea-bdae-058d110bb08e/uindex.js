/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */
const xmlplus = require("xmlplus");
const child_process = require('child_process');

let table = {13: "荣兴", 14: "总部", 15: "铜锣湾", 16: "迎宾街", 17: "钻石园", 21: "三生天海", 22: "财经中心"};

xmlplus("af5865d0-03c8-11ea-bdae-058d110bb08e", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <List id='List'/>\
                <Require id='require'/>\
                <Input id='input'/>\
                <Allocate id='allocate'/>\
                <Purchase id='purchase'/>\
                <Stock id='stock'/>\
                <Insert id='insert'/>\
                <Editor id='editor'/>\
              </main>",
        map: { share: "Sqlite" },
        fun: function (sys, items, opts) {
            this.watch("/store/change", (e, p) => {
                p.data = {id: p.uid, desc: table[p.uid]};
                this.trigger("to-user", p);
            });
        }
    },
    List: {      // 获取商品列表
        xml: "<Sqlite id='list'/>",
        fun: function (sys, items, opts) {
            this.watch("/list", (e, p) => {
                let b = p.body;
                let store = b.store;
                let where = createWhere(store, b.where);
                let stmt1 = `SELECT ${store}.*,条码,品名,进货价,零售价,分类,系数,图片,round(("零售价" - "进货价" + 0.0)/"零售价", 3) * 100 AS "毛利率", '#' AS 可用量 FROM ${store}, 商品资料 WHERE ${where} AND ${store}.货号 = 商品资料.货号 ORDER BY ${b.orderby} ${b.sort}`;
                let stmt2 = `SELECT ${store}.*,条码,品名,进货价,零售价,分类,系数,图片,round(("零售价" - "进货价" + 0.0)/"零售价", 3) * 100 AS "毛利率", 迎宾街.库存量 AS 可用量 FROM ${store}, 迎宾街, 商品资料 WHERE ${where} AND ${store}.货号 = 商品资料.货号 AND 商品资料.货号 = 迎宾街.货号 ORDER BY ${b.orderby} ${b.sort}`;
                let stmt = (store == "迎宾街") ? stmt1 : (b.where.supplier == "31043" ? stmt2 : stmt1);
                items.list.all(stmt, (err, rows) => {
                    if (err) throw err;
                    p.data = rows;
                    this.trigger("to-user", p);
                });
            });
            function createWhere(store, o) {
                let where = [];
                o.req && where.push(`${store}.需求量>0`);
                o.stock && where.push(`${store}.库存量>0`);
                o.like && where.push(`${store}.是否收藏=1`);
                o.type && where.push(`分类=${o.type}`);
                o.supplier && where.push(`${store}.供应商='${o.supplier}'`);
                return (where.length ? where : ["1=1"]).join(" AND ");
            }
        }
    },
    Input: {     // 输入更新，含需求量，低位库存，高位库存，以及是否收藏
        xml: "<Sqlite id='db'/>",
        fun: function (sys, items, opts) {
            this.watch("/input", (e, p) => {
                let b = p.body;
                let stmt = items.db.prepare(`UPDATE ${b.store} SET ${b.desc}=? WHERE 货号=?`);
                stmt.run(b.num, b.code, err => {
                    if (err) throw err;
                    this.trigger("to-user", p);
                });
            });
        }
    },
    Require: {   // 需求量生成
        xml: "<Sqlite id='db'/>",
        fun: function (sys, items, opts) {
            this.watch("/require", async (e, p) => {
                let store = p.body.store;
                let result = await read(store, p.body.type);
                await clear(store);
                for (let i = 0; i < result.length; i++) {
                    let v = result[i];
                    let b = v["库存量"] <= v["库存低位"];
                    let s = b ? (v["库存高位"] - v["库存量"]) : 0;
                    if (s == 0) continue;
                    await update(store, s, v["货号"]);
                }
                this.trigger("to-user", p);
            });
            function read(Name, type) {
                return new Promise(resolve => {
                    let stmt1 = `SELECT ${Name}.*,系数 FROM ${Name},商品资料 WHERE ${Name}.货号 = 商品资料.货号 AND ${Name}.是否收藏 = 1`;
                    let stmt2 = `SELECT ${Name}.*,系数, 品名 FROM ${Name},迎宾街,商品资料 WHERE ${Name}.货号 = 商品资料.货号 AND ${Name}.是否收藏 = 1 AND ${Name}.货号 = 迎宾街.货号`; // AND 迎宾街.库存量 > 0
                    let stmt = (type == "采购") ? stmt1 : stmt2; // 调拨
                    items.db.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows);
                    });
                });
            }
            function clear(store) {
                return new Promise(resolve => {
                    let stmt = items.db.prepare(`UPDATE ${store} SET 需求量=0`);
                    stmt.run(err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
            function update(store, num, code) {
                return new Promise(resolve => {
                    let stmt = items.db.prepare(`UPDATE ${store} SET 需求量=? WHERE 货号=?`);
                    stmt.run(num, code, err => {
                        if (err) throw err;
                        resolve(true);
                    });
                });
            }
        }
    },
    Allocate: {  // 调拨单生成
        xml: "<main id='allocate'/>",
        fun: function (sys, items, opts) {
            this.watch("/allocate", async (e, p) => {
                var spawnObj = child_process.spawn("node", [`${__dirname}/生成调拨单.js`,`${p.body.store}`], {encoding: 'utf-8'});
                spawnObj.stdout.on('data', function(chunk) {
                    //console.log(chunk.toString());
                    p.data = {message: chunk.toString()};
                    sys.allocate.trigger("to-user", p);
                });
                spawnObj.stderr.on('data', (data) => {
                  console.log(data.toString());
                });
                spawnObj.on('close', function(code) {
                    console.log('close code : ' + code);
                });
                spawnObj.on('exit', (code) => {
                    p.data = {message: "finish"};
                    sys.allocate.trigger("to-user", p);
                    console.log('exit code : ' + code);
                });
            });
        }
    },
    Purchase: {  // 采购单生成
        xml: "<main id='purchase'/>",
        fun: function (sys, items, opts) {
            this.watch("/purchase", async (e, p) => {
                var spawnObj = child_process.spawn("node", [`${__dirname}/生成采购单.js`,`${p.body.store}`, `${p.body.supplier}`], {encoding: 'utf-8'});
                spawnObj.stdout.on('data', function(chunk) {
                    console.log(chunk.toString());
                    p.data = {message: chunk.toString()};
                    sys.purchase.trigger("to-user", p);
                });
                spawnObj.stderr.on('data', (data) => {
                    console.log(data.toString());
                });
                spawnObj.on('close', function(code) {
                    //console.log('close code : ' + code);
                });
                spawnObj.on('exit', (code) => {
                    p.data = {message: "finish"};
                    sys.purchase.trigger("to-user", p);
                    //console.log('exit code : ' + code);
                });
            });
        }
    },
    Stock: {     // 库存量更新
        xml: "<main id='stock'/>",
        fun: function (sys, items, opts) {
            this.watch("/stock", async (e, p) => {
                var spawnObj = child_process.spawn("node", [`${__dirname}/库存量更新.js`,`${p.body.store}`], {encoding: 'utf-8'});
                spawnObj.stdout.on('data', function(chunk) {
                    p.data = {message: chunk.toString()};
                    sys.stock.trigger("to-user", p);
                });
                spawnObj.stderr.on('data', (data) => {
                    console.log(data.toString());
                });
                spawnObj.on('close', function(code) {
                    console.log('close code : ' + code);
                });
                spawnObj.on('exit', (code) => {
                    p.data = {message: "finish"};
                    sys.stock.trigger("to-user", p);
                    console.log('exit code : ' + code);
                });
            });
        }
    },
    Insert: {    // 商品新增
        xml: "<Sqlite id='db'/>",
        fun: function (sys, items, opts) {
            this.watch("/insert", async (e, p) => {
                await insertBase(p.body);
                await insertStore(p.body, "仓库");
                await insertStore(p.body, "迎宾街");
                await insertStore(p.body, "总部");
                await insertStore(p.body, "铜锣湾");
                await insertStore(p.body, "三生天海");
                await insertStore(p.body, "钻石园");
                await insertStore(p.body, "财经中心");
                await insertStore(p.body, "荣兴");
                this.trigger("to-user", p);
            });
            function insertBase(o) {
                return new Promise((resolve, reject) => {
                    let stmt = items.db.prepare("INSERT INTO 商品资料 (货号,条码,系数,品名,进货价,零售价,分类,图片) VALUES(?,?,?,?,?,?,?,?)");
                    stmt.run(o.货号.trim(),o.条码.trim(),parseInt(o.系数),o.品名,o.进货价,o.零售价,o.分类,o.图片);
                    stmt.finalize(() => {
                        console.log("添加基础商品资料成功！");
                        resolve(true);
                    });
                });
            }
            function insertStore(o, store) {
                return new Promise((resolve, reject) => {
                    let stmt = items.db.prepare(`INSERT INTO ${store} (货号,供应商) VALUES(?,?)`);
                    stmt.run(o.货号.trim(),o.供应商);
                    stmt.finalize(() => {
                        console.log(`添加${store}商品资料成功！`);
                        resolve(true);
                    });
                });
            }
        }
    },
    Editor: {    // 商品修改
        xml: "<Sqlite id='db'/>",
        fun: function (sys, items, opts) {
            this.watch("/editor", async (e, p) => {
                await updateBase(p.body);
                await updateStore(p.body);
                this.trigger("to-user", p);
            });
            function updateBase(o) {
                return new Promise((resolve, reject) => {
                    let stmt = items.db.prepare("UPDATE 商品资料 SET 货号=?,条码=?,品名=?,系数=?,进货价=?,零售价=?,分类=?,图片=? WHERE 货号=?");
                    stmt.run(o.货号.trim(),o.条码.trim(),o.品名.trim(),parseInt(o.系数),o.进货价,o.零售价,o.分类,o.图片,o.原货号);
                    stmt.finalize(() => {
                        console.log("修改基础商品资料成功！");
                        resolve(true);
                    });
                });
            }
            function updateStore(o) {
                return new Promise((resolve, reject) => {
                    let stmt = items.db.prepare(`UPDATE ${o.store} SET 供应商=? WHERE 货号=?`);
                    stmt.run(o.供应商,o.货号);
                    stmt.finalize(() => {
                        console.log("修改门店商品资料成功！");
                        resolve(true);
                    });
                });
            }
        }
    },
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

});