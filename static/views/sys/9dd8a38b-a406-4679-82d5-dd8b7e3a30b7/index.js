/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("9dd8a38b-a406-4679-82d5-dd8b7e3a30b7", (xp, $_) => { // 授权管理

$_().imports({
    Index: {
        xml: "<i:ViewStack id='index' xmlns:i='//xp'>\
                 <Overview id='overview'/>\
                 <AppList id='applist'/>\
                 <Guide id='guide'/>\
              </i:ViewStack>"
    },
    Overview: {
        xml: "<div id='overview' xmlns:i='overview'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>"
    },
    AppList: {
        xml: "<div id='applist' xmlns:i='applist'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>"
    },
    Guide: {
        xml: "<div id='guide' xmlns:i='guide'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, to, p) => {
                items.content(`${p}不存在,请先添加${p}`);
            });
            this.watch("/auths/users", (e, data) => {
                data.length ? this.trigger("publish", "/auths/areas") : this.trigger("goto", ["guide", "用户"]);
            });
            this.watch("/auths/areas", (e, data) => {
                data.length || this.trigger("goto", ["guide", "区域"]);
            });
			this.trigger("publish", "/auths/users");
        }
    }
});

$_("overview").imports({
    Navbar: {
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'><Close xmlns='//xp/assets'/></a>\
                 </div>\
                 <div id='title'>授权管理</div>\
                 <div id='right'/>\
              </div>",
        map: { extend: { from: "//xp/Navbar" } },
        fun: function (sys, items, opts) { 
            sys.icon.on(Click, e => this.trigger("close"));
        }
    },
    Content: {
        xml: "<i:Content id='content' xmlns:i='//xp'>\
		          <UserList id='user'/>\
		          <ListItem id='item'/>\
		      </i:Content>",
        fun: function (sys, items, opts) {
			let proxy = sys.item.bind([]);
			sys.content.on("goto", (e, target, data) => {
				target == "applist" && (data.user = items.user.value);
			});
            this.watch("/auths/areas", (e, data) => proxy.model = data);
        }
    },
    UserList: {
        xml: "<i:List id='userlist' xmlns:i='//xp/list'>\
		        <i:Select id='users' xmlns:i='users'>\
		           <i:Option id='option'/>\
		        </i:Select>\
			  </i:List>",
        fun: function (sys, items, opts) {
			let proxy = sys.option.bind([]);
            this.watch("/auths/users", (e, data) => {
				proxy.model = data;
				items.users.selectedIndex = 0;
			});
			return items.users;
        }
    },
	ListItem: {
		css: "#list { margin-top: 10px; }",
		xml: "<div id='listItem' xmlns:i='//xp/list'>\
		        <Title id='title'/>\
				<i:List id='list'>\
				   <LinkItem id='links'/>\
				</i:List>\
		      </div>",
		map: { bind: { name: "title" } },
		fun: function (sys, items, opts) {
			sys.list.on("goto", (e, target, data) => {
				target == "applist" && (data.area = opts);
			});
			this.on("$/before/bind", (e, value) => opts = value);
		}
	},
    Title: {
		css: "#title { position: relative; overflow: hidden; margin: 0; white-space: nowrap; text-overflow: ellipsis; font-size: 14px; line-height: 1; }\
		      #title { text-transform: uppercase; color: #6d6d72; margin: 35px 15px 10px; }",
        xml: "<div id='title'/>"
    },
    LinkItem: {
		css: "#footer { color: #8e8e93; font-size: 12px; font-weight: 400; line-height: 1.2; white-space: normal; }",
		xml: "<i:ListItem id='linkItem' xmlns:i='//xp/list'>\
		        <i:Content style='link'>\
				   <i:Media><Icon/></i:Media>\
				   <i:Inner id='inner' media='true' style='link'>\
				     <i:Title id='title'>\
				   	   <div id='label'/>\
				   	   <div id='footer'/>\
				     </i:Title>\
				   </i:Inner>\
				</i:Content>\
		      </i:ListItem>",
		map: { bind: { name: "label", id: "footer" } },
        fun: function (sys, items, opts) {
            this.on(Click, () => {
				this.trigger("goto", ["applist", {link: opts}]);
            });
			this.on("$/before/bind", (e, value) => opts = value);
        }
    },
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='28' height='28'>\
                <path d='M768 864H256c-70.4 0-128-57.6-128-128v-128c0-70.4 57.6-128 128-128h64V192c0-17.6 14.4-32 32-32s32 14.4 32 32v288h256V192c0-17.6 14.4-32 32-32s32 14.4 32 32v288h64c70.4 0 128 57.6 128 128v128c0 70.4-57.6 128-128 128z m64-256c0-35.2-28.8-64-64-64H256c-35.2 0-64 28.8-64 64v128c0 35.2 28.8 64 64 64h512c35.2 0 64-28.8 64-64v-128z m-160 128c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m0-96c-17.6 0-32 14.4-32 32s14.4 32 32 32 32-14.4 32-32-14.4-32-32-32z m-320 96c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m0-96c-17.6 0-32 14.4-32 32s14.4 32 32 32 32-14.4 32-32-14.4-32-32-32z'/>\
              </svg>"
    }
});

$_("overview/users").imports({
	Select: {
		css: "#picker { margin-top: -8px; margin-bottom: -8px; }",
        xml: "<i:ListItem id='select' xmlns:i='//xp/list'>\
	            <i:Content>\
				   <i:Media><Icon/></i:Media>\
                   <i:Inner id='inner' media='true'>\
                      <Select id='picker' xmlns='//xp/form'/>\
                   </i:Inner>\
				</i:Content>\
              </i:ListItem>",
		map: { appendTo: "picker" },
		fun: function (sys, items, opts) {
			return items.picker.elem();
		}
	},
	Option: {
		xml: "<option id='option'/>",
		map: { bind: { id: "option" } },
		fun: function (sys, items, opts) {
			return { name: sys.option.text };
		}
	},
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='28' height='28'>\
                <path d='M939.904 821.333333a439.296 439.296 0 0 0-306.346667-317.994666 233.258667 233.258667 0 0 0 111.573334-198.869334c0-128.554667-104.576-233.173333-233.130667-233.173333S278.869333 175.914667 278.869333 304.469333a233.258667 233.258667 0 0 0 111.573334 198.869334 439.296 439.296 0 0 0-306.346667 317.994666 103.594667 103.594667 0 0 0 19.541333 89.088c21.034667 26.88 52.608 42.24 86.613334 42.24H833.706667a109.226667 109.226667 0 0 0 86.613333-42.24c20.138667-25.6 27.221333-58.069333 19.584-89.088zM330.069333 304.469333c0-100.352 81.621333-181.973333 181.930667-181.973333s181.930667 81.621333 181.930667 181.973333S612.352 486.4 512 486.4 330.069333 404.778667 330.069333 304.469333z m549.973334 574.421334a59.306667 59.306667 0 0 1-46.336 22.613333H190.250667a59.306667 59.306667 0 0 1-46.336-22.613333 52.096 52.096 0 0 1-10.154667-45.312C176.725333 659.328 332.245333 537.6 512 537.6s335.274667 121.728 378.197333 295.978667a52.053333 52.053333 0 0 1-10.154666 45.312z'/>\
              </svg>"
    }
});

$_("applist").imports({
    Navbar: {
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'><Backward xmlns='//xp/assets'/></a>\
                 </div>\
                 <div id='title'/>\
                 <div id='right'/>\
              </div>",
        map: { extend: { from: "//xp/Navbar" } },
        fun: function (sys, items, opts) { 
            sys.icon.on(Click, e => this.trigger("back"));
            this.watch("#/view/ready", (e, prev, data) => {
				sys.title.text(`${data.area.name}/${data.link.name}`);
			});
        }
    },
    Content: {
        xml: "<i:Content id='content' xmlns:i='//xp' xmlns:k='//xp/list'>\
		        <k:List id='list'>\
				  <ListItem id='item'/>\
				</k:List>\
              </i:Content>",
        fun: function (sys, items, opts) {
			let proxy = sys.item.bind([]);
			sys.list.on("change", "*", function (e) {
				e.stopPropagation();
				let index = sys.list.kids().indexOf(this);
				let i = proxy.model[index];
				let payload = {user: opts.user, app: i.id, auth: i.auth};
				this.trigger("publish", ["/auths/auth", payload]);
			});
			this.watch("#/view/ready", (e, prev, data) => {
				opts = data;
				let payload = {user: data.user, link: data.link.id};
				this.trigger("publish", ["/auths/apps", payload]);
			});
			this.watch("/auths/apps", (e, data) => proxy.model = data);
        }
    },
    ListItem: {
        css: "#auth { display: none; }\
		      #auth:checked~#icon { border: none; background: #007aff;}",
        xml: "<i:ListItem id='linkItem' xmlns:i='//xp/list' xmlns:j='li'>\
                 <j:Content tag='label' style='link'>\
                    <input id='auth' type='checkbox'/>\
                    <j:Icon id='icon'/>\
                    <i:Inner id='inner' media='true'>\
                        <div id='label'/>\
                    </i:Inner>\
                 </j:Content>\
              </i:ListItem>",
		map: { bind: { name: "label" } }
    }
});

$_("applist/li").imports({
	Content: {
		xml: "<label id='content'/>",
		map: { extend: { from: "//xp/list/Content" } }
	},
    Icon: {
		css: "#icon { width: 22px; height: 22px; color: gray; position: relative; box-sizing: border-box; border-radius: 50%; border: 1px solid #c7c7cc; flex-shrink: 0; display: block; }\
		      #icon:after { background: no-repeat center; background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20x%3D'0px'%20y%3D'0px'%20viewBox%3D'0%200%2012%209'%20xml%3Aspace%3D'preserve'%3E%3Cpolygon%20fill%3D'%23ffffff'%20points%3D'12%2C0.7%2011.3%2C0%203.9%2C7.4%200.7%2C4.2%200%2C4.9%203.9%2C8.8%203.9%2C8.8%203.9%2C8.8%20'%2F%3E%3C%2Fsvg%3E\"); background-size: 12px 9px }\
			  #icon:after { content: ''; position: absolute; left: 50%; top: 50%; margin-left: -6px; margin-top: -4px; width: 12px; height: 9px; }",
        xml: "<i id='icon'/>"
    }
});

$_("guide").imports({
    Navbar: {
        map: { extend: {from: "../overview/Navbar"} }
    },
    Content: {
		css: "#content { text-align: center; margin: 5em 0; }",
        xml: "<Content id='content' xmlns='//xp'/>",
        fun: function (sys, items, opts) {
            return sys.content.text;
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}