/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("d9c69375-2edc-43d3-a2a4-7bd93c31eb4f", (xp, $_) => { // 用户管理

$_().imports({
    Index: {
        xml: "<i:ViewStack xmlns:i='//miot/widget'>\
                <Overview id='overview'/>\
                <Signup id='signup'/>\
                <Update id='update'/>\
                <Chpasswd id='chpasswd'/>\
                <Remove id='remove'/>\
                <Service id='service'/>\
              </i:ViewStack>",
        fun: function (sys, items, opts) {
            this.trigger("publish", "/users/select");
        }
    },
    Overview: {
        xml: "<div id='overview' xmlns:i='overview'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>"
    },
    Signup: {
        xml: "<div id='signup' xmlns:i='signup'>\
                <i:Navbar id='navbar' title='用户注册'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, prev, data) => {
				data || items.content();
			});
        }
    },
    Update: {
        xml: "<div id='update' xmlns:i='signup'>\
                <i:Navbar id='navbar' title='用户修改'/>\
                <Content id='content' xmlns='update'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, prev, data) => {
                data && items.content(data);
            });
        }
    },
    Chpasswd: {
        xml: "<div id='chpasswd' xmlns:i='signup'>\
                <i:Navbar id='navbar' title='密码修改'/>\
                <Content id='content' xmlns='chpasswd'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, prev, data) => {
                data && items.content(data);
            });
        }
    },
    Remove: {
        fun: function (sys, items, opts) {
            this.watch("remove", (e, p) => {
                window.app.dialog.confirm("确定删除该用户吗？", "温馨提示", () => {
                    this.trigger("publish", ["/users/remove", {id: p.id}]);
                    this.glance("/users/remove", (m, p) => {
                        this.trigger("message", ["msg", p.desc]);
                        p.code == 0 && e.target.hide();
                    });
                });
            });
        }
    },
    Service: {
        css: "#service { visibility: visible; opacity: 1; background: #EFEFF4; }",
        xml: "<Overlay id='service' xmlns='//miot/verify'/>"
    }
});

$_("overview").imports({
    Navbar: {
        map: { extend: { "from": "//miot/widget/Navbar" } },
        xml: "<div id='navbar'>\
			     <div id='left'>\
				    <a id='icon'><Close xmlns='//miot/assets'/></a>\
			     </div>\
			     <div id='title'>用户管理</div>\
			     <div id='right'>\
				    <a id='menu'>注册</a>\
			     </div>\
              </div>",
        fun: function (sys, items, opts) { 
            sys.icon.on(Click, e => this.trigger("close"));
            sys.menu.on(Click, () => this.trigger("goto", "signup"));
        }
    },
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' style='padding-top: 44px;'>\
                  <UserList id='list'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/users/select", (e, data) => {
                sys.list.kids().call("remove");
                data.forEach(item => {
                    let user = sys.list.append("UserItem").val();
                    user.value = item;
                });
            });
        }
    },
    UserList: {
        xml: "<div class='list'>\
                <ul id='list'/>\
              </div>",
        map: { appendTo: "list" }
    },
    UserItem: {
        css: "#icon { width: 28px; height: 28px; border-radius: 6px; box-sizing: border-box; }",
        xml: "<li class='swipeout deleted-callback'>\
               <div class='item-content swipeout-content'>\
                 <div class='item-media'><i id='icon' class='icon icon-f7'><Icon/></i></div>\
                 <div class='item-inner'>\
                   <div class='item-title'>\
                     <div id='type' class='item-header'>普通用户</div>\
                     <div id='label'/>\
                     <div id='last_login' class='item-footer'/>\
                   </div>\
                 </div>\
               </div>\
               <div class='swipeout-actions-right'>\
                 <a id='edit' href='#' class='color-blue'>编辑</a>\
                 <a id='remove' href='#' class='color-red'>删除</a>\
               </div>\
              </li>",
        fun: function (sys, items, opts) {
            sys.edit.on(Click, () => this.trigger("goto", ["update", opts]));
            function setValue(user) {
                opts = user;
                sys.label.text(user.name);
                sys.last_login.text(`最后登录：${user.last_login}`);
                user.id && sys.type.text("普通用户") || sys.type.text("管理员") && sys.remove.remove();
            }
            sys.remove.on(Click, () => this.notify("remove", opts));
            return Object.defineProperty({}, "value", { set: setValue});
        }
    },
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='28' height='28'>\
                <path d='M939.904 821.333333a439.296 439.296 0 0 0-306.346667-317.994666 233.258667 233.258667 0 0 0 111.573334-198.869334c0-128.554667-104.576-233.173333-233.130667-233.173333S278.869333 175.914667 278.869333 304.469333a233.258667 233.258667 0 0 0 111.573334 198.869334 439.296 439.296 0 0 0-306.346667 317.994666 103.594667 103.594667 0 0 0 19.541333 89.088c21.034667 26.88 52.608 42.24 86.613334 42.24H833.706667a109.226667 109.226667 0 0 0 86.613333-42.24c20.138667-25.6 27.221333-58.069333 19.584-89.088zM330.069333 304.469333c0-100.352 81.621333-181.973333 181.930667-181.973333s181.930667 81.621333 181.930667 181.973333S612.352 486.4 512 486.4 330.069333 404.778667 330.069333 304.469333z m549.973334 574.421334a59.306667 59.306667 0 0 1-46.336 22.613333H190.250667a59.306667 59.306667 0 0 1-46.336-22.613333 52.096 52.096 0 0 1-10.154667-45.312C176.725333 659.328 332.245333 537.6 512 537.6s335.274667 121.728 378.197333 295.978667a52.053333 52.053333 0 0 1-10.154666 45.312z'/>\
              </svg>"
    }
});

$_("signup").imports({
    Navbar: {
        map: { extend: { "from": "//miot/widget/Navbar" } },
        xml: "<div id='navbar' xmlns:i='//miot/assets'>\
			     <div id='left'>\
				    <a id='icon'><i:Backward/></a>\
			     </div>\
			     <div id='title'/>\
			     <div id='right'/>\
              </div>",
        fun: function (sys, items, opts) { 
		    sys.title.text(opts.title);
            sys.icon.on(Click, e => this.trigger("back"));
        }
    },
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' xmlns:i='form' style='padding-top: 44px;'>\
                    <i:Form id='signup'>\
                      <i:User id='user'/>\
                      <i:Email id='email'/>\
                      <i:Pass id='pass'/>\
                      <i:Livetime id='livetime'/>\
                      <i:Relogin id='relogin'/>\
                      <i:Remarks id='remarks'/>\
                    </i:Form>\
                    <i:Button id='submit'>注册</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.remarks.on("next", (e, p) => {
                e.stopPropagation();
                this.trigger("goto", "service");
                this.trigger("publish", ["/users/signup", p]);
                this.glance("/users/signup", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
				e.target.trigger("back", true);
				p.code || e.target.trigger("publish", "/users/select");
            }
			sys.submit.on(Click, items.signup.start);
            return function () {
                items.email.val("");
                items.pass.val("");
                items.livetime.val("");
                items.remarks.val("");
                items.user.val("").focus();
            };
        }
    }
});

$_("signup/form").imports({
    Form: {
        xml: "<form id='form' class='list form-store-data'>\
                <div class='list'>\
                  <ul id='content'/>\
                </div>\
              </form>",
        map: { "appendTo": "content" },
        fun: function (sys, items, opts) {
            let ptr, first = this.first();
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
            return { start: start };
        }
    },
    User: {
        xml: "<Input id='user' label='用户名' placeholder='请输入用户名' maxlength='32'/>",
        map: { attrs: { user: "disabled" } },
        fun: function (sys, items, opts) {
            var patt = /^[a-z0-9_]{4,31}$/i;
            function error( msg ) {
                items.user.focus();
                sys.user.trigger("message", ["error", msg]);
            }
            this.on("start", (e, o) => {
                o.name = items.user.val();
                if (o.name === "") {
                    error("请输入用户名");
                } else if (o.name.length < 4) {
                    error("用户名至少需要4个字符");
                } else if (!patt.test(o.name)) {
                    error("您输入的用户名有误");
                } else {
                    sys.user.trigger("next", o);
                }
            });
            return items.user;
        }
    },
	Email: {
		xml: "<Input id='email' label='邮箱' placeholder='请输入邮箱' maxlength='32'/>",
		fun: function (sys, items, opts) {
			var patt = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
			function error(msg) {
				items.email.focus();
				sys.email.trigger("message", ["error", msg]);
			}
			this.on("start", (e, o) => {
				o.email = items.email.val();
				if (o.email == "") {
					error("请输入邮箱");
				} else if (o.email.length < 6) {
					error("邮箱至少需要6个字符");
			    } else if (!patt.test(o.email)) {
					error("您输入的邮箱有误");
				} else {
					sys.email.trigger("next", o);
				}
			});
			return items.email;
		}
	},
    Pass: {
        xml: "<Input id='pass' label='密码' placeholder='请输入密码' type='password' maxlength='16'/>",
        map: { attrs: { pass: "label" } },
        fun: function (sys, items, opts) {
            function error(msg) {
                items.pass.focus();
                sys.pass.trigger("message", ["error", msg]);
            }
            this.on("start", (e, o) => {
                o.pass = items.pass.val();
                if (o.pass === "") {
                    error("请输入密码");
                } else if (o.pass.length < 6) {
                    error("密码至少需要6个字符");
                } else {
                    sys.pass.trigger("next", o);
                }
            });
            return items.pass;
        }
    },
	Remarks: {
		xml: "<Input id='remarks' label='备注' placeholder='备注不是必需的' maxlength='256'/>",
		fun: function (sys, items, opts) {
			this.on("start", (e, o) => {
				o.remarks = items.remarks.val();
                if (o.remarks.length > 256) {
                    error("备注长度不得大于 256 位");
                } else {
                    sys.remarks.trigger("next", o);
                }
			});
			return items.remarks;
		}
	},
    Livetime: {
        xml: "<Input id='livetime' type='number' label='登录时效/天' placeholder='请输入登录时效' value='30'/>",
        fun: function (sys, items, opts) {
            function error(msg) {
                items.livetime.focus();
                sys.livetime.trigger("message", ["error", msg]);
            }
            this.on("start", (e, o) => {
                o.livetime = items.livetime.val();
                if (o.livetime === "") {
                    error("请输入登录时效");
                } else if (o.livetime > 365 || o.livetime < 1) {
                    error("登录时效在 1 至 365 之间");
                } else {
                    sys.livetime.trigger("next", o);
                }
            });
            return items.livetime;
        }
    },
    ReLogin: {
        css: ".sheet-modal { z-index: 100000; }",
        xml: "<li id='picker'>\
                  <div class='item-content item-input'>\
                    <div class='item-inner'>\
                      <div id='label' class='item-title item-label'>重复登录</div>\
                      <div class='item-input-wrap'>\
                        <input id='input' type='text' readonly='readonly'/>\
                      </div>\
                      <div class='item-footer'/>\
                    </div>\
                  </div>\
              </li>",
        fun: function (sys, items, opts) {
            let data = ["允许", "不允许"];
            let picker = window.app.picker.create({
                inputEl: sys.input.elem(),
                rotateEffect: true,
                toolbarCloseText: "确定",
                cols: [{values: data}],
                value: [data[0]]
            });
            this.on("start", (e, p) => {
                p.relogin = picker.value[0] == "允许" ? 1 : 0;
                this.trigger("next", p);
            });
            function setValue(value) {
                picker.setValue([value ? "允许" : "不允许"]);
            }
            return { val: setValue };
        }
    },
	Button: {
		xml: "<div class='list'><ul><li>\
                <a id='label' href='#' class='item-link list-button'/>\
              </li></ul></div>",
        map: { appendTo: "label" },
	},
	Input: {
		xml: "<li id='input'>\
               <div class='item-content item-input'>\
                 <div class='item-inner'>\
                   <div id='label' class='item-title item-label'>Name</div>\
                   <div class='item-input-wrap'>\
                     <input id='text' type='text' name='name'/>\
                   </div>\
                 </div>\
               </div>\
              </li>",
		map: { attrs: { text: "name value type maxlength placeholder disabled min max" } },
		fun: function (sys, items, opts) { 
            sys.label.text(opts.label);
			function focus() {
				sys.text.elem().focus();
				return this;
			}
			function val(value) {
				if ( value == undefined )
					return sys.text.prop("value");
				sys.text.prop("value", value);
				return this;
			}
			return {val: val, focus: focus};
		}
	}
});

$_("update").imports({
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' xmlns:i='../signup/form' style='padding-top: 44px;'>\
                    <i:Form id='update'>\
                      <i:User id='user'/>\
                      <i:Email id='email'/>\
                      <i:Livetime id='livetime'/>\
                      <Relogin id='relogin' xmlns='/signup/form'/>\
                      <i:Remarks id='remarks'/>\
                    </i:Form>\
                    <i:Button id='submit'>确定更新</i:Button>\
                    <i:Button id='chpasswd'>密码修改</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.remarks.on("next", (e, p) => {
                e.stopPropagation();
                p.id = opts.id;
                this.trigger("goto", "service");
                this.trigger("publish", ["/users/update", p]);
                this.glance("/users/update", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
				e.target.trigger("back");
				p.code || e.target.trigger("publish", "/users/select");
            }
			sys.submit.on(Click, items.update.start);
			sys.chpasswd.on(Click, () => this.trigger("goto", ["chpasswd",opts]));
            return function (value) {
                opts = value;
                items.user.val(value.name);
                items.email.val(value.email);
                items.remarks.val(value.remarks || "");
                items.livetime.val(value.livetime);
                items.relogin.val(value.relogin);
            };
        }
    }
});

$_("chpasswd").imports({
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' xmlns:i='../signup/form' style='padding-top: 44px;'>\
                    <i:Form id='chpasswd'>\
                      <i:User id='user' disabled='true'/>\
                      <i:Pass id='pass'/>\
                      <i:Pass id='new_pass' label='新密码'/>\
                    </i:Form>\
                    <i:Button id='submit'>确定修改</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.new_pass.on("next", (e) => {
                e.stopPropagation();
                let p = {id:opts.id, pass:items.pass.val(), new_pass:items.new_pass.val()};
                this.trigger("goto", "service");
                this.trigger("publish", ["/users/chpasswd", p]);
                this.glance("/users/chpasswd", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
				e.target.trigger("back");
            }
			sys.submit.on(Click, items.chpasswd.start);
            return function (value) {
                opts = value;
				items.pass.val('');
				items.new_pass.val('');
                items.user.val(value.name);
            };
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}