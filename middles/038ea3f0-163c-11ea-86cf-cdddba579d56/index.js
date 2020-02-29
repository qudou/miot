/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("038ea3f0-163c-11ea-86cf-cdddba579d56", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Stores id='stores'/>\
                <Orders id='orders'/>\
                <Details id='details'/>\
                <Manager id='manager'/>\
                <Schedule id='schedule'/>\
              </main>",
        map: { share: "Sqlite" }
    },
    Stores: {
        xml: "<Sqlite id='sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/stores", (e, payload) => {
                let stmt = `SELECT distinct stores.id,stores.name FROM order_list,stores
                            WHERE stores.id = order_list.store`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
                    this.trigger("to-user", payload);
                });
            });
        }
    },
    Orders: {
        xml: "<Sqlite id='sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/orders", (e, payload) => {
                let stmt = `SELECT * FROM order_list
                            WHERE store=${payload.body.sid} 
                            ORDER BY createtime DESC LIMIT 8`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
                    this.trigger("to-user", payload);
                });
            });
        }
    },
    Details: {
        xml: "<Sqlite id='sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/details", (e, payload) => {
                let stmt = `SELECT goods.*,quantity AS 数量 FROM goods,orders
                            WHERE order_id=${payload.body.oid} AND orders.good=goods.id`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
                    this.trigger("to-user", payload);
                });
            });
        }
    },
    Manager: {
        xml: "<Sqlite id='sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/type/goods", (e, payload) => {
                let stmt = `SELECT * FROM goods WHERE 分类=${payload.body.tid}`; 
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
                    this.trigger("to-user", payload);
                });
            });
            this.watch("/types", (e, payload) => {
                let stmt = "SELECT * FROM types"; 
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
                    this.trigger("to-user", payload);
                });
            });
            let insert = "INSERT INTO goods (货号,品名,单位,零售价,图片,分类) VALUES(?,?,?,?,?,?)";
            this.watch("/signup", (e, p) => {
                let stmt = items.sqlite.prepare(insert);
                let b = p.body;
                stmt.run(b.货号,b.品名,b.单位,b.零售价,b.图片,b.分类);
                stmt.finalize(() => {
                    p.data = {code: 0, desc: "添加成功"};
                    this.trigger("to-user", p);
                });
            });
            let update = "UPDATE goods SET 货号=?,品名=?,单位=?,零售价=?,图片=?,分类=? WHERE id=?";
            this.watch("/update", (e, p) => {
                let b = p.body;
                let stmt = items.sqlite.prepare(update);
                stmt.run(b.货号,b.品名,b.单位,b.零售价,b.图片,b.分类,b.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-user", p);
                });
            });
        }
    },
    Schedule: {
        xml: "<Sqlite id='sqlite'/>",
        fun: function (sys, items, opts) {
            let schedule = require("node-schedule");
            schedule.scheduleJob("30 23 * * *", async () => {
                let table = {};
                let data = await carts();
                for (let item of data) {
                    if (table[item.store] === undefined)
                        table[item.store] = await createOrderList(item.store);
                    await createOrder(table[item.store], item.good, item.quantity);
                }
                clearCarts();
            });
            function carts() {
                return new Promise(resolve => {
                    let stmt = "SELECT * FROM carts WHERE quantity>0";
                    items.sqlite.all(stmt, (err, data) => {
                        if (err) throw err;
                        resolve(data);
                    });
                });
            }
            function createOrderList(store) {
                return new Promise(resolve => {
                    let stmt = items.sqlite.prepare("INSERT INTO order_list (store) VALUES(?)");
                    stmt.run(store, function (err) {
                        if (err) throw err;
                        resolve(this.lastID);
                    });
                });
            }
            function createOrder(order_id, good, quantity) {
                return new Promise(resolve => {
                    let stmt = items.sqlite.prepare("INSERT INTO orders (order_id,good,quantity) VALUES(?,?,?)");
                    stmt.run(order_id, good, quantity, function() {
                        resolve(this.lastID);
                    });
                });
            }
            function clearCarts() {
                let update = "UPDATE carts SET quantity=0";
                let stmt = items.sqlite.prepare(update);
                stmt.run(err => {
                    if (err) throw err;
                });
            }
        }
    },
    Sqlite: {
        fun: function (sys, items, opts) {
            let sqlite = require("sqlite3").verbose(),
                str = 'af5865d0-03c8-11ea-bdae-058d110bb08e',
                db = new sqlite.Database(`${__dirname}/../${str}/data.db`);
            db.exec("VACUUM");
            db.exec("PRAGMA foreign_keys = ON");
            return db;
        }
    }
});

});