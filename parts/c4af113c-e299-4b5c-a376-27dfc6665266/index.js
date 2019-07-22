/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlplus = require("xmlplus");

xmlplus("c4af113c-e299-4b5c-a376-27dfc6665266", (xp, $_, t) => {

$_().imports({
    Index: {
        xml: "<i:Middle id='middle' xmlns:i='//miot/proxy'>\
                <Areas id='areas'/>\
                <Links id='links'/>\
                <Parts id='parts'/>\
              </i:Middle>"
    },
    Areas: {
        xml: "<i:Flow xmlns:i='areas'>\
                <i:Router id='router' url='/areas/:action'/>\
                <i:Select id='select'/>\
              </i:Flow>"
    },
    Links: {
        xml: "<i:Flow xmlns:i='areas'>\
                <i:Router id='router' url='/links/:action'/>\
                <Select id='select' xmlns='links'/>\
              </i:Flow>"
    },
    Parts: {
        xml: "<i:Flow xmlns:i='areas'>\
                <i:Router id='router' url='/parts/:action'/>\
                <Select id='select' xmlns='parts'/>\
              </i:Flow>"
    }
});

$_("areas").imports({
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
    Select: {
        xml: "<Sqlite id='sqlite' xmlns='//miot/sqlite'/>",
        fun: function (sys, items, opts) {
            this.on("enter", (e, payload) => {
                let user = payload.ssid.substr(0,32);
                let stmt = `SELECT distinct areas.* FROM areas,links,parts,authorizations AS a
                            WHERE a.user='${user}' AND a.memo LIKE '%' || parts.id || '%' AND areas.id = links.area AND links.id = parts.link`
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
                let user = payload.ssid.substr(0,32);
                let stmt = `SELECT distinct links.* FROM links,parts,authorizations AS a
                            WHERE a.user='${user}' AND a.memo LIKE ('%' || parts.id || '%') AND links.area = '${payload.body.area}' AND links.id = parts.link`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    payload.data = data;
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
                let user = payload.ssid.substr(0,32);
                let stmt = `SELECT parts.* FROM parts,authorizations AS a
                            WHERE a.user='${user}' AND a.memo LIKE '%' || parts.id || '%' AND parts.link = '${payload.body.link}'`;
                items.sqlite.all(stmt, (err, data) => {
                    if (err) throw err;
                    data.forEach(item => {
                        item.ssid = item.id;
                        delete item.id;
                        item.data = JSON.parse(item.data);
                    });
                    payload.data = data;
                    this.trigger("to-user", payload);
                });
            });
        }
    }
});

});