/*!
 * spa.js v1.0.9
 * https://github.com/qudou/miot
 * (c) 2017-2022 qudou
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
              #index > * { width: 100%; height: 100%; }\
              .toast-text { width:100%; text-align: center;}",
        xml: "<ViewStack id='index'>\
                <Verify id='verify'/>\
                <Login id='login'/>\
                <Service id='service'/>\
                <Content id='content'/>\
              </ViewStack>",
        fun: function(sys, items, opts) {
            let toast;
            this.on("message", (e, t, msg) => {
                toast && toast.close();
                window.app.toast.destroy(toast);
                toast = window.app.toast.create({ text: msg, position: 'top', closeTimeout: 3000});
                toast.open();
            });
            const uid = "5ab6f0a1-e2b5-4390-80ae-3adf2b4ffd40";
            this.watch("message", (e, p) => {
                this.notify(p.topic, [p.data]);
            });
            let q = xp.create("//miot/Query");
            this.watch("subscribed", () => {
                this.notify("publish", [uid, {topic: "/ui/spa", body: {id: q.app}}])
            });
            this.watch("/ui/session", (e, p) => {
                localStorage.setItem("session", p.session);
                localStorage.setItem("username", p.username);
            });
        }
    },
    Verify: {
        xml: "<Overlay id='verify' xmlns='mask'/>",
        fun: function (sys, items, opts) {
            let q = xp.create("//miot/Query");
            let sid = q.sid || localStorage.getItem("session");
            setTimeout(e => {
                this.trigger("switch", sid ? ["service", {username: sid}] : "login");
            }, 0);
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
    Service: {
        css: "#service { visibility: visible; opacity: 1; }",
        xml: "<Overlay id='service' xmlns='mask'/>",
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
                    this.trigger("switch", "content").notify("/stat/ui/1");
                });
                client.on("message", (topic, p) => {
                    this.notify("message", JSON.parse(p.toString()));
                });
                client.on("close", e => this.notify("/stat/ui/0"));
                client.on("error", e => {
                    this.trigger("message", ["error", e.message]);
                    e.message == "Bad username or password" && this.notify("/ui/logout");
                });
            });
            this.watch("/ui/logout", (e, p) => {
                client.end();
                localStorage.clear();
                this.trigger("switch", "login");
            });
            this.watch("publish", (e, topic, p = {}) => {
                client.publish(topic, JSON.stringify(p));
            });
        }
    },
    Content: {
        css: "#content { width: 100%; height: 100%; box-sizing: border-box; -webkit-overflow-scrolling: touch; }\
              #content > * { width: 100%; height: 100%; }",
        xml: "<div id='content' xmlns:i='mask'>\
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
                items.mask.hide();
                loaded(sys.mask.before(applet, app));
            }
            function loaded(page) {
                if (opts.online == 0)
                    return items.info.show("设备已离线-[00]");
                items.info.hide();
                page.notify(`//${opts.view}`);          
            }
            this.watch("/ui/spa", (e, app) => {
                opts = app;
                let page = sys.mask.prev();
                page ? loaded(page) : require([`/views/${opts.view}/index.js`], () => load(opts), () => {
                    items.mask.hide();
                    this.trigger("message", ["error", "应用打开失败，请稍后再试！"]);
                });
            });
            this.watch("/stat/app", (e, p) => {
                let app = sys.mask.prev();
                if (app && opts.mid == p.mid) {
                    if (p.data == 0)
                        return items.info.show("设备已离线-[01]");
                    items.info.hide();
                    app.notify(`//${opts.view}`);
                }
            });
            this.watch("/stat/link", (e, p) => {
                if (opts.link == p.mid && p.data == 0)
                    items.info.show("设备已离线-[02]");
            });
            this.watch("/stat/ui/0", () => {
                items.info.show("设备已离线-[03]");
            });
        }
    },
    ViewStack: {
        xml: "<div id='viewstack'/>",
        fun: function (sys, items, opts) {
            var args, kids = this.kids(),
                table = kids.call("hide").hash(),
                ptr = table[opts.index] || kids[0];
            if (ptr) ptr = ptr.trigger("show").show();
            this.on("switch", function (e, to) {
                e.stopPropagation();
                table = this.kids().hash();
                if (!table[to] || table[to] == ptr) return;
                args = [].slice.call(arguments).slice(2);
                ptr.trigger("hide", [to+''].concat(args)).hide();
                ptr = table[to].trigger("show", [ptr+''].concat(args)).show();
            });
            this.on("show", e => e.stopPropagation());
            this.on("hide", e => e.stopPropagation());
        }
    },
    Query: {
        xml: "<div id='query'/>",
        fun: function (sys, items, opts) {
            let str = location.search.substr(1).split('&');
            let query = {};
            str.forEach(pair => {
                let p = pair.split('=');
                query[p[0]] = p[1]; 
            });
            return query;
        }
    }
});

$_("mask").imports({ 
    Overlay: {
        css: "#overlay { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,.4); z-index: 13000; visibility: hidden; opacity: 0; -webkit-transition-duration: .4s; transition-duration: .4s; }\
              #visible { visibility: visible; opacity: 1; }",
        xml: "<div id='overlay'>\
                <Loader id='info'/>\
              </div>",
        fun: function (sys, items, opts) {
            function show(text) {
                sys.overlay.addClass("#visible");
                text && sys.info.text(text);
            }
            function hide() {
                sys.overlay.removeClass("#visible");
            }
            return { show: show, hide: hide };
        }
    },
    Message: {
        css: "#info { position: absolute; top: 50%; width: 100%; padding: 8px; box-sizing: border-box; color: white; text-align: center; background: rgba(0, 0, 0, 0.4); border-radius: 5px; }",
        xml: "<div id='overlay'>\
                <div id='info'/>\
              </div>",
        map: { extend: { from: "Overlay" } },

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
                this.trigger("switch", ["service", {username: o.name, password: o.pass}])
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

});