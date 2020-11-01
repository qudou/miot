/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("c4af113c-e299-4b5c-a376-27dfc6665266", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Areas id='areas'/>\
                <Links id='links'/>\
                <Parts id='parts'/>\
              </main>"
    },
    Areas: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/areas/select", (e, payload) => {
                let stmt = `SELECT distinct areas.* FROM areas,links,parts,auths
                            WHERE areas.id = links.area AND links.id = parts.link AND parts.id = auths.part AND auths.user=${payload.uid}`
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
                    this.trigger("to-user", payload);
                });
            });
        }
    },
    Links: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/links/select", (e, payload) => {
                let stmt = `SELECT distinct links.* FROM links,parts,auths
                            WHERE links.area = '${payload.body.area}' AND links.id = parts.link AND parts.id = auths.part AND auths.user=${payload.uid} `;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = {area: payload.body.area, links: data};
                    this.trigger("to-user", payload);
                });
            });
        }
    },
    Parts: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("/parts/select", (e, payload) => {
                let stmt = `SELECT parts.* FROM parts,auths
                            WHERE parts.link = '${payload.body.link}' AND parts.id = auths.part AND auths.user=${payload.uid}`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = {link: payload.body.link, parts: []};
                    data.forEach(i => {
                        payload.data.parts.push({'mid':i.id,'name':i.name,'class':i.class,'type':i.type,'online':i.online});
                    });
                    this.trigger("to-user", payload);
                });
            });
        }
    }
});

});