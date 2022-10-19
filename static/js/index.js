/*!
 * miot.js v1.0.10
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

window.app = new Framework7({theme: "ios", dialog:{buttonOk: '确定', buttonCancel: "取消"}});
const Click = 'ontouchend' in document.documentElement === true ? "touchend" : "click";

xmlplus("miot", (xp, $_) => {

$_().imports({
    Index: {
        css: "* { -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }\
              input { -webkit-user-select: text; } \
              html, body, #index { width: 100%; height: 100%; margin: 0; padding: 0; font-size: 100%; overflow: hidden; }\
              #index { background: url(/img/background.jpg) no-repeat; background-size: 100% 100%; }\
              #login { background: #FFF; }\
              #index > * { transition-duration: 0s; }\
              .toast-text { width:100%; text-align: center;}\
              .dialog { border: 1px solid #CACDD1; }",
        xml: "<i:ViewStack id='index' xmlns:i='widget'>\
                <Verify id='verify'/>\
                <Service id='service'/>\
                <Login id='login'/>\
                <Content id='content'/>\
              </i:ViewStack>",
        fun: function(sys, items, opts) {
            let toast;
            this.on("message", (e, t, msg) => {
                toast && toast.close();
                window.app.toast.destroy(toast);
                toast = window.app.toast.create({ text: msg, position: 'top', closeTimeout: 3000});
                toast.open();
            });
            this.watch("/ui/session", (e, p) => {
                localStorage.setItem("session", p.session);
                localStorage.setItem("username", p.username);
            });
        }
    },
    Verify: {
        xml: "<Overlay id='verify' xmlns='verify'/>",
        fun: function (sys, items, opts) {
            let session = localStorage.getItem("session");
            setTimeout(e => {
                this.trigger("goto", session ? ["service", {username: session}] : "login");
            }, 0);
        }
    },
    Service: {
        css: "#service { visibility: visible; opacity: 1; }",
        xml: "<Overlay id='service' xmlns='verify'/>",
        fun: function (sys, items, opts) {
            let client = null;
            let Server = document.querySelector("meta[name='mqtt-server']").getAttribute("content");
            this.on("show", (e, key, cfg) => {
                client = mqtt.connect(Server, cfg);
                client.on("connect", e => {
                    client.subscribe(client.options.clientId, err => {
                        if (err) throw err;
                        this.notify("subscribed");
                    });
                    console.log("connected to " + Server);
                    this.trigger("goto", "content").notify("/stat/ui/1");
                });
                client.on("message", (topic, p) => {
                    this.notify("message", JSON.parse(p.toString()));
                });
                client.on("close", e => this.notify("/stat/ui/0"));
                client.on("error", e => {
                    this.trigger("message", ["error", e.message]);
                    e.message == "Connection refused: Bad username or password" && this.notify("/ui/logout");
                });
            });
            this.watch("/ui/logout", (e, p) => {
                client.end();
                localStorage.clear();
                this.trigger("goto", "login");
            });
            this.watch("publish", (e, topic, p = {}) => {
                client.publish(topic, JSON.stringify(p));
            });
        }
    },
    Login: {
        css: "#logo { margin: 60px auto 25px; display: block; width: 50%; height: auto; }",
        xml: "<div class='page'><div class='page-content login-screen-content' xmlns:i='login'>\
                <i:Logo id='logo'/>\
                <i:Form id='login'>\
                  <i:User id='user'/>\
                  <i:Pass id='pass'/>\
                  <i:Submit id='submit'/>\
                </i:Form>\
              </div></div>",
        fun: function (sys, items, opts) {
            function keypress(e) {
                e.which == 13 && sys.submit.trigger(Click);
            }
            sys.user.on("keypress", keypress);
            sys.pass.on("keypress", keypress);
            sys.submit.on(Click, items.login.start);
        }
    },
    Content: {
        css: "#stack, #applet, #stack > * { width: 100%; height: 100%; box-sizing: border-box;}",
        xml: "<div id='content' xmlns:i='content' xmlns:j='widget'>\
                <j:ViewStack id='stack'>\
                    <i:Index id='home'/>\
                    <i:About id='about'/>\
                </j:ViewStack>\
                <i:Footer id='footer'/>\
                <i:Popup id='popup'/>\
                <i:Applet id='applet'/>\
              </div>",
        fun: function (sys, items, opts) {
            const uid = "5ab6f0a1-e2b5-4390-80ae-3adf2b4ffd40";
            sys.footer.on("switch", (e, page) => {
                e.stopPropagation();
                sys.stack.trigger(page == "home" ? "back" : "goto", page);
            });
            this.on("show", () => this.notify("switch-page", "home"));
            this.on("publish", (e, p) => {
                e.stopPropagation();
                this.notify("publish", [uid, p]);
            });
            this.on("/open/applet", (e, p) => {
                e.stopPropagation();
                this.notify("/open/applet", p);
            });
            this.watch("message", (e, p) => {
                this.notify(p.topic, [p.data]);
            });
            this.watch("subscribed", () => this.trigger("publish", {topic: "/ui/areas"}));
        }
    }
});

$_("verify").imports({ 
    Overlay: {
        css: "#overlay { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,.4); z-index: 13000; visibility: hidden; opacity: 0; -webkit-transition-duration: .4s; transition-duration: .4s; }\
              #visible { visibility: visible; opacity: 1; }",
        xml: "<div id='overlay'>\
                <Loader/>\
              </div>",
        fun: function (sys, items, opts) {
            function show(text) {
                sys.overlay.addClass("#visible");
                text && sys.label.text(text);
            }
            function hide() {
                sys.overlay.removeClass("#visible");
            }
            return { show: show, hide: hide };
        }
    },
    Message: {
        css: "#info { position: absolute; top: 50%; width: 100%; padding: 8px; box-sizing: border-box; color: white; text-align: center; background: rgba(0, 0, 0, 0.4); border-radius: 5px; }\
              #close { fill: #007aff; width: 22px; height: 22px; margin-bottom: -6px; }",
        xml: "<div id='overlay'>\
                <div id='info'>\
                    <span id='label'/>\
                    <a href='#'>\
                      <Close id='close' xmlns='/assets'/>\
                    </a>\
                </div>\
              </div>",
        map: { extend: { from: "Overlay" } },
        fun: function (sys, items, opts) {
            sys.close.on(Click, () => this.trigger("close")); 
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
    Form: {
        xml: "<form id='form' class='list form-store-data'>\
                <ul id='content'/>\
              </form>",
        map: { "appendTo": "content" },
        fun: function (sys, items, opts) {
            var ptr, first = this.first();
            this.on("next", (e, r) => {
                e.stopPropagation();
                ptr = ptr.next();
                ptr.trigger("start", r);
            });
            function start() {
                ptr = first;
                ptr.trigger("start", {});
            }
            this.on("start", e => e.stopPropagation());
            return {start: start};
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
        xml: "<Input id='user' icon='person' placeholder='用户名' maxlength='32'/>",
        fun: function (sys, items, opts) {
            var patt = /^[a-z0-9_]{4,31}$/i;
            function error( msg ) {
                items.user.focus();
                sys.user.trigger("message", ["error", msg]);
            }
            this.on("start", (e, p) => {
                p.name = items.user.val();
                if (p.name === "") {
                    error("请输入用户名");
                } else if (p.name.length < 4) {
                    error("用户名至少需要4个字符");
                } else if (!patt.test(p.name)) {
                    error("您输入的用户名有误");
                } else {
                    this.trigger("next", p);
                }
            });
            return items.user;
        }
    },
    Pass: {
        xml: "<Input id='pass' icon='lock_circle' placeholder='密　码' type='password' maxlength='16'/>",
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
                    this.trigger("next", o);
                }
            });
            return items.pass;
        }
    },
    Submit: {
        xml: "<li id='submit' style='margin:15px;'>\
                <a href='#' class='button button-large button-raised button-fill' style='height:44px;border-radius:20px;font-size:16px; padding:6px;'>登录</a>\
              </li>",
        fun: function (sys, items, opts) {
            this.on("start", (e, o) => {
                this.trigger("goto", ["service", {username: o.name, password: o.pass}]);
            });
        }
    },
    Input: {
        css: ".ios .list .item-inner:after {width: calc(100% - 15px);}",
        xml: "<li class='item-content item-input'>\
               <div class='item-media' style='height:52px;padding:12px 0 3px;'>\
                <i id='icon' class='icon f7-icons ios-only'>person</i>\
               </div>\
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
            sys.icon.text(opts.icon);
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
            return {val: val, focus: focus};
        }
    }
});

$_("content").imports({
    Index: {
        css: "#index { padding: 12px; }\
              #apps { max-height: calc(100% - 130px); overflow: hidden; }",
        xml: "<div id='index' xmlns:i='index'>\
                <i:Head id='head'/>\
                <i:Title id='title'/>\
                <i:Apps id='apps'/>\
              </div>"
    },
    About: {
        css: "#content { height: calc(100% - 88px); }",
        xml: "<div id='about' xmlns:i='about'>\
                <i:Content id='content'/>\
              </div>"
    },
    Footer: {
        xml: "<i:Tabbar id='footer' xmlns:i='footer'>\
                <i:TabItem id='home' label='首页' checked='true'/>\
                <i:TabItem id='about' label='关于'/>\
              </i:Tabbar>",
        fun: function (sys, items, opts) {
            sys.footer.on(Click, "*", function (e) {
                this.trigger("switch", this.toString());
            });
            this.watch("switch-page", (e, page) => {
                sys[page].trigger(Click);
                items[page].prop("checked", "true");
            });
        }
    },
    Popup: {
        xml: `<i:List id='popup' xmlns:i='popup'>\
                <i:Item id='render' key='${xp.guid()}'/>\
              </i:List>`,
        fun: function (sys, items, opts) {
            let key, buf = [];
                list = sys.render.bind([]);
            this.watch("/open/popup", (e, _key, _list) => {
                let pid = localStorage.getItem(key = _key);
                list.model = buf = _list;
                let i = _list.findIndex(i=>{return i.id == pid});
                i = sys.popup.get(i == -1 ? 0 : i);
                i.trigger(Click).val().checked = true;
                items.popup.show();
            });
            sys.popup.on(Click, "*", function () {
                let i = sys.popup.kids().indexOf(this);
                localStorage.setItem(key, buf[i].id);
                items.popup.hide().notify(`/open/${key}`, buf[i]);
            });
        }
    },
    Applet: {
        css: "#applet { -webkit-transition-duration: .3s; transition-duration: .3s; position: absolute; left: 0; bottom: 0; z-index: 13500; width: 100%; -webkit-transform: translate3d(0,100%,0); transform: translate3d(0,100%,0); max-height: 100%; -webkit-overflow-scrolling: touch; }\
              #modal-in { -webkit-transform: translate3d(0,0,0); transform: translate3d(0,0,0);}\
              #applet > * { width: 100%; height: 100%; }",
        xml: "<div id='applet' xmlns:i='/verify'>\
                <i:Overlay id='mask'/>\
                <i:Message id='info'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("publish", (e, topic, body) => {
                e.stopPropagation();
                this.notify("publish", [opts.mid, {topic: topic, body: body}]);
            });
            this.watch("/ui/app", (e, p) => {
                let app = sys.mask.prev();
                app && opts.mid == p.mid && app.notify(p.topic, [p.data]);
            });
            function load(app) {
                let applet = `//${app.view}/Index`;
                let c = xp.hasComponent(applet);
                if (!c) return setTimeout(i=>load(app), 10);
                c.map.msgscope = true;
                sys.mask.before(applet, app);
                items.mask.hide();
                sys.applet.once("close", close);
                sys.mask.prev().notify(`//${opts.view}`);
            }
            sys.info.on("close", close);
            function close(e) {
                e.stopPropagation();
                items.info.hide();
                sys.applet.removeClass("#modal-in");
                sys.applet.once("transitionend", sys.mask.prev().remove);
            }
            this.watch("/open/applet", (e, app) => {
                opts = app;
                items.mask.show();
                sys.applet.addClass("#modal-in");
                require([`/views/${app.dir}/index.js`], () => load(app), () => {
                    items.mask.hide();
                    sys.applet.removeClass("#modal-in");
                    this.trigger("message", ["error", "应用打开失败，请稍后再试！"]);
                });
            });
            this.watch("/stat/app", (e, p) => {
                let app = sys.mask.prev();
                if (app && opts.mid == p.mid)　{
                    if (p.data == 0)
                        return items.info.show("设备已离线-[01]");
                    items.info.hide();
                    app.notify(`//${opts.view}`);
                }
            });
            this.watch("/stat/link", (e, p) => {
                let app = sys.mask.prev();
                if (app && opts.link == p.mid && p.data == 0)
                    items.info.show("设备已离线-[02]");
            });
            this.watch("/stat/ui/0", () => {
                let app = sys.mask.prev();
                app && items.info.show("设备已离线-[03]");
            });
            this.watch("/ui/apps", (e, p) => {
                let app = sys.mask.prev();
                app && p.apps.forEach(i => {
                    if (i.mid == opts.mid) {
                        if (i.online == 0)
                            return items.info.show("设备已离线-[00]");
                        items.info.hide();
                        app.notify(`//${opts.view}`)
                    }
                });
            });
        }
    }
});

$_("content/index").imports({
    Head: {
        css: "#head { margin: 0 4px; height: 26px; line-height: 26px; color: white; }\
              #label { float: left; background: none; padding: 0; }\
              #area { float: left; margin-right: 8px; }\
              #stat { float: right; }",
        xml: "<header id='head' xmlns:i='head'>\
                <i:Icon id='area'/>\
                <i:Text id='label'/>\
                <i:Stat id='stat'/>\
              </header>",
        fun: function (sys, items, opts) {
            let areas = [], table = {};
            sys.label.on(Click, () => {
                this.notify("/open/popup", ["area", areas]);
            });
            this.watch("/ui/areas", (e, _areas) => {
                if (_areas.length == 0) {
                    this.notify("/ui/logout");
                    this.trigger("message", ["error", "该用户未获得任何应用的授权！"]);
                    return false;
                }
            });
            this.watch("/ui/areas", (e, _areas) => {
                areas = _areas;
                let id = localStorage.getItem("area");
                let area = areas.find(i=>{return i.id == id});
                this.notify(`/open/area`, area || areas[0]);
            });
            this.watch("/open/area", (e, area) => {
                sys.label.text(area.name);
                localStorage.setItem("area", area.id);
                if (table[area.id])
                    return this.notify("/ui/links", [table[area.id]]);
                this.trigger("publish", {topic: "/ui/links", body: {area: area.id}});
            });
            this.watch("/stat/link", (e, p) => {
                for (let k in table)
                table[k].links.forEach(link => {
                    link.id == p.mid && (link.online = p.data);
                }); 
            });
            this.watch("/stat/ui/0", e => table = {});
            this.watch("/ui/links", (e, p) => (table[p.area] = p));
        }
    },
    Title: {
        css: "#title { letter-spacing: 0.1em; margin: 16px 4px 12px; font-weight: bold; color: white; }",
        xml: "<h3 id='title'/>",
        fun: function (sys, items, opts) {
            let links = [];
            this.on(Click, () => {
                this.notify("/open/popup", ["link", links]);
            });
            this.watch("/ui/links", (e, p) => {
                links = p.links;
                let id = localStorage.getItem("link");
                let link = links.find(i=>{return i.id == id});
                this.notify(`/open/link`, link || links[0]);
            });
            this.watch("/open/link", (e, link) => {
                text(opts = link);
                this.trigger("publish", {topic: "/ui/apps", body: {link: link.id}});
            });
            function text(p) { 
                sys.title.text(p.online ? opts.name : opts.name + "*")
            }
            this.watch("/stat/link", (e, p) => {
                opts.id == p.mid && text(p)
            });
        }
    },
    Apps: {
        css: "#apps { display: flex; overflow: hidden; flex-wrap: wrap; }\
              #apps > * { margin: 4px }",
        xml: "<div id='apps'>\
                 <Item id='renderer' xmlns='apps'/>\
              </div>",
        fun: function (sys, items, opts) {
            let link, _apps;
            let apps = sys.renderer.bind([]);
            this.watch("/ui/apps", (e, p) => {
                link = p.link;
                p.apps.forEach(i => i.dir = `${i.type ? "usr" : "sys"}/${i.view}`);
                apps.model = _apps = p.apps;
            });
            this.watch("/stat/app", (e, p) => {
                let i = _apps.findIndex(i=>{return i.mid == p.mid});
                i > -1 && (apps.model[i].online = _apps[i].online = p.data);
            });
            sys.apps.on(Click, "*", function (e) {
                let i = sys.apps.kids().indexOf(this);
                _apps[i].online && this.trigger("/open/applet", _apps[i]);
            });
            this.watch("/stat/link", (e, p) => {
                link == p.mid && p.data == 0 && offlineAll(1);
            });
            function offlineAll(type) {
                for (let i = 0; i < _apps.length; i++)
                    if(_apps[i].type > type)
                        apps.model[i].online = _apps[i].online = 0;
            }
            this.watch("/stat/ui/0", () => offlineAll(-1));
        }
    }
});

$_("content/index/head").imports({
    Icon: {
        css: "#icon { display: inline-block; border-radius: 13px; background:rgba(0,0,0,0.2) none repeat scroll; width: 26px; height: 26px; }\
              #icon svg { color: white; fill: currentColor; width: 16px; height: 16px; margin: 5px; }",
        xml: "<a id='icon'/>",
        fun: function (sys, items, opts) {
            sys.icon.append(`/assets/${opts.id}`);
        }
    },
    Text: {
        css: "#text { letter-spacing: 0.1em;  display: inline-block; border-radius: 13px; background:rgba(0,0,0,0.2) none repeat scroll; padding: 0 16px; font-size: 14px; color: white; }",
        xml: "<span id='text'/>"
    },
    Stat: {
        xml: "<Text id='stat'>在线</Text>",
        fun: function (sys, items, opts) {
            this.watch("/open/popup", () => {
                if (this.text() == "离线") return false;
            });
            this.watch("/stat/ui/1", e => this.text("在线"));
            this.watch("/stat/ui/0", e => this.text("离线"));
        }
    }
});

$_("content/index/apps").imports({
    Item: {
        css: "a#item { -webkit-transition: transform 0.3s; padding-top: 4px; padding-bottom: 4px; height: 100%; -webkit-box-pack: justify; -ms-flex-pack: justify; -webkit-justify-content: space-between; justify-content: space-between; width: 100%; box-sizing: border-box; display: -webkit-box; display: -ms-flexbox; display: -webkit-flex; display: flex; -webkit-box-pack: center; -ms-flex-pack: center; -webkit-justify-content: center; justify-content: center; -webkit-box-align: center; -ms-flex-align: center; -webkit-align-items: center; align-items: center; overflow: visible; -webkit-box-flex: 1; -ms-flex: 1; -webkit-box-orient: vertical; -moz-box-orient: vertical; -ms-flex-direction: column; -webkit-flex-direction: column; flex-direction: column; color: #929292; -webkit-flex-shrink: 1; -ms-flex: 0 1 auto; flex-shrink: 1; position: relative; white-space: nowrap; text-overflow: ellipsis; text-decoration: none; outline: 0; color: #8C8185; }\
              a#item { width: calc((100% - 32px) / 4); height: calc((100vw - 56px) / 4); border-radius: 16px; background:rgba(255,255,255,0.8) none repeat scroll; }\
              a#item:active { transform: scale(1.1); }\
              #label { margin: 4px 0 0; line-height: 1; display: block; letter-spacing: .01em; font-size: 11px; position: relative; text-overflow: ellipsis; white-space: nowrap; }\
              a#active { color: #FF6A00; }",
        xml: "<a id='item'>\
                <Icon id='dir'/>\
                <span id='label'/>\
              </a>",
        bnd: { name: {skey: "label"} },
        fun: function (sys, items, opts) {
			let online = 0;
			return Object.defineProperty({}, "online", {
			    get: () => {return online},
			    set: (value) => {
				    online = value;
				    sys.item[online ? "addClass" : "removeClass"]("#active");
			    }
			});
        }
    },
    Icon: {
        css: "#icon {width: 30px; height: 30px;}\
              #icon svg { fill: currentColor; width: 100%; height: 100%; display: block; vertical-align: middle; background-size: 100% auto; background-position: center; background-repeat: no-repeat; font-style: normal; position: relative; }",
        xml: "<div id='icon'>\
                <span id='span'/>\
              </div>",
        fun: function (sys, items, opts) {
            let tmp, icon = sys.span;
            function show(path) {
                icon = icon.replace(path);
            }
			return Object.defineProperty({}, "dir", {
			    get: () => {return tmp},
			    set: (value) => {
				    tmp = value;
					require([`/views/${tmp}/icon.js`], e => {
						let path = `//${tmp.split('/')[1]}/Icon`;
						show(xp.hasComponent(path) ? path : "/assets/Unknow");
					}, ()=> show("/assets/Unknow"));
			    }
			});
        }
    }
});

$_("content/about").imports({
    Content: {
        css: "#body { height: 100%; overflow-y: auto; display: -ms-flexbox; display: -webkit-flex; display: flex; flex-direction: column; justify-content: center; }\
              #logo { margin: 0 auto; width: 160px; border-radius: 10px; background: rgba(255,255,255,0.8) none repeat scroll; }\
              #body { margin: 0; box-sizing: border-box; }\
              #content > * { margin: 0 0 .5em; }\
              #title,#user,#version { text-align:center; margin-top: 5px; color: #333; }",
        xml: "<div id='body'>\
                <Logo id='logo' xmlns='/login'/>\
                <div id='title'>马蹄莲</div>\
                <div id='user'>当前用户：1001</div>\
                <div id='version'>版本号：1.1.7</div>\
                <Logout id='logout'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/ui/session", (e, p) => {
                sys.user.text(`当前用户：${p.username}`);
            }, -1);
        }
    },
    Icon: {
        map: { extend: {"from": "../index/header/Icon"} }
    },
    About: {
        map: { extend: {"from": "../footer/icon/About"} }
    },
    Logout: {
        xml: "<div class='list inset'>\
                <ul><li><a href='#' class='list-button item-link color-gray'>退出</a></li></ul>\
              </div>",
        fun: function (sys, items, opts) {
            let online = 0;
            this.watch("/stat/ui/1", e => online = 1);
            this.watch("/stat/ui/0", e => online = 0);
            this.on(Click, e => {
                if (online == 0)
                    this.trigger("message", ["msg", "当前系统离线，无法退出！"]);
                else app.dialog.confirm("确定退出系统吗？", "温馨提示", e => {
                    this.notify("/ui/logout");
                });
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
        map: { appendTo: "inner" }
    },
    TabItem: {
        css: "#tabitem { display: block; width: 100%; height: 100%; }\
              #tabitem > div { padding-top: 4px; padding-bottom: 4px; height: 100%; -webkit-box-pack: justify; -ms-flex-pack: justify; -webkit-justify-content: space-between; justify-content: space-between; width: 100%; box-sizing: border-box; display: -webkit-box; display: -ms-flexbox; display: -webkit-flex; display: flex; -webkit-box-pack: center; -ms-flex-pack: center; -webkit-justify-content: center; justify-content: center; -webkit-box-align: center; -ms-flex-align: center; -webkit-align-items: center; align-items: center; overflow: visible; -webkit-box-flex: 1; -ms-flex: 1; -webkit-box-orient: vertical; -moz-box-orient: vertical; -ms-flex-direction: column; -webkit-flex-direction: column; flex-direction: column; color: #929292; -webkit-flex-shrink: 1; -ms-flex: 0 1 auto; flex-shrink: 1; position: relative; white-space: nowrap; text-overflow: ellipsis; text-decoration: none; outline: 0; color: #8C8185; }\
              #label { margin: 0;line-height: 1; display: block; letter-spacing: .01em; font-size: 10px; position: relative; text-overflow: ellipsis; white-space: nowrap; }\
              #radio { display: none; } #radio:checked ~ div { color: #FF9501; }",
        xml: "<label id='tabitem'>\
                <input id='radio' type='radio' name='tabitem'/>\
                <div>\
                  <TabIcon id='icon'/>\
                  <span id='label'/>\
                </div>\
              </label>",
        map: { attrs: { icon: "id->icon", radio: "checked" }},
        fun: function (sys, items, opts) {
            sys.label.text(opts.label);
            return sys.radio;
        }
    },
    TabIcon: {
        css: "#icon { fill: currentColor; height: 30px; display: block; width: 30px; vertical-align: middle; background-size: 100% auto; background-position: center; background-repeat: no-repeat; font-style: normal; position: relative; }",
        xml: "<span id='icon'/>",
        opt: { icon: "Index" },
        fun: function (sys, items, opts) {
            sys.icon.replace("/assets/" + opts.icon).addClass("#icon");
        }
    }
});

$_("content/popup").imports({
    List: {
        css: "#list { height: 100%; -webkit-transition-duration: .3s; transition-duration: .3s; position: absolute; left: 0; bottom: 0; z-index: 13500; width: 100%; -webkit-transform: translate3d(0,100%,0); transform: translate3d(0,100%,0); max-height: 100%; -webkit-overflow-scrolling: touch; }\
              #overlay { z-index: auto; visibility: visible; opacity: 1; }\
              #menus { bottom: 0; position: absolute; width: 100%; }\
              #modal-in { -webkit-transform: translate3d(0,0,0); transform: translate3d(0,0,0);}",
        xml: "<div id='list'>\
                <Overlay id='overlay'/>\
                <div id='menus'>\
                   <Group id='group'/>\
                   <Cancel id='cancel'/>\
                </div>\
              </div>",
        map: { appendTo: "group" },
        fun: function (sys, items, opts) {
            let height, body = document.body;
            function show() {
                height = getComputedStyle(body, "").getPropertyValue("height");
                sys.group.css("max-height", `${parseFloat(height) - 81}px`);
                return sys.list.addClass("#modal-in");
            }
            function hide(e) {
                e && e.stopPropagation();
                return sys.list.removeClass("#modal-in");
            }
            sys.cancel.on(Click, hide);
            sys.overlay.on(Click, hide);
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
              #item label, #icon { display: block; width: 100%; height: 100%; position: absolute; top: 0; left: 0; }\
              #radio { display: none; } #radio:checked ~ div { background: no-repeat center; background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2013%2010'%3E%3Cpolygon%20fill%3D'%23007aff'%20points%3D'11.6%2C0%204.4%2C7.2%201.4%2C4.2%200%2C5.6%204.4%2C10%204.4%2C10%204.4%2C10%2013%2C1.4%20'%2F%3E%3C%2Fsvg%3E\"); -webkit-background-size: 13px 10px; background-size: 13px 10px; background-position: calc(100% - 15px) center; }",
        xml: "<div id='item'>\
                <span id='label'/>\
                <label>\
                    <input id='radio' type='radio'/>\
                    <div id='icon'/>\
                </label>\
              </div>",
        bnd: { name: {skey: "label"} },
        fun: function (sys, items, opts) {
            return sys.radio.attr("name", opts.key).elem();
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

$_("widget").imports({
	Applet: { 
		xml: "<div id='applet'/>",
		fun: function (sys, items, opts) {
			this.on("$popup/open", (e, target, content, scroll, sheet) => {
				e.stopPropagation();
				let elem = this.elem();
				target.css("z-index", elem.childNodes.length * 1000);
				elem.appendChild(target.elem());
				scrollToEl(content, scroll, sheet);
			});
			function scrollToEl(content, scroll, sheet) {
				let paddingTop = parseInt(content.css('padding-top'), 10);
				let paddingBottom = parseInt(content.css('padding-bottom'), 10);
				let pageHeight = content.elem().offsetHeight - paddingTop - parseInt(sheet.height(), 10);
				let pageScrollHeight = content.elem().scrollHeight - paddingTop - parseInt(sheet.height(), 10);
				let pageScroll = content.scrollTop();
				let newPaddingBottom;
				let scrollElTop = scroll.offset().top - paddingTop + scroll.elem().offsetHeight;
				if (scrollElTop > pageHeight) {
					let scrollTop = pageScroll + scrollElTop - pageHeight;
					if (scrollTop + pageHeight > pageScrollHeight) {
						newPaddingBottom = scrollTop + pageHeight - pageScrollHeight + paddingBottom;
						if (pageHeight === pageScrollHeight) {
							newPaddingBottom = sheet.height();
						}
						content.css("padding-bottom", `${newPaddingBottom}px`);
					}
					content.scrollTop(scrollTop);
				}
		    }
			this.on(Click, () => this.notify("$global/click"));
		}
	},
    Navbar: {
        css: "#navbar { display: flex; justify-content: space-between; align-items:center; position: relative; z-index: 2; height: 44px; box-sizing: border-box; padding: 0 10px; font-size: 17px; background: #f7f7f8; }\
              #navbar:after { content: ''; position: absolute; background-color: #c4c4c4; display: block; z-index: 15; top: auto; right: auto; bottom: 0; left: 0; height: 1px; width: 100%; transform-origin: 50% 100%; }\
              #navbar a:active { opacity: 0.5; }\
              #left { width: 60px; display: flex; fill: #007aff; }\
              #icon { display: flex; }\
              #icon svg { width: 24px; height: 24px; }\
              #title { display: inline-block; font-weight: 600; }\
              #right { width: 60px; text-align: right; }\
              #menu { height: 44px; line-height: 44px; margin-right: 4px; }",
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'>icon</a>\
                 </div>\
                 <div id='title'>title</div>\
                 <div id='right'>\
                    <a id='menu'>menu</a>\
                 </div>\
              </div>"
    },
	Content: {
		css: "#page { background: #efeff4; box-sizing: border-box; position: absolute; left: 0; top: 0; width: 100%; height: 100%; transform: translate3d(0,0,0); contain: layout size style; }\
		      #content { padding-top: 44px; overflow: auto; box-sizing: border-box; height: 100%; position: relative; z-index: 1; contain: layout size style; will-change: scroll-position; }",
		xml: "<div id='page'>\
		         <div id='content'/>\
		      </div>",
		map: { appendTo: "content" },
		fun: function (sys, items, opts) {
			this.on("$popup/open", (e, scrollEl, sheetEl, no) => {
				if (no) return;
				e.stopPropagation();
				this.trigger(e.type, [e.target, sys.content, scrollEl, sheetEl]);
			});
			this.on("$popup/close", (e) => {
				sys.content.css("padding-bottom", '');
			});
		}
	},
    Popup: {
        css: "#popup { display: none; position: absolute; left: 0; top: 0; width: 100%; height: 100%; }\
			  #mask { position: absolute; width: 100%; height: 100%; background: rgba(0,0,0,.3); visibility: hidden; opacity: 0; transition-duration: .4s; }\
              #mshow { visibility: visible; opacity: 1; }\
			  #content { position: absolute; width: 100%; height: 100%; transition-duration: .4s; transform: translate3d(0,100%,0); }\
			  #sheet { position: absolute; left: 0; bottom: 0; width: 100%; background: white; }",
        xml: "<div id='popup'>\
		         <div id='mask'/>\
		         <div id='content'>\
				   <div id='sheet'/>\
				 </div>\
		      </div>",
	    map: { msgscope: true, appendTo: "sheet" },
        fun: function (sys, items, opts) {
			sys.content.on(Click, e => {
				sys.sheet.contains(e.target.elem()) || hide();
			});
			function show() {
				sys.popup.show().trigger("$popup/open", sys.sheet);
				sys.mask.addClass("#mshow");
				sys.content.css("transform", "translate3d(0,0,0)");
			}
			let parent = this.elem().parentNode;
			function hide() {
				sys.mask.removeClass("#mshow");
				sys.content.css("transform", "translate3d(0,100%,0)");
				sys.content.once("transitionend", () => {
					parent.appendChild(sys.popup.elem());
					sys.popup.trigger("$popup/close").hide();
				});
			}
			return { show: show, hide: hide };
        } 
    },
	PopupPicker: {
		xml: "<div id='picker'>\
		        <Input id='input' xmlns='picker'/>\
				<Popup id='popup'/>\
		      </div>",
		map: { attrs: {input: "placeholder" }, appendTo: "popup" }, 
		opt: { updateOnTouchmove: true, formatValue: values => {return values.join(' ')} },
		fun: function (sys, items, opts) {
			let _values = [];
			let scrollValues = [];
			sys.input.on(Click, () => {
				items.popup.show();
				let picker = this.last().val();
				for (let i = 0; i < _values.length; i++) 
					picker.model[i].value = _values[i];
			});
			sys.popup.on("change", (e, col, values, onScroll) => {
				e.stopPropagation();
				scrollValues = values;
				if (onScroll && !opts.updateOnTouchmove) return;
				_values = values;
				sys.input.prop("value", opts.formatValue(values));
			});
			sys.popup.on("close", (e) => {
				e.stopPropagation();
				items.popup.hide();
			});
			sys.popup.on("confirm", (e) => {
				e.stopPropagation();
				_values = scrollValues;
				sys.input.prop("value", opts.formatValue(scrollValues));
			});
			sys.popup.on("$popup/open", (e, sheet, no) => {
				if (no) return;
				e.stopPropagation();
				sys.popup.trigger("$popup/open", [sys.input, sheet]);
			});
		}
	},
    ViewStack: {
        css: "#viewstack { position: relative; }\
              #viewstack > * { position: absolute; width: 100%; height: 100%; transition-duration: .3s; transform: translate3d(100%,0,0); }",
        xml: "<div id='viewstack'/>",
        fun: function (sys, items, opts) {
            let kids = this.kids().hash();
            let stack = [kids[opts.index] || this.first()]; 
            stack.length && stack[0].css("transform", "translate3d(0,0,0)");
            // "to" is element name of target.
            this.on("goto", function (e, to) {
                e.stopPropagation();
                let last = stack[stack.length - 1];
                if (!kids[to] || kids[to] == last) return;
                last.css("transform", "translate3d(-100%,0,0)");
                stack.push(kids[to]);
                kids[to].css("transform", "translate3d(0,0,0)");
				let args = [].slice.call(arguments).slice(2);
				kids[to].once("transitionend", (e) => {
				    kids[to].trigger("show", [last+''].concat(args), false);
				});
				kids[to].css("transition-duration") == "0s" && kids[to].trigger("transitionend", [], false);
            });
            this.on("back", function (e) {
                e.stopPropagation();
                if (stack.length <= 1) return;
                let old = stack.pop();
                old && old.css("transform", "translate3d(100%,0,0)");
                let cur = stack[stack.length - 1];
                cur.css("transform", "translate3d(0,0,0)");
				let args = [].slice.call(arguments).slice(1);
				cur.once("transitionend", (e) => {
				    cur.trigger("show", [old+''].concat(args), false);
				});
				cur.css("transition-duration") == "0s" && cur.trigger("transitionend", [], false);
            });
        }
    }
});

$_("widget/picker").imports({
	Picker: {
		css: "#picker { display: flex; overflow: hidden; justify-content: center; padding: 0; text-align: right; height: 200px; position: relative; -webkit-mask-box-image: linear-gradient(to top,transparent,transparent 5%,white 20%,white 80%,transparent 95%,transparent); font-size: 20px; }\
		      #highlight { z-index: 1000; height: 36px; box-sizing: border-box; position: absolute; left: 16px; right: 16px; top: 50%; margin-top: calc(-1 * 36px / 2); pointer-events: none; background-color: rgba(0, 0, 0, 0.12); border-radius: 8px; }",
		xml: "<div id='picker'>\
		        <Renderer id='renderer'/>\
				<div id='highlight'/>\
		      </div>",
		fun: function (sys, items, opts) {
			let proxy = sys.renderer.bind([]);
			sys.picker.on("#change", "./*", function (e, value, onScroll) { 
				e.stopPropagation();
				let kids = sys.picker.kids();
				let values = [];
				for (let i = 0; i < kids.length - 2; i++)
					values.push(kids[i].val().value);
				this.trigger("change", [kids.indexOf(this), values, onScroll]);
			});
			return proxy;
		}
	},
	Renderer: {
		xml: "<div id='renderer'/>",
		bnd: { textAlign: { skey: "value" } },
		fun: function (sys, items, opts) {
			this.on("beforeBind", (e, value) => {
				e.stopPropagation();
				if (e.target != this) return;
				let render = value.divider ? "<Divider id='value'/>" : "<Column id='value'><Item id='values'/></Column>"
				render = sys('//*')[0].replace(render);
			});
			return Object.defineProperty({}, "value", {
				get: () => {return items.value.value;} 
			});
		}
	},
	Column: {
		css: "#column { overflow: visible; position: relative; max-height: 100%; transform-style: preserve-3d; }\
		      #items { text-align: center; transform-style: preserve-3d; overflow: auto; scrollbar-width: none; scroll-snap-type: y mandatory; height: 100%; box-sizing: border-box; padding: 82px 0px; }\
			  #items::-webkit-scrollbar { display: none; opacity: 0; }\
			  div#selected { color: black; transform: translate3d(0,0,0) rotateX(0deg); }",
		xml: "<div id='column'>\
		        <div id='items'/>\
		      </div>",
		map: { appendTo: "items" },
		fun: function (sys, items, opts) {
			let object = {};
			let selected, that = this;
			function updateItems(activeIndex, scrollTop, onScroll) {
				if (typeof scrollTop === 'undefined') {
				    scrollTop = sys.items.elem().scrollTop;
				}
				let itemHeight = that.get(0).elem().offsetHeight;
				if (typeof activeIndex === 'undefined') {
				    activeIndex = Math.round(scrollTop / itemHeight);
				}
				let items = that.kids();
				if (activeIndex < 0) activeIndex = 0;
				if (activeIndex >= items.length) activeIndex = items.length - 1;
				if (items[activeIndex] == selected) return;
				selected && selected.removeClass("#selected", sys.items);
				selected = items[activeIndex];
				selected.addClass("#selected", sys.items);
				selected.trigger("#change", [selected.val()(), onScroll]);
			}
			this.on("click", "./*", function (e) {
				let itemHeight = that.get(0).elem().offsetHeight;
				let newActiveIndex = that.kids().indexOf(this);
				let newScrollTop = newActiveIndex * itemHeight;
				sys.items.elem().scrollTop = newScrollTop;
				updateItems(newActiveIndex, newScrollTop, true);
			});
			sys.items.elem().addEventListener("scroll", () => {
				updateItems(undefined, undefined, true);
			});
			function setValue(newValue) {
				xp.each(that.kids(), (index, item) => {
					if (item.val()() != newValue) return;
					let itemHeight = that.get(0).elem().offsetHeight;
					let scrollTop = index * itemHeight;
					sys.items.elem().scrollTop = scrollTop;
					updateItems(index, scrollTop);
					return false;
				});
			}
			Object.defineProperty(object, "value", {
			    get: () => {
					return selected && selected.val()();
				},
			    set: setValue
			});
			return Object.defineProperty(object, "textAlign", {
			    get: () => {
					return sys.items.css("text-align");
				},
			    set: value => sys.items.css("text-align", value)
			});
		}
	},
	Divider: {
		css: "#divider { overflow: visible; position: relative; max-height: 100%; display: flex; align-items: center; color: black; }",
		xml: "<div id='divider'/>",
		fun: function (sys, items, opts) {
			return Object.defineProperty({}, "value", { 
			    get: () => {
					return sys.divider.text();
				},
			    set: value => sys.divider.text(value)
			});
		}
	},
	Item: {
		css: "#item { perspective: 1200px; overflow: visible; transform-style: preserve-3d; height: 36px; line-height: 36px; white-space: nowrap; position: relative; overflow: hidden; text-overflow: ellipsis; left: 0; top: 0; width: 100%; box-sizing: border-box; color: rgba(0, 0, 0, 0.45); cursor: pointer; scroll-snap-align: center; }\
		      #model { padding: 0 10px; -webkit-backface-visibility: hidden; backface-visibility: hidden; display: block; transform-style: preserve-3d; position: relative; overflow: hidden; text-overflow: ellipsis; box-sizing: border-box; max-width: 100%; transform-origin: center center -100px; }",
		xml: "<div id='item'>\
		        <span id='model'/>\
		      </div>",
		fun: function (sys, items, opts) {
			return sys.model.text;
		}
	},
    Navbar: {
        map: { extend: { "from": "../Navbar" } },
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'><Close xmlns='//miot/assets'/></a>\
                 </div>\
                 <div id='title'>Picker</div>\
                 <div id='right'>\
                    <a id='menu'>确定</a>\
                 </div>\
              </div>",
        fun: function (sys, items, opts) { 
		    sys.title.text(opts.title || "Picker");
            sys.icon.on(Click, e => this.trigger("close"));
            sys.menu.on(Click, () => this.trigger("confirm").trigger("close"));
        }
    },
	Input: {
		css: "#input { width: 100%; height: 46px; padding: 0 16px; margin: 0px; display: block; font-size: 17px; box-sizing: border-box; border: 1px solid #C7C7C7; border-left: none; border-right: none;}",
		xml: "<input id='input' readonly='true'/>",
		map: { attrs: {input: "placeholder"} }
	}
});

$_("assets").imports({
    Area: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                <path d='M309.474912 719.986985c26.89658 0 48.695049-21.798469 48.695049-48.646953l-49.715285-264.667915c0-26.920116-21.798469-48.767703-48.695049-48.767703L136.249639 357.904413c-26.89658 0-48.646953 21.847587-48.646953 48.767703l49.715285 264.667915c0 26.848485 21.750373 48.646953 48.646953 48.646953L309.474912 719.986985z' p-id='6348'></path><path d='M591.985194 719.986985c26.89658 0 48.646953-21.798469 48.646953-48.646953l49.714262-476.756311c0-26.89658-21.750373-48.719608-48.646953-48.719608L418.711825 145.864112c-26.847461 0-48.744167 21.823028-48.744167 48.719608l49.715285 476.756311c0 26.848485 21.895683 48.646953 48.743144 48.646953L591.985194 719.986985z' p-id='6349'></path><path d='M874.446357 719.986985c26.89658 0 48.744167-21.798469 48.744167-48.646953L923.190525 547.709293c0-26.921139-21.847587-48.743144-48.744167-48.743144l-73.844845 0c-26.846438 0-35.634592 15.730263-48.694025 48.743144l-49.715285 123.630738c0 26.848485 21.847587 48.646953 48.695049 48.646953L874.446357 719.986985z' p-id='6350'></path><path d='M913.139611 773.779122 146.930909 773.779122c-12.720719 0-23.206538 10.414187-23.206538 23.231097 0 12.792351 18.157545 53.550637 30.974455 53.550637l758.440785-30.271444c12.769838 0 23.25668-10.486842 23.25668-23.279193C936.395268 784.193309 925.908426 773.779122 913.139611 773.779122z'/>\
              </svg>"
    },
    Home: {
        xml: "<svg width='48' height='48' viewBox='0 0 1024 1024'>\
                <path d='M949.082218 519.343245 508.704442 107.590414 68.326667 518.133697c-8.615215 8.03193-9.096169 21.538549-1.043772 30.144554 8.043187 8.599865 21.566178 9.085936 30.175253 1.035586l411.214573-383.337665 411.232992 384.505257c4.125971 3.854794 9.363252 5.760191 14.5903 5.760191 5.690606 0 11.384281-2.260483 15.58393-6.757914C958.138478 540.883841 957.695387 527.388479 949.082218 519.343245L949.082218 519.343245zM949.082218 519.343245M814.699602 527.800871c-11.787464 0-21.349237 9.555633-21.349237 21.327748l0 327.037405L622.552373 876.166023 622.552373 648.662543 394.824789 648.662543l0 227.503481L224.032938 876.166023 224.032938 549.128619c0-11.772115-9.55154-21.327748-21.348214-21.327748-11.802814 0-21.35333 9.555633-21.35333 21.327748l0 369.691877 256.19494 0L437.526333 691.318038l142.329613 0 0 227.502457 256.1888 0L836.044746 549.128619C836.045769 537.356504 826.481949 527.800871 814.699602 527.800871L814.699602 527.800871zM814.699602 527.800871M665.254941 222.095307l128.095423 0 0 113.74867c0 11.789511 9.562796 21.332864 21.349237 21.332864 11.783371 0 21.346167-9.543354 21.346167-21.332864L836.045769 179.439812 665.254941 179.439812c-11.789511 0-21.35333 9.538237-21.35333 21.327748C643.900587 212.554 653.464407 222.095307 665.254941 222.095307L665.254941 222.095307zM665.254941 222.095307'/>\
              </svg>",
    },
    About: {
        xml: "<svg width='48' height='48' viewBox='0 0 1024 1024'>\
                <path d='M507.577907 23.272727C240.142852 23.272727 23.272727 239.870837 23.272727 507.094323 23.272727 774.535126 240.153546 991.375225 507.577907 991.375225 775.101356 991.375225 991.883087 774.596878 991.883087 507.094323 991.883087 239.824352 775.104293 23.272727 507.577907 23.272727ZM507.577907 69.818182C749.408866 69.818182 945.337633 265.541628 945.337633 507.094323 945.337633 748.890368 749.395172 944.82977 507.577907 944.82977 265.857934 944.82977 69.818182 748.826829 69.818182 507.094323 69.818182 265.590268 265.836128 69.818182 507.577907 69.818182ZM460.17174 368.061568 555.443661 368.061568 555.443661 763.664179 460.17174 763.664179 460.17174 368.061568ZM507.761743 230.268948C534.095946 230.268948 555.397702 251.580874 555.397702 277.899264 555.397702 304.171723 534.072967 325.506614 507.761743 325.506614 481.450515 325.506614 460.17174 304.171723 460.17174 277.899264 460.17174 251.580874 481.450515 230.268948 507.761743 230.268948Z'/>\
              </svg>"
    },
    Unknow: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                  <path d='M797.75744 438.02624c-11.07968 0-21.95456 0.8192-32.72704 2.56 2.2528-13.6192 3.62496-27.36128 3.62496-41.69728 0-146.47296-118.6816-265.3184-265.29792-265.3184-142.56128 0-258.62144 112.78336-264.62208 254.03392C105.6768 394.38336 0 503.99232 0 638.64832c0 139.10016 112.68096 251.76064 251.82208 251.76064h545.93536C922.64448 890.40896 1024 789.13536 1024 664.18688c0-124.88704-101.35552-226.16064-226.24256-226.16064zM510.27968 808.38656c-22.69184 0-41.14432-18.06336-41.14432-40.30464 0-22.24128 18.39104-40.30464 41.14432-40.30464 22.67136 0 41.14432 18.06336 41.14432 40.30464-0.02048 22.24128-18.41152 40.30464-41.14432 40.30464z m110.46912-228.0448c-8.06912 12.6976-25.1904 29.92128-51.44576 51.77344-13.57824 11.28448-22.03648 20.3776-25.31328 27.29984-3.2768 6.8608-4.8128 19.16928-4.48512 36.90496h-58.5728c-0.12288-8.3968-0.24576-13.5168-0.24576-15.38048 0-18.96448 3.13344-34.52928 9.4208-46.77632 6.26688-12.24704 18.8416-26.0096 37.62176-41.2672 18.78016-15.31904 30.04416-25.31328 33.71008-30.04416 5.632-7.49568 8.51968-15.7696 8.51968-24.73984 0-12.4928-5.05856-23.18336-15.0528-32.1536-9.99424-8.9088-23.57248-13.39392-40.57088-13.39392-16.40448 0-30.12608 4.68992-41.14432 13.96736-11.01824 9.29792-20.50048 29.7984-22.75328 42.496-2.10944 11.9808-59.84256 17.03936-59.14624-7.24992 0.69632-24.28928 13.33248-50.62656 34.97984-69.71392 21.66784-19.08736 50.11456-28.65152 85.2992-28.65152 37.04832 0 66.4576 9.68704 88.3712 29.02016 21.9136 19.3536 32.80896 41.84064 32.80896 67.54304a74.07616 74.07616 0 0 1-12.00128 40.36608z'/>\
              </svg>"
    },
    Close: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                <path id='path' d='M556.8 512L832 236.8c12.8-12.8 12.8-32 0-44.8-12.8-12.8-32-12.8-44.8 0L512 467.2l-275.2-277.333333c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8l275.2 277.333333-277.333333 275.2c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 14.933333 8.533333 23.466666 8.533333s17.066667-2.133333 23.466667-8.533333L512 556.8 787.2 832c6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466666-8.533333c12.8-12.8 12.8-32 0-44.8L556.8 512z'/>\
              </svg>"
    },
    Backward: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                <path d='M398.64 512l271.53 271.529c16.662 16.662 16.662 43.677 0 60.34-16.662 16.662-43.678 16.662-60.34 0l-301.699-301.7c-16.662-16.661-16.662-43.677 0-60.339l301.7-301.699c16.661-16.662 43.677-16.662 60.339 0 16.662 16.663 16.662 43.678 0 60.34L398.64 512z'/>\
              </svg>"
    }
});

});
