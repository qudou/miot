/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("af5865d0-03c8-11ea-bdae-058d110bb08e", (xp, $_) => {

$_().imports({
    Index: {
        css: "html, body { margin: 0; padding: 0; }\
              #index { background: #FFF; overflow: auto; }\
              #index::-webkit-scrollbar { display: none; }\
              #goodlist { width: 1000px; margin: 0 auto; }\
              #index button { -webkit-appearance: auto; width: auto; }\
              #index select { border-style: solid; -webkit-appearance: auto; display: inline; border-width: 1px; }",
        xml: "<div id='index'>\
                <Header id='header'/>\
                <GoodList id='goodlist'/>\
                <StatusBar id='statusbar'/>\
              </div>"
    },
    Header: {
        css: "#header { background: #FFF; position: fixed; width: 100%; }\
              #content { width: 1000px; margin: 0 auto; }\
              #list { position: relative; top: -7px; width: 100%; display: block; list-style: none; }",
        xml: "<div id='header' xmlns:i='header'>\
                <div id='content'>\
                  <i:TitleBar id='titlebar'/>\
                  <i:ListMenu id='listMenu'/>\
                </div>\
              </div>"
    },
    GoodList: {
        css: "#cgtList { padding: 0; border: 1px solid #e6e6e6; width: 1280px; display: block; list-style: none; padding-top: 75px; }\
              #padding {margin-bottom: 29px;}",
        xml: "<ul id='cgtList'>\
                  <li id='list'>\
                    <ul id='listItems' style='padding: 0;'/>\
                  </li>\
                  <Database id='db'/>\
              </ul>",
        fun: function (sys, items, opts) {
            this.watch("/cgt/list", (e, rows) => {
                let list = sys.listItems.children();
                for ( i = 0; i < rows.length; i++ ) {
                    rows[i].index = i + 1;
                    list[i] || list.push(sys.listItems.append("cgt-list/ListItem"));
                    list[i].show().value().value = rows[i];
                    list[i].removeClass("#padding");
                }
                list[i-1] && list[i-1].addClass("#padding");
                for ( var k = i; k < list.length; k++ )
                    list[k].hide().removeClass("#padding");
                sys.cgtList.notify("update-status-bar");
            });
            this.on("input-change", (e, desc, code, num) => items.db.update(desc, code, num));
            this.on("like-change", (e, like, code) => items.db.update("是否收藏", code, like));
            this.watch("show-cgt-list", () => {
                clearTimeout(opts.timer);
                opts.timer = setTimeout(items.db.cgtList, 0);
            });
        }
    },
    StatusBar: {
        css: "#statusbar { text-align: center; color: #333; font-size: 14px; line-height: 28px; height: 28px; position: fixed; width: 100%; bottom: 0; left: 0; padding: 0 10px; background: #F0F0F0; border-top: 1px solid #E0E5E6; }",
        xml: "<div id='statusbar'>\
                <span id='label'>防城港同亦佳连锁便利店</span>\
              </div>",
        fun: function (sys, items, opts) {
            let store = "迎宾店";
            this.watch("update-status-bar", () => {
                //let label = `门店：${store}`;
                //sys.label.text("");
            });
            this.watch("store-change", (e,v) => store = v);
        }
    },
    Database: {
        xml: "<main id='db'/>",
        fun: function (sys, items, opts) {
            let [orderby,sort,WHERE] = ["零售价","ASC",{}];
            function cgtList() {
                let o = { orderby: orderby, sort: sort, where: WHERE };
                sys.db.trigger("publish", ["/cgt/list", o]);
            }
            function update(desc, code, num) {
                let o = { desc: desc, code: code, num: num };
                sys.db.trigger("publish", ["/update", o]);
            }
            this.watch("sort-change", (e, order, sort_) => {
                orderby = order, sort = sort_;
                this.notify("show-cgt-list");
            });
            this.watch("filter-change", (e, where) => {
                WHERE = where;
                this.notify("show-cgt-list");
            });
            this.watch("store-change", (e,v) => {
                this.notify("show-cgt-list");
            });
            return { cgtList: cgtList, update: update };
        }
    }
});

$_("header").imports({
    TitleBar: {
        css: "#titlebar { padding: 10px 0; }",
        xml: "<div id='titlebar' xmlns:i='titlebar'>\
                <i:Stores id='stores'/>\
                <i:ReqUpdate id='reqUpdate'/>\
                <i:DiaoBo id='diaobo'/>\
                <i:CaiGou id='caigou'/>\
                <i:StockUp id='stockUp'/>\
                <i:Filter id='filter'/>\
              </div>"
    },
    ListMenu: {
        css: "#menu { height: 32px; line-height: 32px; background-color: #f2f2f2; border-bottom: 1px solid #e6e6e6; font-size: 14px; z-index: 99; display: block; list-style: none; }\
              #menu span { display: block; float: left; line-height: 33px; height: 33px; }\
              #num-btn1 { width: 50px; padding-left: 10px; }\
              #spmc-btn, #pfj-btn, #zdj-btn, #mll-btn, #ord-btn, #like-btn, #kyl-btn { color: #08c; cursor: pointer; position: relative; }\
              #spmc-btn { width: 200px; text-align: left; }\
              #ord-btn, #like-btn, #kyl-btn { text-align: right; width: 60px; }\
              #pfj-btn, #zdj-btn, #mll-btn, #xs-btn { width: 60px; text-align: right; }\
              #like-btn { width: 60px; }\
              #req-btn, #lower-stock, #upper-stock { width: 100px; text-align: center; box-sizing: border-box; padding-left: 18px; }",
        xml: "<li id='menu' data-initheight='280' style='left: 1px;'>\
                <span id='num-btn1'>序号</span>\
                <span id='spmc-btn'>商品名称</span>\
                <MenuItem id='ord-btn'>库存量</MenuItem>\
                <MenuItem id='kyl-btn'>可用量</MenuItem>\
                <span id='req-btn'>需求量</span>\
                <span id='lower-stock'>库存低位</span>\
                <span id='upper-stock'>库存高位</span>\
                <MenuItem id='xs-btn'>系数</MenuItem>\
                <MenuItem id='pfj-btn'>进货价</MenuItem>\
                <MenuItem id='zdj-btn'>零售价</MenuItem>\
                <MenuItem id='mll-btn'>毛利率</MenuItem>\
                <span id='like-btn'>收藏</span>\
              </li>"
    },
    MenuItem: {
        xml: "<span id='item'/>",
        fun: function (sys, items, opts) {
            let sort = "DESC";
            sys.item.on("click", e => {
                this.notify("sort-change", [this.text(), sort]);
                sort = sort == "DESC" ? "ASC" : "DESC";
            });
        }
    }
});

$_("header/titlebar").imports({
    Stores: {
        xml: "<select id='stores' disabled='true'>\
                 <option value='迎宾街'>迎宾街</option>\
                 <option value='总部'>总部</option>\
                 <option value='荣兴'>荣兴</option>\
                 <option value='铜锣湾'>铜锣湾</option>\
                 <option value='三生天海'>三生天海</option>\
                 <option value='钻石园'>钻石园</option>\
                 <option value='财经中心'>财经中心</option>\
              </select>",
        fun: function (sys, items, opts) {
            this.watch("/store/change", (e, data) => {
                sys.stores.prop("value", data.desc);
                this.notify("store-change", data.desc);
            });
            setTimeout(() => this.trigger("publish", "/store/change"), 0);
        }
    },
    ReqUpdate: {
        xml: "<button id='reqUpdate'>生成需求量</button>",
        fun: function (sys, items, opts) {
            let dialog = null;
            let store = "迎宾街";
            let supplier = "31043";
            this.on("click", () => {
                let type = (store == "迎宾街" || supplier != "31043") ? "采购" : "调拨";
                this.trigger("publish", ["/req/update", {type: type}]);
                dialog = window.app.dialog.preloader('生成需求量');
            });
            this.watch("/req/update", () => {
                dialog.close();
                this.notify("show-cgt-list")
            });
            this.watch("supplier-change", (e, label) => {
                supplier = label;
            });
            this.watch("store-change", (e, label) => {
                store = label;
            });
        }
    },
    DiaoBo: {
        xml: "<button id='diaobo'>生成调拨单</button>",
        fun: function (sys, items, opts) {
            let dialog = null;
            let store = "迎宾街";
            let supplier = "31043";
            this.on("click", () => {
                this.trigger("publish", "/diaobo");
                dialog = window.app.dialog.preloader('生成调拨单');
            });
            this.watch("/diaobo", (e, p) => {
                dialog.setText(p.message);
                if (p.message == "finish") {
                    dialog.close();
                    window.app.dialog.alert("调拨订单已生成，请到后台查看", "提示");
                }
            });
            this.watch("supplier-change", (e, label) => {
                refresh(supplier = label);
            });
            this.watch("store-change", (e, label) => {
                refresh(store = label);
            });
            function refresh() {
                (store != "迎宾街" && supplier == "31043") ? sys.diaobo.show() : sys.diaobo.hide();
            }
        }
    },
    CaiGou: {
        xml: "<button id='caigou'>生成采购单</button>",
        fun: function (sys, items, opts) {
            let dialog = null;
            let store = "迎宾店";
            let supplier = "31043";
            this.on("click", () => {
                this.trigger("publish", ["/caigou", {supplier: supplier}]);
                dialog = window.app.dialog.preloader('生成采购单');
            });
            this.watch("/caigou", (e, p) => {
                dialog.setText(p.message);
                if (p.message == "finish") {
                    dialog.close();
                    window.app.dialog.alert("采购订单已生成，请到后台查看", "提示");
                }
            });
            this.watch("supplier-change", (e, label) => {
                refresh(supplier = label);
            });
            this.watch("store-change", (e, label) => {
                refresh(store = label);
            });
            function refresh() {
                (store == "迎宾街" || supplier != "31043") ? sys.caigou.show() : sys.caigou.hide();
            }
        }
    },
    StockUp: {
        xml: "<button id='stockUp'>库存量更新</button>",
        fun: function (sys, items, opts) {
            let dialog = null;
            this.on("click", () => {
                this.trigger("publish", "/update/stock");
                dialog = window.app.dialog.preloader('库存量更新');
            });
            this.watch("/update/stock", (e, p) => {
                dialog.setText(p.message);
                if (p.message == "finish") {
                    dialog.close();
                    this.notify("show-cgt-list");
                }
            });
        }
    },
    Filter: {
        css: "#filter { display: inline-block; float: right; }",
        xml: "<form id='filter' xmlns:i='filter'>\
                <Supplier id='supplier'/>\
                <Types id='type'/>\
                <Input id='like' checked='true'>仅显示收藏</Input>\
                <Input id='stock'>库存量>0</Input>\
                <Input id='req'>需求量>0</Input>\
              </form>",
        fun: function (sys, items, opts) {
            sys.filter.on("change", () => {
                let where = {
                    type: items.type(),
                    supplier: items.supplier(),
                    like: items.like(),
                    stock: items.stock(),
                    req: items.req()
                };
                this.notify("filter-change", [where]);
            });
            setTimeout(() => sys.filter.trigger("change"), 0);
        }
    },
    Input: {
        xml: "<label><input id='input' name='input' type='checkbox'/></label>",
        map: { attrs: {input: "checked"} },
        fun: function (sys, items, opts) {
            return function () {
                return sys.input.prop("checked");
            };
        }
    },
    Supplier: {
        xml: "<select id='supplier'>\
                 <option value='31043'>自采供应商</option>\
                 <option value='46251'>全有商贸</option>\
              </select>",
        fun: function (sys, items, opts) {
            this.on("change", e => {
                this.notify("supplier-change", e.target.prop("value"));
            });
            setTimeout(() => sys.supplier.first().trigger("change"), 0);
            function value() {
                return sys.supplier.prop("value");
            }
            return value;
        }
    },
    Types: {
        xml: "<select id='types'>\
                 <option value='0'>全部分类</option>\
                 <option value='1'>饮料</option>\
                 <option value='2'>食品</option>\
                 <option value='3'>奶类</option>\
                 <option value='4'>日用</option>\
                 <option value='5'>玩具</option>\
                 <option value='6'>茶酒</option>\
              </select>",
        fun: function (sys, items, opts) {
            function value() {
                return parseInt(sys.types.prop("value"));
            }
            return value;
        }
    }
});

$_("cgt-list").imports({
    ListItem: {
        css: "#list_item { display: block; float: left; border-bottom: 1px dotted #ccc; line-height: 40px; width: 100%; list-style: none; }\
              #list_item:hover { background: #F2F2F2;}\
              #list_item > span { display: block; float: left; line-height: 40px; height: 40px; }",
        xml: "<li id='list_item'>\
                <RowNum id='row_num'/>\
                <CgtName id='cgt_name'/>\
                <Stock id='stock'/>\
                <Stock id='kyl'/>\
                <Input id='req_qty' desc='需求量'/>\
                <Input id='lower_stock' desc='库存低位'/>\
                <Input id='upper_stock' desc='库存高位'/>\
                <CgtPrice id='xs_price'/>\
                <CgtPrice id='cgt_price'/>\
                <CgtPrice id='rtl_price'/>\
                <GiRate id='gi_rate'/>\
                <Like id='like'/>\
              </li>",
        cfg: { lower_stock: { editable: !!window.Q.editable }, upper_stock: { editable: !!window.Q.editable } },
        fun: function (sys, items, opts) {
            let f = window.Q.editable;
            function getValue() {
                return "";
            }
            function setValue(v) {
                opts = v;
                items.row_num(v.index);
                items.cgt_name(v['品名'], v['条码']);
                sys.xs_price.text(v["系数"].toFixed(0));
                sys.cgt_price.text(f ? v["进货价"].toFixed(2) : '#');
                sys.rtl_price.text(v["零售价"].toFixed(2));
                v["毛利率"] && items.gi_rate(f ? v["毛利率"].toFixed(1) + '%' : '#');
                sys.stock.text(v["库存量"]);
                sys.kyl.text(v["可用量"]);
                items.lower_stock(v["库存低位"]);
                items.req_qty(v["需求量"]);
                items.upper_stock(v["库存高位"]);
                items.like(v["是否收藏"]);
            }
            sys.list_item.on("change", "Input", function (e) {
                e.stopPropagation();
                let v = e.target.prop("value");
                this.trigger("input-change", [e.target.attr("desc"), opts['货号'], v]);
            });
            sys.like.on("like-change", (e, v) => {
                e.stopPropagation();
                this.trigger("like-change", [v, opts['货号']]);
            });
            return Object.defineProperty({}, "value", { get: getValue, set: setValue });
        }
    },
    RowNum: {
        css: "#row_num, #row_num span { width: 60px; display: block; float: left; line-height: 40px; height: 40px; }\
              #row_num span { margin-left: 20px; text-align: left; }\
              #row_num img { width: 20px; height: 20px; position: absolute; margin-left: 46px; margin-top: 11px; border: 0; vertical-align: top; display: none; }",
        xml: "<span id='row_num'>\
                <span id='count' style='display:none;' class='ml20'>24</span>\
                <span id='count_out' style='margin-left:20px; text-align:left;'>1</span>\
                <img alt='' title='异形烟 ' src='http://gx.xinshangmeng.com:88/ecskins/images/yi.png'/>\
              </span>",
        fun: function (sys, items, opts) {
            return function (index) {
                sys.count_out.text(index);
            };
        }
    },
    CgtPrice: {
        css: "#cgt_price { width: 60px; color: #ff6b09; font-weight: 700; text-align: right; }",
        xml: "<span id='cgt_price'/>"
    },
    GiRate: {
        css: "#gi_rate { width: 60px; color: #333; font-weight: 700; text-align: right; }",
        xml: "<span id='gi_rate'/>",
        fun: function (sys, items, opts) {
            return function (rate) {
                sys.gi_rate.text(rate);
                sys.gi_rate.css("color", rate < 15 ? "#333" : "#F00");
            };
        }
    },
    CgtName: {
        css: "#cgt_name { width: 200px; font-weight: 700;}\
              #hidimg { display: bolck; float: left; margin: 5px 10px 0 0; width: 25px; height: 30px; border: 0; vertical-align: top; }\
              #big_img { display: block; float: left; line-height: 40px; height: 40px; position: relative; z-index: 0; }\
              #big_img img { display: none; position: absolute; left: -50px; top: 41px; z-index: 1; background-color: #fff; padding: 10px; border: 1px solid #eee; box-shadow: 0 3px 3px #666; width: 110px; height: 170px; float: left; margin: 5px 10px 0 0; vertical-align: top; }\
              #label { color: #333; display: block; width: 165px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; }",
        xml: "<span id ='cgt_name'>\
                <div href='javascript:void(0)'>\
                    <img id='hidimg' class='lazy' src='http://gx.xinshangmeng.com:88/xsm6/resource/ec/cgtpic/6901028124348_middle_star.png?v=2018062300' style='display: block;'/>\
                    <span id='big_img'>\
                        <img src='http://gx.xinshangmeng.com:88/xsm6/resource/ec/cgtpic/6901028124348_middle_face.png?v=2018062300'/>\
                    </span>\
                    <span id='label'>塑合王冠</span>\
                </div>\
              </span>",
        fun: function (sys, items, opts) {
            let star = "http://gx.xinshangmeng.com:88/xsm6/resource/ec/cgtpic/%bcode_middle_star.png?v=2018062300";
            let face = "http://gx.xinshangmeng.com:88/xsm6/resource/ec/cgtpic/%bcode_middle_face.png?v=2018062300";
            return function (label, bcode) {
                sys.hidimg.attr("src", star.replace("%bcode", bcode));
                sys.label.text(label);
            };
        }
    },
    Input: {
        css: "#input { width: 100px; }\
              #input span { display: block; height: 30px; padding-top: 6px; text-align: center; float: right; padding-top: 6px; }\
              #input em { display: block; width: 20px; height: 26px; float: left; background: #e1e1e1; line-height: 26px; cursor: pointer; -webkit-user-select: none; }\
              #input em:hover { color: #ff6a09; }\
              #text { width: 38px; display: block; height: 24px; float: left; border: 1px #b3b3b3 solid; line-height: 24px; text-align: right; padding: 0; }",
        xml: "<span id='input'>\
                <span>\
                    <em id='suba'>-</em>\
                    <input id='text' tabindex='24' class='xsm-order-list-shuru-input' value='0'/>\
                    <em id='adda'>+</em>\
                </span>\
              </span>",
        opt: { editable: true },
        fun: function (sys, items, opts) {
            let t = sys.text;
            let f = opts.editable;
            f || sys.text.prop("disabled", "true");
            f && sys.suba.on("click", e => {
                let n = text();
                t.trigger("change", n > 0 ? text(--n) : 0);
            });
            f && sys.adda.on("click", e => {
                t.trigger("change", text(text() + 1));
            });
            function text(v) {
                return v !== undefined ? t.prop("value", v) : parseInt(t.prop("value"), 10);
            }
            sys.text.attr("desc", opts.desc);
            return text;
        }
    },
    Stock: {
        css: "#stock { width: 60px; color: #ff6b09; font-weight: 700; text-align: right; }",
        xml: "<span id='stock'>0</span>"
    },
    Like: {
        css: "#like { color:#ccc; cursor:pointer; text-align: right; width: 60px; }\
              #cs { color:#ff6b09; }",
        xml: "<span id='like'>&#10084;</span>",
        fun: function (sys, items, opts) {
            let value = 0;
            let f = !!window.Q.editable;
            f && this.on("click", () => {
                like(value = value ? 0 : 1);
                this.trigger("like-change", value);
                setTimeout(() => sys.like.notify("show-cgt-list"), 20);
            });
            function like(like) {
                value = like;
                like ? sys.like.addClass("#cs") : sys.like.removeClass("#cs");
            }
            return like;
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}