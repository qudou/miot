/*!
 * miot.js v1.0.10
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const uid = "5ab6f0a1-e2b5-4390-80ae-3adf2b4ffd40";
const Click = 'ontouchend' in document.documentElement === true ? "touchend" : "click";
const Server = document.querySelector("meta[name='mqtt-server']").getAttribute("content");

xmlplus("miot", (xp, $_) => {

$_().imports({
    Index: {
        css: "* { user-select: none; -webkit-tap-highlight-color: transparent; }\
              input { user-select: text; } \
              html, body, #index { width: 100%; height: 100%; margin: 0; padding: 0; font-size: 100%; overflow: hidden; }\
              #index { background: url(/img/background.jpg) no-repeat; background-size: 100% 100%; }\
              #stack, #mask { width: 100%; height: 100%; }\
              #stack > * { transition-duration: 0s; }",
        xml: "<div id='index' xmlns:i='//xp'>\
                  <i:ViewStack id='stack'>\
                    <Applet id='applet'/>\
                    <Login id='login'/>\
                  </i:ViewStack>\
                  <Preload id='mask' xmlns='//xp/preload'/>\
                  <i:Toast id='toast'/>\
              </div>",
        fun: function(sys, items, opts) {
            let client;
            let query = xp.create("//miot/Query");
            this.on("connect", function (e, cfg) {
                items.mask.show();
                client = mqtt.connect(Server, cfg);
                client.on("connect", function (e) {
                    client.subscribe(client.options.clientId, err => {
                        if (err) throw err;
                        let p = {topic: "/ui/spa", body: {id: query.app}};
                        sys.applet.trigger("publish", [p, uid])
                        items.mask.hide();
                    });
                    sys.applet.notify("/stat/ui/1").trigger("goto", "applet");
                    console.log("connected to " + Server);
                });
                client.on("message", (topic, p) => {
                    p = JSON.parse(p.toString());
                    sys.applet.notify(p.topic, [p.data]);
                });
                client.on("error", (e) => {
                    items.mask.hide();
                    sys.index.trigger("message", ["error", e.message]);
                    if (e.message == "Connection refused: Bad username or password")
                         sys.applet.trigger("/ui/logout");
                });
                client.on("close", () => sys.applet.notify("/stat/ui/0"));
            });
            sys.applet.on("publish", (e, p = {}, topic = uid) => {
                client.publish(topic, JSON.stringify(p));
            });
            sys.applet.on("/ui/logout", (e) => {
                client.end();
                localStorage.clear();
                sys.stack.trigger("goto", "login");
            });
            let sid = query.sid || localStorage.getItem("session");
            setTimeout(() => {
                sid ? this.trigger("connect", {username: sid}) : sys.stack.trigger("goto", "login");
            }, 0);
            this.on("message", (e, t, msg) => items.toast.open(msg));
        }
    },
    Login: {
        css: "#logo { margin: 60px auto 25px; display: block; width: 50%; height: auto; background: white; }\
              #button { margin: 35px 0; }",
        xml: "<Content xmlns='//xp' xmlns:i='login'>\
                <i:Logo id='logo'/>\
                <i:Form id='login'>\
                  <i:User id='user'/>\
                  <i:Pass id='pass'/>\
                </i:Form>\
                <Button id='submit' xmlns='//xp/form'>登　录</Button>\
              </Content>",
        fun: function (sys, items, opts) {
            function keypress(e) {
                e.which == 13 && sys.submit.trigger(Click);
            }
            sys.user.on("keypress", keypress);
            sys.pass.on("keypress", keypress);
            sys.pass.watch("next", (e, o) => {
                this.trigger("connect", {username: o.name, password: o.pass});
            });
            this.watch("#/view/ready", () => items.user.focus());
            sys.submit.on(Click, () => sys.login.notify("next", {}));
        }
    },
    Applet: {
        css: "#applet { width: 100%; height: 100%; box-sizing: border-box; position: absolute; left: 0; bottom: 0; z-index: 13500; width: 100%; max-height: 100%; -webkit-overflow-scrolling: touch; }\
              #applet > * { width: 100%; height: 100%; }",
        xml: "<div id='applet'>\
                <Preload id='mask' xmlns='//xp/preload'/>\
                <Message id='info'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("publish", (e, topic, body) => {
                if (e.target == this) return;
                e.stopPropagation();
                this.trigger("publish", [{topic: topic, body: body}, opts.mid]);
            });
            this.watch("/ui/app", (e, p) => {
                let app = sys.mask.prev();
                if (app && opts.mid == p.mid)
                    view.elem().nodeName == "IFRAME" ? view.notify("message", app) : view.notify(app.topic, [app.data]);
            });
            function load(app) {
                let applet = `//${app.view}/Index`;
                let c = xp.hasComponent(applet);
                if (!c) return setTimeout(i=>load(app), 10);
                c.map.msgFilter = /[^]*/;
                sys.mask.before(applet, app);
                items.mask.hide();
                sys.mask.prev().notify(`//${opts.view}`);
            }
            function loaded(page) {
                if (opts.online == 0)
                    return items.info.show("应用已离线-[00]");
                items.info.hide();
                page.notify(`//${opts.view}`);          
            }
            this.watch("/ui/spa", (e, app) => {
                if (app == null)
                    return items.info.show("应用不存在或未授权！");
                opts = app;
                let page = sys.mask.prev();
                if (page) return loaded(page);
                items.mask.show();
                let dir = app.type ? "usr" : "sys";
                require([`/views/${dir}/${app.view}/index.js`], () => load(app), () => {
                    items.mask.hide();
                    this.trigger("message", ["error", "应用打开失败，请稍后再试！"]);
                });
            });
            this.watch("/stat/app", (e, p) => {
                let app = sys.mask.prev();
                if (app && opts.mid == p.mid)　{
                    if (p.data == 0)
                        return items.info.show("应用已离线-[01]");
                    items.info.hide();
                    app.notify(`//${opts.view}`);
                }
            });
            this.watch("/stat/link", (e, p) => {
                let app = sys.mask.prev();
                if (app && opts.link == p.mid && p.data == 0)
                    items.info.show("应用已离线-[02]");
            });
            this.watch("/stat/ui/0", () => {
                let app = sys.mask.prev();
                app && items.info.show("应用已离线-[03]");
            });
            this.on("close", (e) => {
                e.stopPropagation();
                if (confirm("确定退出系统吗？")) {
                    items.info.hide();
                    sys.mask.trigger("/ui/logout").prev().remove();
                }
            });
            this.watch("/ui/session", (e, p) => {
                localStorage.setItem("session", p.session);
                localStorage.setItem("username", p.username);
            });
        }
    },
    Message: {
        css: "#info { position: absolute; top: 50%; width: 100%; padding: 8px; box-sizing: border-box; color: white; text-align: center; background: rgba(0, 0, 0, 0.4); border-radius: 5px; }\
              #close { fill: #007aff; width: 22px; height: 22px; margin-bottom: -6px; }",
        xml: "<div id='preload'>\
                <div id='info'>\
                    <span id='label'/>\
                    <a href='#'>\
                      <Close id='close' xmlns='//xp/assets'/>\
                    </a>\
                </div>\
              </div>",
        map: { extend: { from: "//xp/preload/Preload", fun: 'r' } },
        fun: function (sys, items, opts) {
            sys.close.on(Click, () => this.trigger("close")); 
            function show(label) {
                sys.label.text(label);
                sys.preload.addClass("#visible");
            }
            function hide() {
                sys.preload.removeClass("#visible");
            }
            return { show: show, hide: hide };
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

$_("login").imports({
    Form: {
        xml: "<List id='form' xmlns='//xp/list'/>",
        map: { msgFilter: /next/ },
        fun: function (sys, items, opts) {
            this.on("error", (e, el, msg) => {
                e.stopPropagation();
                el.stopImmediateNotification();
                el.currentTarget.val().focus();
                this.trigger("message", ["error", msg]);
            });
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
            this.watch("next", (e, p) => {
                p.name = items.user.value;
                if (p.name === "") {
                    this.trigger("error", [e, "请输入用户名"]);
                } else if (p.name.length < 4) {
                    this.trigger("error", [e, "用户名至少需要4个字符"]);
                } else if (!patt.test(p.name)) {
                    this.trigger("error", [e, "您输入的用户名有误"]);
                }
            });
            return items.user;
        }
    },
    Pass: {
        xml: "<Input id='pass' icon='password' placeholder='密　码' type='password' maxlength='16'/>",
        fun: function (sys, items, opts) {
            this.watch("next", (e, o) => {
                o.pass = items.pass.value;
                if ( o.pass === "" ) {
                    this.trigger("error", [e, "请输入密码"]);
                } else if ( o.pass.length < 6 ) {
                    this.trigger("error", [e, "密码至少需要6个字符"]);
                }
            });
            return items.pass;
        }
    },
    Input: {
        css: ".ios .list .item-inner:after {width: calc(100% - 15px);}",
        xml: "<i:ListItem id='input' xmlns:i='//xp/list'>\
                <i:Content>\
                   <i:Media><i id='icon'/></i:Media>\
                   <i:Inner id='inner' media='true'>\
                      <i:Title id='label'/>\
                      <Input id='input' xmlns='//xp/form'/>\
                   </i:Inner>\
                </i:Content>\
              </i:ListItem>",
        map: { attrs: { input: "name value type maxlength placeholder" } },
        fun: function (sys, items, opts) {
            sys.icon.replace(`//xp/assets/${opts.icon}`);
            return items.input.elem();
        }
    }
});

});