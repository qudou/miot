/*!
 * miot.js v1.2.01
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const uid = "5ab6f0a1-e2b5-4390-80ae-3adf2b4ffd40";
const Click = 'ontouchend' in document.documentElement === true ? "touchend" : "click";
const Server = document.querySelector("meta[name='mqtt-server']").getAttribute("content");

xmlplus.debug = false;

xmlplus("miot", (xp, $_) => {

$_().imports({
    Index: {
        css: "* { user-select: none; -webkit-tap-highlight-color: transparent; }\
              input { user-select: text; } \
              html, body, #index { width: 100%; height: 100%; margin: 0; padding: 0; font-size: 100%; overflow: hidden; }\
              #index { background: url(/img/background.jpg) no-repeat; background-size: 100% 100%; }\
              #stack, #mask { width: 100%; height: 100%; }\
              #stack > * { transition-duration: 0s; }\
              .dialog { border: 1px solid #CACDD1; }",
        xml: "<i:Applet id='index' xmlns:i='//xp'>\
                  <i:ViewStack id='stack'>\
                    <Content id='content'/>\
                    <Login id='login'/>\
                  </i:ViewStack>\
                  <Preload id='mask' xmlns='//xp/preload'/>\
                  <Toast id='toast' xmlns='//xp'/>\
              </i:Applet>",
        fun: function(sys, items, opts) {
            let client;
            this.on("connect", function (e, cfg) {
                items.mask.show();
                client = mqtt.connect(Server, cfg);
                client.on("connect", function (e) {
                    client.subscribe(client.options.clientId, err => {
                        if (err) throw err;
                        sys.content.trigger("publish", {topic: "/ui/areas"});
                        items.mask.hide();
                    });
                    sys.content.notify("/stat/ui/1");
                    localStorage.setItem("online", 1);
                    sys.stack.trigger("goto", "content");
                    console.log("connected to " + Server);
                });
                client.on("message", function (topic, p) {
                    p = JSON.parse(p.toString());
                    sys.content.notify(p.topic, [p.data]);
                });
                client.on("close", function (e) {
                    sys.content.notify("/stat/ui/0");
                    localStorage.setItem("online", 0);
                });
                client.on("error", function (e) {
                    items.mask.hide();
                    sys.index.trigger("message", ["error", e.message]);
                    if (e.message == "Connection refused: Bad username or password") {
                         sys.content.trigger("/ui/logout");
                    }
                });
            });
            sys.content.on("publish", (e, p = {}, topic = uid) => {
                client.publish(topic, JSON.stringify(p));
            });
            sys.content.on("/ui/logout", (e) => {
                client.end();
                localStorage.clear();
                sys.stack.trigger("goto", "login");
            });
            let session = localStorage.getItem("session");
            setTimeout(() => {
                session ? this.trigger("connect", {username: session}) : sys.stack.trigger("goto", "login");
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
    Content: {
        css: "#stack, #applet, #stack > * { width: 100%; height: 100%; box-sizing: border-box;}",
        xml: "<div id='content' xmlns:i='content' xmlns:j='//xp'>\
                <j:ViewStack id='stack'>\
                    <i:Index id='home'/>\
                    <i:About id='about'/>\
                </j:ViewStack>\
                <i:Footer id='footer'/>\
                <i:Popup id='popup'/>\
                <i:Applet id='applet'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("/popup/open", (e, key, values) => {
                e.stopPropagation();
                if (localStorage.getItem("online") == 1)
                    sys.popup.notify(e.type, [key, values]);
            });
            sys.home.on("/applet/open", (e, p) => {
                e.stopPropagation();
                sys.applet.notify("/applet/open", p);
            });
            sys.footer.on("switch", (e, page) => {
                e.stopPropagation();
                sys.stack.trigger(page == "home" ? "back" : "goto", page);
            });
            sys.popup.on("/area/open", (e, p) => {
                e.stopPropagation();
                sys.home.notify(e.type, p);
            });
            sys.popup.on("/link/open", (e, p) => {
                e.stopPropagation();
                sys.home.notify(e.type, p);
            });
            this.watch("/ui/session", (e, p) => {
                localStorage.setItem("session", p.session);
                localStorage.setItem("username", p.username);
            });
            this.watch("#/view/ready", () => items.footer.changePage("home"));
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

$_("content").imports({
    Index: {
        css: "#index { padding: 12px; }\
              #apps { max-height: calc(100% - 130px); overflow: hidden; }",
        xml: "<div id='index' xmlns:i='index'>\
                <i:Head id='head'/>\
                <i:Title id='title'/>\
                <i:Apps id='apps'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("/ui/links", (e, p) => {
                e.stopPropagation();
                sys.index.notify(e.type, [p]);
            });
        }
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
            function changePage(page) {
                sys[page].trigger(Click);
                items[page].prop("checked", "true");
            }
            return { changePage: changePage };
        }
    },
    Popup: {
        xml: `<Popup id='popup' xmlns='//xp'>
                <i:List id='list' xmlns:i='popup'>\
                   <i:Item id='render' key='${xp.guid()}'/>\
                </i:List>
              </Popup>`,
        fun: function (sys, items, opts) {
            let key, buf = [];
                list = sys.render.bind([]);
            this.watch("/popup/open", (e, _key, _list) => {
                let pid = localStorage.getItem(key = _key);
                list.model = buf = _list;
                let i = _list.findIndex(i=>{return i.id == pid});
                i = sys.list.get(i == -1 ? 0 : i);
                i.val().checked = true;
                items.popup.show();
            });
            sys.list.on(Click, "*", function () {
                let i = sys.list.kids().indexOf(this);
                localStorage.setItem(key, buf[i].id);
                items.popup.hide();
                this.trigger(`/${key}/open`, buf[i]);
            });
            sys.list.on("hide", items.popup.hide);
        }
    },
    Applet: {
        css: "#applet { position: absolute; left: 0; bottom: 0; z-index: 13500; width: 100%; transition-duration: .3s; transform: translate3d(0,100%,0); max-height: 100%; -webkit-overflow-scrolling: touch; }\
              #modal-in { transform: translate3d(0,0,0);}\
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
            this.watch("/ui/app", (e, app) => {
                let view = sys.mask.prev();
                if (view && opts.mid == app.mid)
                    view.elem().nodeName == "IFRAME" ? view.notify("message", app) : view.notify(app.topic, [app.data]);
            });
            function load(app) {
                let applet = `//${app.view}/Index`;
                let c = xp.hasComponent(applet);
                if (!c) return setTimeout(i=>load(app), 10);
                c.map.msgFilter = /[^]*/;
                sys.mask.before(applet, app);
                items.mask.hide();
                sys.applet.once("close", close);
                sys.mask.prev().notify("#/app/ready", app);
            }
            sys.info.on("close", close);
            function close(e) {
                e.stopPropagation();
                items.info.hide();
                sys.applet.removeClass("#modal-in");
                sys.applet.once("transitionend", sys.mask.prev().remove);
            }
            this.watch("/applet/open", (e, app) => {
                opts = app;
                items.mask.show();
                sys.applet.addClass("#modal-in");
                require([`/views/${app.dir}/index.js`], () => load(app), () => {
                    items.mask.hide();
                    sys.applet.removeClass("#modal-in");
                    this.trigger("message", ["error", "应用打开失败，请稍后再试！"]);
                });
            });
            this.watch("/stat/app", (e, app) => {
                let view = sys.mask.prev();
                if (view && opts.mid == app.mid)　{
                    if (app.data == 0)
                        return items.info.show("应用已离线-[01]");
                    items.info.hide();
                    view.notify("#/app/ready", app);
                }
            });
            this.watch("/stat/link", (e, p) => {
                let view = sys.mask.prev();
                if (view && opts.link == p.mid && p.data == 0)
                    items.info.show("应用已离线-[02]");
            });
            this.watch("/stat/ui/0", () => {
                let view = sys.mask.prev();
                view && items.info.show("应用已离线-[03]");
            });
            this.watch("/ui/apps", (e, p) => {
                let view = sys.mask.prev();
                view && p.apps.forEach(app => {
                    if (app.mid == opts.mid) {
                        if (app.online == 0)
                            return items.info.show("应用已离线-[00]");
                        items.info.hide();
                        view.notify("#/app/ready", app)
                    }
                });
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
                this.trigger("/popup/open", ["area", areas]);
            });
            this.watch("/ui/areas", (e, _areas) => {
                if (_areas.length == 0) {
                    e.stopImmediateNotification();
                    this.trigger("/ui/logout");
                    this.trigger("message", ["error", "该用户未获得任何应用的授权！"]);
                }
            });
            this.watch("/ui/areas", (e, _areas) => {
                areas = _areas;
                let id = localStorage.getItem("area");
                let area = areas.find(i=>{return i.id == id});
                this.notify("/area/open", area || areas[0]);
            });
            this.watch("/area/open", (e, area) => {
                sys.label.text(area.name);
                localStorage.setItem("area", area.id);
                if (table[area.id])
                    return this.trigger("/ui/links", [table[area.id]]);
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
        css: "#title { letter-spacing: 0.1em; margin: 16px 4px 12px; font-weight: bold; color: white; text-align: center; }",
        xml: "<h3 id='title'/>",
        fun: function (sys, items, opts) {
            let links = [];
            this.on(Click, () => {
                this.trigger("/popup/open", ["link", links]);
            });
            this.watch("/ui/links", (e, p) => {
                links = p.links;
                let id = localStorage.getItem("link");
                let link = links.find(i=>{return i.id == id});
                this.notify("/link/open", link || links[0]);
            });
            this.watch("/link/open", (e, link) => {
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
                _apps[i].online && this.trigger("/applet/open", _apps[i]);
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
            sys.icon.append(`//xp/assets/${opts.id}`);
        }
    },
    Text: {
        css: "#text { letter-spacing: 0.1em;  display: inline-block; border-radius: 13px; background:rgba(0,0,0,0.2) none repeat scroll; padding: 0 16px; font-size: 14px; color: white; }",
        xml: "<span id='text'/>"
    },
    Stat: {
        xml: "<Text id='stat'>在线</Text>",
        fun: function (sys, items, opts) {
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
        map: { bind: {"name": "label"} },
        fun: function (sys, items, opts) {
            function online(value) {
                if (value == undefined)
                    return opts.online;
                opts.online = value;
                sys.item[value ? "addClass" : "removeClass"]("#active");
            }
            return { online: online };
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
            function dir(value) {
                if (value == undefined)
                    return tmp;
                tmp = value;
                require([`/views/${tmp}/icon.js`], e => {
                    let path = `//${tmp.split('/')[1]}/Icon`;
                    show(xp.hasComponent(path) ? path : "//xp/assets/Unknow");
                }, ()=> show("//xp/assets/Unknow"));
            }
            return { dir: dir };
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
            });
        }
    },
    Icon: {
        map: { extend: {"from": "../index/header/Icon"} }
    },
    About: {
        map: { extend: {"from": "../footer/icon/About"} }
    },
    Logout: {
        css: "#logout { margin: 35px 16px; }",
        xml: "<i:List id='logout' xmlns:i='//xp/list'>\
                <i:ListItem>\
                   <Button id='submit' xmlns='//xp/form'>退　出</Button>\
                </i:ListItem>\
              </i:List>",
        fun: function (sys, items, opts) {
            this.on(Click, e => {
                if (localStorage.getItem("online") == 0)
                    this.trigger("message", ["msg", "当前系统离线，无法退出！"]);
                else {
                    confirm("确定退出系统吗？") && this.trigger("/ui/logout");
                }
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
            sys.icon.replace("//xp/assets/" + opts.icon).addClass("#icon");
        }
    }
});

$_("content/popup").imports({
    List: {
        css: "#list { width: 100%; }",
        xml: "<div id='list'>\
                 <Group id='group'/>\
                 <Cancel id='cancel'/>\
              </div>",
        map: { appendTo: "group" },
        fun: function (sys, items, opts) {
            sys.cancel.on(Click, () => sys.list.trigger("hide", {}, false));
        }
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
        map: { bind: {name: "label"} },
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
              </div>"
    }
});

});