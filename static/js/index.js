/*!
 * miot.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const Server = "ws://xmlplus.cn:8000";
const Gateway = "c55d5e0e-f506-4933-8962-c87932e0bc2a";
const app = new Framework7({dialog:{buttonOk: '确定', buttonCancel: "取消"}});

xmlplus("miot", (xp, $_, t) => {

$_().imports({
    Index: {
        css: "* { -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }\
              input { -webkit-user-select: text; } \
              html, body, #index { width: 100%; height: 100%; margin: 0; padding: 0; font-size: 100%; overflow: hidden; }\
              #index > * { width: 100%; height: 100%; }",
        xml: "<ViewStack id='index'>\
                <Verify id='verify'/>\
                <Service id='service'/>\
                <Login id='login'/>\
                <Content id='content'/>\
              </ViewStack>"
    },
    Verify: {
        xml: "<Overlay id='verify' xmlns='verify'/>",
        fun: function (sys, items, opts) {
            var o = {
                username: localStorage.getItem("username"),
                password: localStorage.getItem("password")
            };
            setTimeout(e => {
                if (o.username && o.password) {
                    sys.verify.trigger("switch", ["service", o]);
                } else {
                    sys.verify.trigger("switch", "login");
                }
            }, 0);
        }
    },
    Service: {
        css: "#service { visibility: visible; opacity: 1; }",
        xml: "<Overlay id='service' xmlns='verify'/>",
        fun: function (sys, items, opts) {
            let client = null;
            this.on("show", (e, key, config) => {
                config.clientId = CryptoJS.MD5(config.username).toString();
                client = mqtt.connect(Server, config);
                client.on("connect", e => {
                    client.subscribe(config.username);
                    console.log("connected to " + Server);
                    this.trigger("switch", "content").notify("online");
                });
                client.on("message", (topic, payload) => {
                    payload = JSON.parse(payload.toString());
                    if (payload.ssid == Gateway)
                        return this.notify(payload.topic, [payload.data, payload]);
                    this.notify(payload.ssid, payload);
                });
                client.on("close", e => this.notify("offline"));
                client.on("error", e => this.notify("logout"));
            });
            this.watch("logout", () => {
                client.end();
                localStorage.setItem("username", "");
                localStorage.setItem("password", "");
                this.trigger("switch", "login");
            });
            this.watch("publish", (e, topic, payload = {}) => {
                payload.ssid = localStorage.getItem("username");
                client.publish(topic, JSON.stringify(payload));
            });
            this.watch("subscribe", (e, topic) => client.subscribe(topic, {qos:1}));
        }
    },
    Login: {
        css: "#logo { margin: 60px auto 25px; display: block; width: 50%; height: auto; }",
        xml: "<div class='page'><div class='page-content login-screen-content' xmlns:i='login'>\
                <i:Logo id='logo'/>\
                <i:From id='login'>\
                  <i:User id='user'/>\
                  <i:Pass id='pass'/>\
                  <i:Submit id='submit'/>\
                </i:From>\
              </div></div>",
        fun: function (sys, items, opts) {
            function keypress( e ) {
                if (e.which === 13)
                    sys.submit.trigger("touchend");
            }
            sys.user.on("keypress", keypress);
            sys.pass.on("keypress", keypress);
            sys.submit.on("touchend", items.login.start);
        }
    },
    Content: {
        css: "#content { background: url(/img/background.jpg) no-repeat; background-size: 100% 100%; }\
              #stack, #client, #stack > * { width: 100%; height: 100%; box-sizing: border-box;}",
        xml: "<div id='content' xmlns:i='content'>\
                <ViewStack id='stack'>\
                    <i:Index id='index'/>\
                    <i:About id='about'/>\
                </ViewStack>\
                <i:Client id='client'/>\
                <i:Footer id='footer'/>\
              </div>",
        fun: function (sys, items, opts) {
            sys.footer.on("switch", (e, page) => {
                e.stopPropagation();
                sys.stack.trigger("switch", page, false);
            });
            this.on("show", () => this.notify("switch-page", "index"));
        }
    },
    ViewStack: {
        xml: "<div id='viewstack'/>",
        fun: function (sys, items, opts) {
            var args, children = this.children(),
                table = children.call("hide").hash(),
                ptr = table[opts.index] || children[0];
            if (ptr) ptr = ptr.trigger("show", null, false).show();
            this.on("switch", function (e, to) {
                table = this.children().hash();
                if ( !table[to] || table[to] == ptr ) return;
                e.stopPropagation();
                args = [].slice.call(arguments).slice(2);
                ptr.trigger("hide", [to+''].concat(args)).hide();
                ptr = table[to].trigger("show", [ptr+''].concat(args), false).show();
            });
            return Object.defineProperty({}, "selected", { get: () => {return ptr}});
        }
    }
});

$_("verify").imports({
    Overlay: {
        css: "#overlay { position: fixed; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,.4); z-index: 13000; visibility: hidden; opacity: 0; -webkit-transition-duration: .4s; transition-duration: .4s; }\
              #visible { visibility: visible; opacity: 1; }",
        xml: "<div id='overlay'>\
                <Loader/>\
              </div>",
        fun: function (sys, items, opts) {
            function show() {
                sys.overlay.addClass("#visible");
            }
            function hide() {
                sys.overlay.removeClass("#visible");
            }
            return { show: show, hide: hide };
        }
    },
    Loader: {
        css: "#preloader { position: absolute; left: 50%; top: 50%; padding: 8px; margin-left: -25px; margin-top: -25px; background: rgba(0, 0, 0, 0.8); z-index: 13500; border-radius: 5px; }\
              #spinner { display: block; width: 34px; height: 34px; background-position: 50%; background-size: 100%; background-repeat: no-repeat; -webkit-animation: $spin 1s steps(12, end) infinite; animation: $spin 1s steps(12, end) infinite; background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D'0%200%20120%20120'%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20xmlns%3Axlink%3D'http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink'%3E%3Cdefs%3E%3Cline%20id%3D'l'%20x1%3D'60'%20x2%3D'60'%20y1%3D'7'%20y2%3D'27'%20stroke%3D'%23fff'%20stroke-width%3D'11'%20stroke-linecap%3D'round'%2F%3E%3C%2Fdefs%3E%3Cg%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(30%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(60%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(90%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(120%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(150%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.37'%20transform%3D'rotate(180%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.46'%20transform%3D'rotate(210%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.56'%20transform%3D'rotate(240%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.66'%20transform%3D'rotate(270%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.75'%20transform%3D'rotate(300%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.85'%20transform%3D'rotate(330%2060%2C60)'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\"); }\
              @-webkit-keyframes $spin { 100% { -webkit-transform: rotate(360deg); } }\
              @keyframes $spin { 100% { transform: rotate(360deg); } }",
        xml: "<div id='preloader'>\
                <span id='spinner'/>\
              </div>"
    }
});

$_("login").imports({
    From: {
        xml: "<form id='form' class='list form-store-data'>\
                <ul id='content'/>\
              </form>",
        map: { "appendTo": "content" },
        fun: function (sys, items, opts) {
            var toast, ptr, first = this.first();
            this.on("next", function ( e, r ) {
                e.stopPropagation();
                ptr = ptr.next();
                ptr.trigger("start", r, false);
            });
            this.on("message", (e, t, msg) => {
                app.toast.destroy(toast);
                toast = app.toast.create({ text: msg, position: 'top', closeTimeout: 3000});
                toast.open();
            });
            function start() {
                ptr = first;
                ptr.trigger("start", {}, false);
            }
            return { start: start };
        }
    },
    Logo: {
        css: "#logo { fill: currentColor; color: #3388FF; }\
              #logo { padding: 4px; line-height: 1.42857143; background-color: #fff; border: 1px solid #ddd; border-radius: 4px; -webkit-transition: all 0.2s ease-in-out; -o-transition: all 0.2s ease-in-out; transition: all 0.2s ease-in-out; display: inline-block; max-width: 100%; height: auto;}",
        xml: "<svg id='logo' viewBox='0 0 1024 1024' width='200' height='200'>\
                <path d='M880 688c-32 0-57.6 9.6-83.2 25.6l-99.2-96c28.8-35.2 48-83.2 48-134.4 0-57.6-22.4-108.8-60.8-147.2l80-80c16 9.6 32 12.8 51.2 12.8C876.8 272 928 220.8 928 160c0-60.8-51.2-112-112-112C755.2 48 704 99.2 704 160c0 19.2 6.4 38.4 12.8 54.4l-86.4 86.4c-28.8-16-64-25.6-102.4-25.6-51.2 0-99.2 19.2-137.6 51.2L307.2 240C313.6 224 320 208 320 192c0-60.8-51.2-112-112-112C147.2 80 96 131.2 96 192c0 60.8 51.2 112 112 112 22.4 0 41.6-6.4 60.8-16l86.4 83.2c-22.4 32-32 70.4-32 112 0 35.2 9.6 70.4 25.6 99.2l-70.4 70.4c-28.8-19.2-60.8-32-99.2-32C80 624 0 704 0 800s80 176 176 176S352 896 352 800c0-38.4-12.8-73.6-32-99.2l64-64c38.4 38.4 89.6 60.8 147.2 60.8 44.8 0 86.4-12.8 118.4-35.2l105.6 102.4C742.4 780.8 736 806.4 736 832c0 80 64 144 144 144s144-64 144-144S960 688 880 688z'/>\
              </svg>"
    },
    User: {
        xml: "<Input id='user' placeholder='用户名' maxlength='32'/>",
        fun: function (sys, items, opts) {
            var patt = /^[a-z][a-z0-9_]{5,31}$/i;
            function error( msg ) {
                items.user.focus();
                sys.user.trigger("message", ["error", msg]);
            }
            this.on("start", function ( e, o ) {
                o.name = items.user.val();
                if ( o.name === "" ) {
                    error("请输入用户名");
                } else if ( o.name.length < 6 ) {
                    error("用户名至少需要6个字符");
                } else if ( !patt.test(o.name) ) {
                    error("您输入的用户名有误");
                } else {
                    sys.user.trigger("next", o);
                }
            });
            return items.user;
        }
    },
    Pass: {
        xml: "<Input id='pass' placeholder='密　码' type='password' maxlength='16'/>",
        fun: function (sys, items, opts) {
            function error(msg) {
                items.pass.focus();
                sys.pass.trigger("message", ["error", msg]);
            }
            this.on("start", (e, o) => {
                o.pass = items.pass.val();
                if ( o.pass === "" ) {
                    error("请输入密码");
                } else if ( o.pass.length < 6 ) {
                    error("密码至少需要6个字符");
                } else {
                    sys.pass.trigger("next", o);
                }
            });
            return items.pass;
        }
    },
    Submit: {
        xml: "<li id='submit'>\
                <a href='#' class='item-link list-button'>登录</a>\
              </li>",
        fun: function (sys, items, opts) {
            this.on("start", (e, o) => {
                localStorage.setItem("username", o.name);
                localStorage.setItem("password", o.pass);
                this.trigger("switch", ["service", {username: o.name, password: o.pass}]);
            });
        }
    },
    Input: {
        xml: "<li class='item-content item-input'>\
               <div class='item-inner'>\
                <div id='label' class='item-title item-label'/>\
                <div class='item-input-wrap'>\
                  <input id='input' type='text' placeholder='Your name'/>\
                  <span class='input-clear-button'/>\
                </div>\
               </div>\
             </li>",
        map: { attrs: { input: "name value type maxlength placeholder" } },
        fun: function (sys, items, opts) {
            //sys.label.text(opts.label);
            function focus() {
                sys.input.elem().focus();
                return this;
            }
            function val(value) {
                if (value === undefined)
                    return sys.input.prop("value");
                sys.input.prop("value", value);
                return this;
            }
            return { val: val, focus: focus };
        }
    }
});

$_("content").imports({
    Index: {
        css: "#index { padding: 12px; }\
              #parts { max-height: calc(100% - 130px); overflow: auto; }",
        xml: "<div id='index' xmlns:i='index'>\
                <i:Header id='header'/>\
                <i:Areas id='areas'/>\
                <i:Title id='title'/>\
                <i:Stores id='stores'/>\
                <i:Parts id='parts'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("open-store", (e, store) => {
                sys.title.text(store.name);
                this.notify("publish", [Gateway, {topic: "/parts/select", body: {link: store.id}}]);
            });
            sys.title.on("click", e => this.notify("show-stores"))
        }
    },
    About: {
        css: "#about { padding: 12px; }\
              #content { height: calc(100% - 88px); }",
        xml: "<div id='about' xmlns:i='about'>\
                <i:Header id='header'/>\
                <i:Content id='content'/>\
              </div>"
    },
    Client: {
        css: "#client { -webkit-transition-duration: .3s; transition-duration: .3s; position: fixed; left: 0; bottom: 0; z-index: 13500; width: 100%; -webkit-transform: translate3d(0,100%,0); transform: translate3d(0,100%,0); max-height: 100%; -webkit-overflow-scrolling: touch; }\
              #modal-in { -webkit-transform: translate3d(0,0,0); transform: translate3d(0,0,0);}\
              #client > * { width: 100%; height: 100%; }",
        xml: "<div id='client'>\
                <div id='instance'/>\
                <Overlay id='overlay' xmlns='/verify'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("publish", (e, topic, body) => {
                e.stopPropagation();
                this.notify("publish", [opts.ssid, {topic: topic, body: body}]);
            });
            function loadClient(part) {
                require([`/parts/${part.class}/index.js`], e => {
                    let Client = `//${part.class}/Client`;
                    xp.hasComponent(Client).map.msgscope = true;
                    let client = sys.overlay.before(Client, part);
                    register(client.notify("options", part.data));
                    items.overlay.hide();
                });
            }
            function register(client) {
                sys.client.watch(opts.ssid, (e, part) => {
                    if ( part.online == 0 )
                        return sys.client.trigger("close");
                    client.notify("options", xp.extend(true, opts.data, part.data));
                }).watch("offline", () => sys.client.trigger("close"));
            }
            this.watch("open-part", (e, data) => {
                items.overlay.show();
                sys.client.addClass("#modal-in").first().remove();
                loadClient(opts = data);
            });
            this.on("close", e => {
                e.stopPropagation();
                sys.client.unwatch(opts.ssid).unwatch("offline").removeClass("#modal-in");
            }, false);
        }
    },
    Footer: {
        xml: "<i:Tabbar id='nav' xmlns:i='footer'>\
                <i:TabItem id='index' label='首页'/>\
                <i:TabItem id='about' label='关于'/>\
              </i:Tabbar>",
        fun: function (sys, items, opts) {
            this.watch("switch-page", (e, page) => sys[page].trigger("touchend"));
        }
    }
});

$_("content/index").imports({
    Header: {
        css: "#header { margin: 0 4px; height: 26px; line-height: 26px; color: white; }\
              #area { float: left; background: none; padding: 0; }\
              #list { float: left; margin-right: 8px; }\
              #line { float: right; }",
        xml: "<header id='header' xmlns:i='header'>\
                <i:Icon id='list'/>\
                <i:Line id='area'/>\
                <i:Line id='line'/>\
              </header>",
        fun: function (sys, items, opts) {
            this.watch("online", e => sys.line.text("在线"));
            this.watch("offline", e => sys.line.text("离线"));
            sys.area.on("touchend", () => {
                let line = sys.line.text();
                line == "在线" && this.notify("show-areas");
            });
            this.watch("open-area", (e, area) => sys.area.text(area.name));
        }
    },
    Areas: {
        xml: "<List id='areas' xmlns='list'/>",
        fun: function (sys, items, opts) {
            var areas = {}, checked = {};
            this.watch("/areas/select", (e, areas) => {
                let tmp, selected;
                checked.id = localStorage.getItem("area");
                sys.areas.children().call("remove");
                areas.forEach(item => {
                    item.key = "area";
                    tmp = sys.areas.append("list/Item");
                    tmp.value().init(item);
                    item.id == checked.id && (selected = tmp);
                });
                (selected || sys.areas.first()).trigger("touchend");
            });
            sys.areas.on("touchend", "*", function (e) {
                checked = this.data("data");
                this.trigger("checked", true);
                items.areas.hide().notify("open-area", this.data("data"));
            });
            this.watch("/links/select", (e, stores, d) => {
                if (!d) return;
                areas[d.body.area] = stores;
            });
            this.watch("open-area", (e, area) => {
                localStorage.setItem("area", area.id);
                if (areas[area.id])
                    return this.notify("/links/select", [areas[area.id]]);
                this.notify("publish", [Gateway, {topic: "/links/select", body: {area: area.id}}]);
            });
            this.watch("offline", e => areas = {});
            this.watch("show-areas", items.areas.show);
        }
    },
    Stores: {
        xml: "<List id='stores' xmlns='list'/>",
        fun: function (sys, items, opts) {
            var checked = {};
            this.watch("/links/select", (e, links) => {
                var tmp, selected;
                checked.id = localStorage.getItem("store");
                sys.stores.children().call("remove");
                links.forEach(item => {
                    item.key = "link";
                    tmp = sys.stores.append("list/Item");
                    tmp.value().init(item);
                    item.id == checked.id && (selected = tmp);
                });
                (selected || sys.stores.first()).trigger("touchend");
            });
            sys.stores.on("touchend", "*", function (e) {
                checked = this.data("data");
                localStorage.setItem("store", checked.id);
                this.trigger("checked", true);
                items.stores.hide().notify("open-store", this.data("data"));
            });
            this.watch("show-stores", items.stores.show);
        }
    },
    Title: {
        css: "#title { letter-spacing: 0.1em; margin: 16px 4px 12px; font-weight: bold; color: white; }",
        xml: "<h3 id='title'/>"
    },
    Parts: {
        css: "#parts { display: flex; overflow: auto; flex-wrap: wrap; }\
              #parts > * { margin: 4px }",
        xml: "<div id='parts'/>",
        fun: function (sys, items, opts) {
            this.watch("/parts/select", (e, parts) => {
                var item, list = sys.parts.children();
                for ( i = 0; i < parts.length; i++ ) {
                    item = parts[i];
                    list[i] || list.push(sys.parts.append("Thumbnail"));
                    list[i].unwatch(list[i].attr("_id"));
                    list[i].data("data", item).trigger("data", item, false);
                    list[i].watch(item.ssid + '', listener).attr("_id", item.ssid + '').show();
                }
                for ( var k = i; k < list.length; k++ )
                    list[k].unwatch(list[i].attr("_id")).hide();
            });
            function listener(e, item) {
                e.currentTarget.trigger("data", item, false);
            }
            sys.parts.on("touchend", "*", function (e) {
                var data = this.data("data");
                data.online && this.notify("open-part", data);
            });
            this.watch("offline", e => {
                sys.parts.children().forEach(item => {
                    item.trigger("data", {online: false}, false);
                })
            });
        }
    },
    Thumbnail: {
        css: "a#thumbnail { -webkit-transition: transform 0.3s; padding-top: 4px; padding-bottom: 4px; height: 100%; -webkit-box-pack: justify; -ms-flex-pack: justify; -webkit-justify-content: space-between; justify-content: space-between; width: 100%; box-sizing: border-box; display: -webkit-box; display: -ms-flexbox; display: -webkit-flex; display: flex; -webkit-box-pack: center; -ms-flex-pack: center; -webkit-justify-content: center; justify-content: center; -webkit-box-align: center; -ms-flex-align: center; -webkit-align-items: center; align-items: center; overflow: visible; -webkit-box-flex: 1; -ms-flex: 1; -webkit-box-orient: vertical; -moz-box-orient: vertical; -ms-flex-direction: column; -webkit-flex-direction: column; flex-direction: column; color: #929292; -webkit-flex-shrink: 1; -ms-flex: 0 1 auto; flex-shrink: 1; position: relative; white-space: nowrap; text-overflow: ellipsis; text-decoration: none; outline: 0; color: #8C8185; }\
              a#thumbnail { width: 66px; height: 66px; border-radius: 10px; background:rgba(255,255,255,0.8) none repeat scroll; }\
              a#thumbnail:active { transform: scale(1.1); }\
              #label { margin: 3px 0 0; line-height: 1; display: block; letter-spacing: .01em; font-size: 10px; position: relative; text-overflow: ellipsis; white-space: nowrap; }\
              a#active { color: #FF9501; }",
        xml: "<a id='thumbnail'>\
                <Icon id='icon'/>\
                <span id='label'>标签</span>\
              </a>",
        fun: function (sys, items, opts) {
            this.on("data",  (e, payload) => {
                var data = e.currentTarget.data("data");
                xp.extend(true, data, payload);
                items.icon(data["class"]);
                sys.label.text(data.name);
                sys.thumbnail[data.online ? "addClass" : "removeClass"]("#active");
            });
        }
    },
    Icon: {
        css: "#icon { fill: currentColor; width: 30px; height: 30px; display: block; vertical-align: middle; background-size: 100% auto; background-position: center; background-repeat: no-repeat; font-style: normal; position: relative; }",
        xml: "<span id='icon'/>",
        fun: function (sys, items, opts) {
            let iPath, icon = sys.icon;
            return (klass) => {
                try {
                    try_show(klass);
                } catch(err) {
                    show("Unknow");
                }
                function try_show(klass) {
                    require([`/parts/${klass}/icon.js`], e => {
                        let iconPath = `//${klass}/Icon`;
                        show(xp.hasComponent(iconPath) ? iconPath : "Unknow");
                    });
                }
                function show(iconPath) {
                    if (iPath != iconPath)
                        icon = icon.replace(iPath = iconPath).addClass("#icon");
                }
            };
        }
    },
    Unknow: {
        xml: "<svg viewBox='0 0 1024 1024' width='200' height='200'>\
                  <path d='M797.75744 438.02624c-11.07968 0-21.95456 0.8192-32.72704 2.56 2.2528-13.6192 3.62496-27.36128 3.62496-41.69728 0-146.47296-118.6816-265.3184-265.29792-265.3184-142.56128 0-258.62144 112.78336-264.62208 254.03392C105.6768 394.38336 0 503.99232 0 638.64832c0 139.10016 112.68096 251.76064 251.82208 251.76064h545.93536C922.64448 890.40896 1024 789.13536 1024 664.18688c0-124.88704-101.35552-226.16064-226.24256-226.16064zM510.27968 808.38656c-22.69184 0-41.14432-18.06336-41.14432-40.30464 0-22.24128 18.39104-40.30464 41.14432-40.30464 22.67136 0 41.14432 18.06336 41.14432 40.30464-0.02048 22.24128-18.41152 40.30464-41.14432 40.30464z m110.46912-228.0448c-8.06912 12.6976-25.1904 29.92128-51.44576 51.77344-13.57824 11.28448-22.03648 20.3776-25.31328 27.29984-3.2768 6.8608-4.8128 19.16928-4.48512 36.90496h-58.5728c-0.12288-8.3968-0.24576-13.5168-0.24576-15.38048 0-18.96448 3.13344-34.52928 9.4208-46.77632 6.26688-12.24704 18.8416-26.0096 37.62176-41.2672 18.78016-15.31904 30.04416-25.31328 33.71008-30.04416 5.632-7.49568 8.51968-15.7696 8.51968-24.73984 0-12.4928-5.05856-23.18336-15.0528-32.1536-9.99424-8.9088-23.57248-13.39392-40.57088-13.39392-16.40448 0-30.12608 4.68992-41.14432 13.96736-11.01824 9.29792-20.50048 29.7984-22.75328 42.496-2.10944 11.9808-59.84256 17.03936-59.14624-7.24992 0.69632-24.28928 13.33248-50.62656 34.97984-69.71392 21.66784-19.08736 50.11456-28.65152 85.2992-28.65152 37.04832 0 66.4576 9.68704 88.3712 29.02016 21.9136 19.3536 32.80896 41.84064 32.80896 67.54304a74.07616 74.07616 0 0 1-12.00128 40.36608z'/>\
              </svg>"
    }
});

$_("content/index/header").imports({
    Icon: {
        css: "#icon { display: inline-block; border-radius: 13px; background:rgba(0,0,0,0.2) none repeat scroll; width: 26px; height: 26px; }\
              #icon svg { color: white; fill: currentColor; width: 16px; height: 16px; margin: 5px; }",
        xml: "<a id='icon'/>",
        fun: function (sys, items, opts) {
            sys.icon.append(opts.id);
        }
    },
    List: {
        xml: "<svg viewBox='0 0 1024 1024' width='200' height='200'>\
                <path d='M309.474912 719.986985c26.89658 0 48.695049-21.798469 48.695049-48.646953l-49.715285-264.667915c0-26.920116-21.798469-48.767703-48.695049-48.767703L136.249639 357.904413c-26.89658 0-48.646953 21.847587-48.646953 48.767703l49.715285 264.667915c0 26.848485 21.750373 48.646953 48.646953 48.646953L309.474912 719.986985z' p-id='6348'></path><path d='M591.985194 719.986985c26.89658 0 48.646953-21.798469 48.646953-48.646953l49.714262-476.756311c0-26.89658-21.750373-48.719608-48.646953-48.719608L418.711825 145.864112c-26.847461 0-48.744167 21.823028-48.744167 48.719608l49.715285 476.756311c0 26.848485 21.895683 48.646953 48.743144 48.646953L591.985194 719.986985z' p-id='6349'></path><path d='M874.446357 719.986985c26.89658 0 48.744167-21.798469 48.744167-48.646953L923.190525 547.709293c0-26.921139-21.847587-48.743144-48.744167-48.743144l-73.844845 0c-26.846438 0-35.634592 15.730263-48.694025 48.743144l-49.715285 123.630738c0 26.848485 21.847587 48.646953 48.695049 48.646953L874.446357 719.986985z' p-id='6350'></path><path d='M913.139611 773.779122 146.930909 773.779122c-12.720719 0-23.206538 10.414187-23.206538 23.231097 0 12.792351 18.157545 53.550637 30.974455 53.550637l758.440785-30.271444c12.769838 0 23.25668-10.486842 23.25668-23.279193C936.395268 784.193309 925.908426 773.779122 913.139611 773.779122z'/>\
              </svg>"
    },
    Line: {
        css: "#line { letter-spacing: 0.1em;  display: inline-block; border-radius: 13px; background:rgba(0,0,0,0.2) none repeat scroll; padding: 0 16px; font-size: 14px; color: white; }",
        xml: "<span id='line'>离线</span>"
    }
});

$_("content/index/areas").imports({
    Item: {
        css: "#label, #icon { display: block; width: 100%; height: 100%; position: absolute; top: 0; left: 0; }\
              #input { display: none; } #input:checked ~ div { background: no-repeat center; background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D'8px'%20height%3D'13px'%20viewBox%3D'0%200%208%2013'%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%3E%3Cpolygon%20fill%3D'%23007aff'%20transform%3D'translate(1.500000%2C%206.500000)%20rotate(-45.000000)%20translate(-1.500000%2C%20-6.500000)%20'%20points%3D'6%2011%206%202%204%202%204%209%20-3%209%20-3%2011%205%2011'%3E%3C%2Fpolygon%3E%3C%2Fsvg%3E\"); -webkit-background-size: 13px 10px; background-size: 8px 13px; background-position: calc(100% - 15px) center; }",
        xml: "<li id='item'>\
                <a id='span' href='javascript:void(0)'/>\
                <label id='label'>\
                    <input id='input' type='radio'/>\
                    <div id='icon'/>\
                </label>\
              </li>",
        fun: function (sys, items, opts) {
            this.on("checked", (e, value) => sys.input.prop("checked", value));
            return { init: data => {
                this.data("data", data);
                sys.span.text(data.name);
                sys.input.attr("name", data.key);
                sys.input.prop("value", data.name);
            }};
        }
    }
});

$_("content/index/list").imports({
    List: {
        css: "#list { -webkit-transition-duration: .3s; transition-duration: .3s; position: fixed; left: 0; bottom: 0; z-index: 13500; width: 100%; -webkit-transform: translate3d(0,100%,0); transform: translate3d(0,100%,0); max-height: 100%; -webkit-overflow-scrolling: touch; }\
              #modal-in { -webkit-transform: translate3d(0,0,0); transform: translate3d(0,0,0);}",
        xml: "<div id='list'>\
                <Overlay id='overlay'/>\
                <Group id='group'/>\
                <Cancel id='cancel'/>\
              </div>",
        map: { appendTo: "group" },
        fun: function (sys, items, opts) {
            let height, body = document.body;
            function show() {
                height = getComputedStyle(body, "").getPropertyValue("height");
                sys.group.css("max-height", `${parseFloat(height) - 81}px`);
                items.overlay.show();
                return sys.list.addClass("#modal-in");
            }
            function hide(e) {
                e && e.stopPropagation();
                items.overlay.hide();
                return sys.list.removeClass("#modal-in");
            }
            sys.cancel.on("touchend", hide);
            sys.overlay.on("touchend", hide);
            body.appendChild(sys.overlay.elem());
            return { show: show, hide: hide };
        }
    },
    Overlay: {
        map: { extend: {"from": "/verify/Overlay"} },
        xml: "<div id='overlay'/>"
    },
    Item: {
        css: "#item { cursor: pointer; height: 57px; line-height: 57px; font-size: 20px; color: #007aff; white-space: normal; text-overflow: ellipsis; }\
              #item { width: 100%; text-align: center; font-weight: 400; margin: 0; background: rgba(255,255,255,.95); box-sizing: border-box; display: block; position: relative; overflow: hidden; }\
              #item:after { content: ''; position: absolute; left: 0; bottom: 0; right: auto; top: auto; height: 1px; width: 100%; background-color: rgba(0,0,0,.2); display: block; z-index: 15; -webkit-transform-origin: 50% 100%; transform-origin: 50% 100%;}\
              #label, #icon { display: block; width: 100%; height: 100%; position: absolute; top: 0; left: 0; }\
              #input { display: none; } #input:checked ~ div { background: no-repeat center; background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2013%2010'%3E%3Cpolygon%20fill%3D'%23007aff'%20points%3D'11.6%2C0%204.4%2C7.2%201.4%2C4.2%200%2C5.6%204.4%2C10%204.4%2C10%204.4%2C10%2013%2C1.4%20'%2F%3E%3C%2Fsvg%3E\"); -webkit-background-size: 13px 10px; background-size: 13px 10px; background-position: calc(100% - 15px) center; }",
        xml: "<div id='item'>\
                <span id='span'/>\
                <label id='label'>\
                    <input id='input' type='radio'/>\
                    <div id='icon'/>\
                </label>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("checked", (e, value) => sys.input.prop("checked", value));
            return { init: data => {
                this.data("data", data);
                sys.span.text(data.name);
                sys.input.attr("name", data.key);
                sys.input.prop("value", data.name);
            }};
        }
    },
    Group: {
        css: "#group { overflow: auto; margin: 8px; position: relative; border-radius: 13px; overflow: hidden; -webkit-transform: translate3d(0,0,0); transform: translate3d(0,0,0); }",
        xml: "<div id='group'/>"
    },
    Cancel: {
        css: "#cancel { margin: 8px; position: relative; border-radius: 13px; overflow: hidden; -webkit-transform: translate3d(0,0,0); transform: translate3d(0,0,0);}\
              #label { border-radius: 13px; font-weight: 500; cursor: pointer; height: 57px; line-height: 57px; font-size: 20px; color: #007aff; white-space: normal; text-overflow: ellipsis; }\
              #label { width: 100%; text-align: center; margin: 0; background: rgba(255,255,255,.95); box-sizing: border-box; display: block; position: relative; overflow: hidden; }",
        xml: "<div id='cancel'>\
                <div id='label'>取消</div>\
              </div>",
    }
});

$_("content/about").imports({
    Header: {
        css: "#header { margin: 0 4px; height: 26px; line-height: 26px; color: white; }\
              #about { float: left; margin-right: 8px; }\
              #title { float: left; background: none; padding: 0; }\
              #line { float: right; margin: 0 0 0 8px; }",
        xml: "<header id='header' xmlns:i='../index/header'>\
                <Icon id='about'/>\
                <i:Line id='title'/>\
                <i:Line id='line'/>\
              </header>",
        fun: function (sys, items, opts) {
            sys.title.text("马蹄莲");
            this.watch("online", e => sys.line.text("在线"));
            this.watch("offline", e => sys.line.text("离线"));
        }
    },
    Content: {
        css: "#body { height: 100%; overflow-y: auto; display: -ms-flexbox; display: -webkit-flex; display: flex; flex-direction: column; justify-content: center; }\
              #logo { margin: 0 auto; width: 160px; border-radius: 10px; background: rgba(255,255,255,0.8) none repeat scroll; }\
              #body { margin: 0; box-sizing: border-box; }\
              #content > * { margin: 0 0 .5em; }",
        xml: "<div id='body'>\
                <Logo id='logo' xmlns='/login'/>\
                <Logout id='logout'/>\
              </div>"
    },
    Icon: {
        map: { extend: {"from": "../index/header/Icon"} }
    },
    About: {
        map: { extend: {"from": "../footer/icon/About"} }
    },
    Logout: {
        xml: "<div class='list inset'>\
                <ul><li><a href='#' class='list-button item-link color-red'>退出</a></li></ul>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("touchend", e => {
                app.dialog.confirm("确定退出系统吗？", "温馨提示", e => this.notify("logout"));
            });
        }
    }
});

$_("content/footer").imports({
    TabBar: {
        css: "#tabbar { position: absolute; width: 100%; height: 50px; color: #929292; z-index: 5001; left: 0; bottom: 0; background: rgba(0,0,0,0.7) none repeat scroll; }\
              #tabbar { box-sizing: border-box; font-size: 17px; margin: 0; -webkit-backface-visibility: hidden; backface-visibility: hidden; transform: translate3d(0,0,0); -webkit-transform: translate3d(0,0,0); }\
              #tabbar:before { content: ''; position: absolute; left: 0; top: 0; bottom: auto; right: auto; height: 1px; width: 100%; background-color: #c4c4c4; display: block; z-index: 15; -webkit-transform-origin: 50% 0; transform-origin: 50% 0;}\
              #inner { position: absolute; left: 0; top: 0; width: 100%; height: 100%; padding: 0 8px; box-sizing: border-box; display: -webkit-box; display: -ms-flexbox; display: -webkit-flex; display: flex; -webkit-box-pack: justify; -ms-flex-pack: justify; -webkit-justify-content: space-between; justify-content: space-between; -webkit-box-align: center; -ms-flex-align: center; -webkit-align-items: center; align-items: center; }",
        xml: "<div id='tabbar'>\
                <div id='inner'/>\
              </div>",
        map: { appendTo: "inner" },
        fun: function (sys, items, opts) {
            var sel = this.first();
            this.on("touchend", "./*[@id]", function (e) {
                sel.value().unselect();
                (sel = this).value().select();
                this.trigger("switch", this.toString());
            });
            if (sel) sel.value().select();
        }
    },
    TabItem: {
        css: "a#tabitem { padding-top: 4px; padding-bottom: 4px; height: 100%; -webkit-box-pack: justify; -ms-flex-pack: justify; -webkit-justify-content: space-between; justify-content: space-between; width: 100%; box-sizing: border-box; display: -webkit-box; display: -ms-flexbox; display: -webkit-flex; display: flex; -webkit-box-pack: center; -ms-flex-pack: center; -webkit-justify-content: center; justify-content: center; -webkit-box-align: center; -ms-flex-align: center; -webkit-align-items: center; align-items: center; overflow: visible; -webkit-box-flex: 1; -ms-flex: 1; -webkit-box-orient: vertical; -moz-box-orient: vertical; -ms-flex-direction: column; -webkit-flex-direction: column; flex-direction: column; color: #929292; -webkit-flex-shrink: 1; -ms-flex: 0 1 auto; flex-shrink: 1; position: relative; white-space: nowrap; text-overflow: ellipsis; text-decoration: none; outline: 0; color: #8C8185; }\
              #label { margin: 0;line-height: 1; display: block; letter-spacing: .01em; font-size: 10px; position: relative; text-overflow: ellipsis; white-space: nowrap; }\
              a#active { color: #FF9501; }",
        xml: "<a id='tabitem'>\
                <TabIcon id='icon'/>\
                <span id='label'>首页</span>\
              </a>",
        map: { attrs: { icon: "id->icon" }},
        fun: function (sys, items, opts) {
            sys.label.text(opts.label);
            function select() {
                sys.tabitem.addClass("#active");
            }
            function unselect() {
                sys.tabitem.removeClass("#active");
            }
            return { select: select, unselect: unselect };
        }
    },
    TabIcon: {
        css: "#icon { fill: currentColor; height: 30px; display: block; width: 30px; vertical-align: middle; background-size: 100% auto; background-position: center; background-repeat: no-repeat; font-style: normal; position: relative; }",
        xml: "<span id='icon'/>",
        opt: { icon: "Index" },
        fun: function (sys, items, opts) {
            sys.icon.replace("icon/" + opts.icon).addClass("#icon");
        }
    }
});

$_("content/footer/icon").imports({
    Index: {
        xml: "<svg width='48' height='48' viewBox='0 0 1024 1024'>\
                <path d='M949.082218 519.343245 508.704442 107.590414 68.326667 518.133697c-8.615215 8.03193-9.096169 21.538549-1.043772 30.144554 8.043187 8.599865 21.566178 9.085936 30.175253 1.035586l411.214573-383.337665 411.232992 384.505257c4.125971 3.854794 9.363252 5.760191 14.5903 5.760191 5.690606 0 11.384281-2.260483 15.58393-6.757914C958.138478 540.883841 957.695387 527.388479 949.082218 519.343245L949.082218 519.343245zM949.082218 519.343245M814.699602 527.800871c-11.787464 0-21.349237 9.555633-21.349237 21.327748l0 327.037405L622.552373 876.166023 622.552373 648.662543 394.824789 648.662543l0 227.503481L224.032938 876.166023 224.032938 549.128619c0-11.772115-9.55154-21.327748-21.348214-21.327748-11.802814 0-21.35333 9.555633-21.35333 21.327748l0 369.691877 256.19494 0L437.526333 691.318038l142.329613 0 0 227.502457 256.1888 0L836.044746 549.128619C836.045769 537.356504 826.481949 527.800871 814.699602 527.800871L814.699602 527.800871zM814.699602 527.800871M665.254941 222.095307l128.095423 0 0 113.74867c0 11.789511 9.562796 21.332864 21.349237 21.332864 11.783371 0 21.346167-9.543354 21.346167-21.332864L836.045769 179.439812 665.254941 179.439812c-11.789511 0-21.35333 9.538237-21.35333 21.327748C643.900587 212.554 653.464407 222.095307 665.254941 222.095307L665.254941 222.095307zM665.254941 222.095307'/>\
              </svg>",
    },
    About: {
        xml: "<svg width='48' height='48' viewBox='0 0 1024 1024'>\
                <path d='M507.577907 23.272727C240.142852 23.272727 23.272727 239.870837 23.272727 507.094323 23.272727 774.535126 240.153546 991.375225 507.577907 991.375225 775.101356 991.375225 991.883087 774.596878 991.883087 507.094323 991.883087 239.824352 775.104293 23.272727 507.577907 23.272727ZM507.577907 69.818182C749.408866 69.818182 945.337633 265.541628 945.337633 507.094323 945.337633 748.890368 749.395172 944.82977 507.577907 944.82977 265.857934 944.82977 69.818182 748.826829 69.818182 507.094323 69.818182 265.590268 265.836128 69.818182 507.577907 69.818182ZM460.17174 368.061568 555.443661 368.061568 555.443661 763.664179 460.17174 763.664179 460.17174 368.061568ZM507.761743 230.268948C534.095946 230.268948 555.397702 251.580874 555.397702 277.899264 555.397702 304.171723 534.072967 325.506614 507.761743 325.506614 481.450515 325.506614 460.17174 304.171723 460.17174 277.899264 460.17174 251.580874 481.450515 230.268948 507.761743 230.268948Z'/>\
              </svg>"
    }
});

});