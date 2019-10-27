/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("df454200-ec8e-11e9-971d-af3af76c747f", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<i:ViewStack id='index' xmlns:i='//miot'>\
                <Overview id='overview'/>\
                <Update id='update'/>\
                <Service id='service'/>\
              </i:ViewStack>",
        fun: function (sys, items, opts) {
            items.overview.title(opts.name);
            this.trigger("publish", "/ready");
        }
    },
    Overview: {
        xml: "<div id='overview' xmlns:i='overview'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            return {title: items.navbar.title};
        }
    },
    Update: {
        xml: "<div id='update' xmlns:i='update'>\
                <i:Navbar id='navbar'/>\
                <i:Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("show", (e, ptr, data) => {
                data && items.content.val(data);
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
        css: ".ios .navbar-inner { padding: 0 10px; }\
              .ios .navbar #close { margin-right: 0; width: 22px; height: 22px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='close' class='left'>\
                      <i class='icon f7-icons ios-only' style='margin:auto;'>close</i>\
                   </div>\
                   <div id='title' class='title'/>\
                   <div class='right'>\
                   </div>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.close.on("touchend", e => this.trigger("close"));
            return { title: sys.title.text };
        }
    },
    Content: {
        css: "#vol { margin-top: 35px; }",
        xml: "<div id='content' class='page'>\
                <div class='page-content'>\
                  <div class='block-title'>第一层</div>\
                  <List id='first'/>\
                  <div class='block-title'>第三层</div>\
                  <List id='third'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            this.watch("/ready", (e, data) => {
                sys.first.children().call("remove");
                data[1].forEach(item => {
                    item && (sys.first.append("Item").value().value = item);
                });
                sys.third.children().call("remove");
                data[3].forEach(item => {
                    item && (sys.third.append("Item").value().value = item);
                });
            });
        }
    },
    List: {
        xml: "<div class='list'>\
                <ul id='list'/>\
              </div>",
        map: { appendTo: "list" }
    },
    Item: {
        css: "#icon { width: 28px; height: 28px; border-radius: 6px; box-sizing: border-box; }",
        xml: "<li>\
               <a href='#' class='item-link item-content'>\
                 <div class='item-media'><i id='icon' class='icon icon-f7'><Icon id='img'/></i></div>\
                 <div class='item-inner'>\
                   <div id='label' class='item-title'>\
                     <div id='addr' class='item-header'/>\
                     <div id='label'/>\
                     <div id='code' class='item-footer'/>\
                   </div>\
                 </div>\
               </a>\
              </li>",
        fun: function (sys, items, opts) {
            this.on("touchend", () => this.trigger("switch", ["update", opts]));
            function setValue(item) {
                opts = item;
                sys.label.text(`${item.列号} ${item.品名}`);
                sys.img.attr("src", item.图片);
            }
            return Object.defineProperty({}, "value", { set: setValue});
        }
    },
    Icon: {
        css: "#icon { width: 28px; height: 28px; }",
        xml: "<img id='icon'/>"
    }
});

$_("update").imports({
    Navbar: {
        css: ".ios .navbar-inner { padding: 0 10px; }\
              .ios .navbar #back { margin-right: 0; width: 22px; height: 22px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='backward' class='left'>\
                      <i class='icon f7-icons ios-only' style='margin:auto;'>chevron_left_round</i>\
                   </div>\
                   <div id='title' class='title'>商品修改</div>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.backward.on("touchend", e => this.trigger("switch", "overview"));
        }
    },
    Content: {
        xml: "<div id='content' class='page'>\
                <div class='page-content' xmlns:i='form'>\
                    <i:Form id='update'>\
                      <i:Addr id='addr'/>\
                      <i:Code id='code'/>\
                      <i:Name id='gname'/>\
                      <i:Price id='price'/>\
                      <i:Stock id='stock'/>\
                      <i:Picture id='picture'/>\
                    </i:Form>\
                    <i:Button id='submit'>确定更新</i:Button>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.submit.on("touchend", items.update.start);
            function val(value) {
                opts = value;
                items.addr.val(`${value.行号}行${value.列号}列`);
                items.code.val(value.货号);
                items.gname.val(value.品名);
                items.price.val(value.售价);
                items.stock.val(value.库存);
                items.picture.val(value.图片);
            }
            sys.gname.on("next", (e) => {
                e.stopPropagation();
                let p = {id: opts.id, 货号:items.code.val(),品名:items.gname.val(), 售价: parseFloat(items.price.val()), 库存:parseInt(items.stock.val()), 图片:items.picture.val()};
                this.trigger("switch", "service");
                this.trigger("publish", ["/update", p]);
                this.glance("/update", callback);
            });
            function callback(e, p) {
                e.target.trigger("message", ["msg", p.desc]);
                if (p.code == -1)
                    return e.target.trigger("switch", "update");
                e.target.trigger("publish", "/ready").trigger("switch", "overview");
            }
            return {val: val};
        }
    }
});

$_("update/form").imports({
    Form: {
        xml: "<form id='form' class='list form-store-data'>\
                <div class='list'>\
                  <ul id='content'/>\
                </div>\
              </form>",
        map: { "appendTo": "content" },
        fun: function (sys, items, opts) {
            let ptr, first = this.first();
            this.on("next", function (e, r) {
                e.stopPropagation();
                ptr = ptr.next();
                ptr.trigger("start", r, false);
            });
            function start() {
                ptr = first;
                ptr.trigger("start", {}, false);
            }
            return { start: start };
        }
    },
    Addr: {
        xml: "<Input id='addr' label='位置' maxlength='32' disabled='true'/>",
        fun: function (sys, items, opts) {
            this.on("start", (e, p) => this.trigger("next", p));
            return items.addr;
        }
    },
    Code: {
        xml: "<Input id='code' label='货号' placeholder='请输入货号' maxlength='32'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.code.focus();
                sys.code.trigger("message", ["error", msg]);
            }
            this.on("start", (e, o) => {
                o.code = items.code.val();
                if (o.name === "") {
                    error("请输入货号");
                } else {
                    sys.code.trigger("next", o);
                }
            });
            return items.code;
        }
    },
	Name: {
		xml: "<Input id='gname' label='品名' placeholder='请输入品名' maxlength='32'/>",
		fun: function (sys, items, opts) {
			function error(msg) {
				items.gname.focus();
				sys.gname.trigger("message", ["error", msg]);
			}
			this.on("start", function (e, o) {
				o.品名 = items.gname.val();
				if (o.品名 == "") {
					error("请输入品名");
				} else {
					sys.gname.trigger("next", o);
				}
			});
			return items.gname;
		}
	},
    Price: {
        xml: "<Input id='price' label='售价' maxlength='32'/>",
        fun: function (sys, items, opts) {
            this.on("start", (e, p) => {
                o.售价 = parseFloat(item.price.val());
                this.trigger("next", o);
            });
            return items.price;
        }
    },
    Stock: {
        xml: "<Input id='stock' label='库存' maxlength='32'/>",
        fun: function (sys, items, opts) {
            this.on("start", (e, p) => {
                o.库存 = parseInt(item.stock.val());
                this.trigger("next", o);
            });
            return items.stock;
        }
    },
    Picture: {
        xml: "<Input id='picture' label='图片' maxlength='32'/>",
        fun: function (sys, items, opts) {
            this.on("start", (e, p) => {
                o.图片 = parseInt(item.picture.val());
                this.trigger("next", o);
            });
            return items.picture;
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
                     <input id='text' type='text' name='name' placeholder='Your name'/>\
                   </div>\
                 </div>\
               </div>\
              </li>",
		map: { attrs: { text: "name value type maxlength placeholder disabled" } },
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
			return { val: val, focus: focus };
		}
	}
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}