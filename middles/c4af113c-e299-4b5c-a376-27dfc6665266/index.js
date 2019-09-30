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
        xml: "<i:Flow id='index' xmlns:i='//miot/middle'>\
                <Areas id='areas'/>\
                <Links id='links'/>\
                <Parts id='parts'/>\
              </i:Flow>"
    },
    Areas: {
        xml: "<i:Flow xmlns:i='//miot/middle'>\
                <i:Router id='router' url='/areas/:action'/>\
                <Select id='select' xmlns='areas'/>\
              </i:Flow>"
    },
    Links: {
        xml: "<i:Flow xmlns:i='//miot/middle'>\
                <i:Router id='router' url='/links/:action'/>\
                <Select id='select' xmlns='links'/>\
              </i:Flow>"
    },
    Parts: {
        xml: "<i:Flow xmlns:i='//miot/middle'>\
                <i:Router id='router' url='/parts/:action'/>\
                <Select id='select' xmlns='parts'/>\
              </i:Flow>"
    }
});

$_("areas").imports({
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, payload) => {
                let stmt = `SELECT distinct areas.* FROM areas,links,parts,auths
                            WHERE areas.id = links.area AND links.id = parts.link AND parts.id = auths.part AND auths.user=${payload.uid}`
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
                    this.trigger("to-user", payload);
                });
            });
        }
    }
});

$_("links").imports({
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, payload) => {
                let stmt = `SELECT distinct links.* FROM links,parts,auths
                            WHERE links.area = '${payload.body.area}' AND links.id = parts.link AND parts.id = auths.part AND auths.user=${payload.uid} `;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = {area: payload.body.area, links: data};
                    this.trigger("to-user", payload);
                });
            });
        }
    }
});

$_("parts").imports({
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, payload) => {
                let stmt = `SELECT parts.* FROM parts,auths
                            WHERE parts.link = '${payload.body.link}' AND parts.id = auths.part AND auths.user=${payload.uid} AND parts.type<>9`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = {link: payload.body.link, parts: []};
                    data.forEach(i => {
                        payload.data.parts.push({'mid':i.id,'name':i.name,'class':i.class,'data':JSON.parse(i.data),'online':i.online});
                    });
                    this.trigger("to-user", payload);
                });
            });
        }
    }
});

});