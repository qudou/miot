/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("af5865d0-03c8-11ea-bdae-058d110bb08e", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Types id='types'/>\
                <TypeGoods id='typeGoods'/>\
                <QtyChange id='qtyChange'/>\
                <CartGoods id='cartGoods'/>\
                <Remove id='remove'/>\
              </main>",
        map: { share: "Sqlite" }
    },
    Types: {
        xml: "<Sqlite id='sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/types", (e, payload) => {
                let stmt = "SELECT * FROM types";
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
                    this.trigger("to-user", payload);
                });
            });
        }
    },
    TypeGoods: {
        xml: "<Sqlite id='sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/type/goods", (e, payload) => {
                let stmt = `SELECT carts.id,单位,品名,图片,货号,零售价,quantity AS '数量'
                            FROM carts,goods,types
                            WHERE carts.store=${payload.uid} AND carts.good=goods.id AND goods.分类=${payload.body.tid} AND goods.分类=types.id`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
                    this.trigger("to-user", payload);
                });
            });
        }
    },
    CartGoods: {
        xml: "<Sqlite id='sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/cart/goods", (e, payload) => {
                let stmt = `SELECT carts.id,单位,品名,图片,货号,零售价,quantity AS '数量'
                            FROM carts,goods
                            WHERE carts.store=${payload.uid} AND carts.good=goods.id AND quantity>0`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
                    this.trigger("to-user", payload);
                });
            });
        }
    },
    Remove: {
        xml: "<main id='remove'>\
                <Sqlite id='db'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.watch("/remove", (e, p) => {
                let remove = "UPDATE carts SET quantity=0 WHERE id=?";
                let stmt = items.db.prepare(remove);
                stmt.run(p.body.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "删除成功"};
                    this.trigger("to-user", p);
                });
            });
        }
    },
    QtyChange: {
        xml: "<Sqlite id='sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/qty/change", (e, p) => {
                let update = "UPDATE carts SET quantity=? WHERE id=?";
                let stmt = items.sqlite.prepare(update);
                stmt.run(p.body.quantity,p.body.id, err => {
                    if (err) throw err;
                    p.data = {code: 0, desc: "更新成功"};
                    this.trigger("to-user", p);
                });
            });
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