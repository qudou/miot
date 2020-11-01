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
              #list { width: 1000px; margin: 0 auto; }\
              #index button { -webkit-appearance: auto; width: auto; }\
              #index select { border-style: solid; -webkit-appearance: auto; display: inline; border-width: 1px; }",
        xml: "<div id='index'>\
                <Header id='header'/>\
                <List id='list'/>\
                <Insert id='insert'/>\
                <Editor id='editor'/>\
                <Status id='status'/>\
              </div>",
        fun: function (sys, items, opts) {
            let store = "迎宾街";
            sys.index.on("publish", function(e, cmd, data) {
                if (e.target != sys.index) {
                    e.stopPropagation();
                    data = data || {};
                    data.store = store;
                    sys.index.trigger("publish", [cmd, data]);
                }
            });
            this.watch("store-change", (e,value) => store = value);
        }
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
    List: {
        css: "#cgtList { padding: 0; border: 1px solid #e6e6e6; width: 1280px; display: block; list-style: none; padding-top: 75px; }\
              #padding {margin-bottom: 29px;}",
        xml: "<ul id='cgtList'>\
                  <li id='list'>\
                    <ul id='listItems' style='padding: 0;'/>\
                  </li>\
                  <Database id='db'/>\
              </ul>",
        fun: function (sys, items, opts) {
            this.watch("/list", (e, rows) => {
                let list = sys.listItems.children();
                for ( i = 0; i < rows.length; i++ ) {
                    rows[i].index = i + 1;
                    list[i] || list.push(sys.listItems.append("list/Item"));
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
    Insert: {
        xml: "<div class='dialog' style='width: 330px; border: 1px solid #E6E6E6;'>\
                <i:Form id='form' label='商品新增' class='dialog-inner' xmlns:i='insert'>\
                    <i:Name id='nema'/>\
                    <i:BCode id='bcode'/>\
                    <i:PCode id='pcode'/>\
                    <i:Rate id='rate'/>\
                    <i:IPrice id='iprice'/>\
                    <i:OPrice id='oprice'/>\
                    <i:Supplier id='supplier'/>\
                    <i:Types id='types'/>\
                    <i:Picture id='picture'/>\
                </i:Form>\
                <div class='dialog-buttons'>\
                    <span id='cancel' class='dialog-button'>取消</span>\
                    <span id='ok' class='dialog-button'>确定</span>\
                </div>\
              </div>",
        fun: function (sys, items, opts) { // 997046581
            let editor = this.prev();
            let dialog = null;
            let param = {el: this.elem()};
            editor.watch("open-insert", (e, o) => {
                dialog = dialog || window.app.dialog.create(param);
                items.nema.val("");
                items.bcode.val("");
                items.pcode.val("");
                items.rate.val("");
                items.iprice.val("");
                items.oprice.val("");
                items.picture.val("");
                dialog.open();
            });
            sys.picture.on("next", (e, o) => {
                e.stopPropagation();
                editor.trigger("publish", ["/insert", o]);
            });
            editor.watch("/insert", (e, o) => {
                dialog.close();
                editor.notify("show-cgt-list");
            });
            sys.ok.on(Click, items.form.start);
            sys.cancel.on(Click, () => dialog.close());
        }
    },
    Editor: {
        xml: "<div class='dialog' style='width: 330px; border: 1px solid #E6E6E6;'>\
                <i:Form id='form' label='商品编辑' class='dialog-inner' xmlns:i='insert'>\
                    <i:Name id='nema'/>\
                    <i:OCode id='ocode'/>\
                    <i:BCode id='bcode'/>\
                    <i:PCode id='pcode'/>\
                    <i:IPrice id='iprice'/>\
                    <i:OPrice id='oprice'/>\
                    <i:Rate id='rate'/>\
                    <i:Supplier id='supplier'/>\
                    <i:Types id='types'/>\
                    <i:Picture id='picture'/>\
                </i:Form>\
                <div class='dialog-buttons'>\
                    <span id='cancel' class='dialog-button'>取消</span>\
                    <span id='ok' class='dialog-button'>确定</span>\
                </div>\
              </div>",
        fun: function (sys, items, opts) { // 997046581
            let editor = this.prev();
            let dialog = null;
            let param = {el: this.elem()};
            editor.watch("open-editor", (e, o) => {
                items.nema.val(o.品名);
                items.ocode.val(o.货号);
                items.bcode.val(o.货号);
                items.pcode.val(o.条码);
                items.rate.val(o.系数);
                items.iprice.val(o.进货价);
                items.oprice.val(o.零售价);
                items.supplier.val(o.供应商);
                items.types.val(o.分类);
                items.picture.val(o.图片);
                dialog = dialog || window.app.dialog.create(param);
                dialog.open();
            });
            sys.picture.on("next", (e, o) => {
                e.stopPropagation();
                editor.trigger("publish", ["/editor", o]);
            });
            editor.watch("/editor", (e, o) => {
                dialog.close();
                editor.notify("show-cgt-list");
            });
            sys.ok.on(Click, items.form.start);
            sys.cancel.on(Click, () => dialog.close());
        }
    },
    Status: {
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
                sys.db.trigger("publish", ["/list", o]);
            }
            function update(desc, code, num) {
                let o = { desc: desc, code: code, num: num };
                sys.db.trigger("publish", ["/input", o]);
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
                <i:Stock id='stock'/> &gt;\
                <i:Require id='require'/> &gt;\
                <i:Allocate id='allocate'/>\
                <i:Purchase id='purchase'/>\
                <i:Insert id='insert'/>\
                <i:Close id='close'/>\
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
        xml: "<select id='stores' disabled='true' style='height:23px;'>\
                 <option value='迎宾街'>迎宾街</option>\
                 <option value='总部'>总部</option>\
                 <option value='荣兴'>荣兴</option>\
                 <option value='铜锣湾'>铜锣湾</option>\
                 <option value='三生天海'>三生天海</option>\
                 <option value='钻石园'>钻石园</option>\
                 <option value='财经中心'>财经中心</option>\
              </select>",
        fun: function (sys, items, opts) {
            this.glance("/store/change", (e, data) => {
                data.desc == "迎宾街" && sys.stores.removeAttr("disabled")
                sys.stores.prop("value", data.desc);
                this.notify("store-change", data.desc);
                sys.stores.on("change", change);
            });
            function change(e) {
                let store = sys.stores.prop("value");
                this.notify("store-change", store);
            }
            setTimeout(() => this.trigger("publish", "/store/change"), 0);
        }
    },
    Require: {
        xml: "<button id='require'>生成需求量</button>",
        fun: function (sys, items, opts) {
            let dialog = null;
            let store = "迎宾街";
            let supplier = "31043";
            this.on("click", () => {
                let type = (store == "迎宾街" || supplier != "31043") ? "采购" : "调拨";
                this.trigger("publish", ["/require", {type: type}]);
                dialog = window.app.dialog.preloader('生成需求量');
            });
            this.watch("/require", () => {
                dialog.close();
                this.notify("show-cgt-list");
            });
            this.watch("supplier-change", (e, label) => {
                supplier = label;
            });
            this.watch("store-change", (e, label) => {
                store = label;
            });
        }
    },
    Allocate: {
        xml: "<button id='allocate'>生成调拨单</button>",
        fun: function (sys, items, opts) {
            let dialog = null;
            let store = "迎宾街";
            let supplier = "31043";
            this.on("click", () => {
                this.trigger("publish", "/allocate");
                dialog = window.app.dialog.preloader('生成调拨单');
            });
            this.watch("/allocate", (e, p) => {
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
                (store != "迎宾街" && supplier == "31043") ? sys.allocate.show() : sys.allocate.hide();
            }
        }
    },
    Purchase: {
        xml: "<button id='purchase'>生成采购单</button>",
        fun: function (sys, items, opts) {
            let dialog = null;
            let store = "迎宾店";
            let supplier = "31043";
            this.on("click", () => {
                this.trigger("publish", ["/purchase", {supplier: supplier}]);
                dialog = window.app.dialog.preloader('生成采购单');
            });
            this.watch("/purchase", (e, p) => {
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
                (store == "迎宾街" || supplier != "31043") ? sys.purchase.show() : sys.purchase.hide();
            }
        }
    },
    Insert: {
        xml: "<button id='insert'>新增</button>",
        fun: function (sys, items, opts) {
            window.Q.editable || sys.insert.hide();
            this.on(Click, function(e) {
                this.notify("open-insert");
            });
        }
    },
    Close: {
        xml: "<button id='close'>退出</button>",
        fun: function (sys, items, opts) {
            this.on(Click, e => this.trigger("close"));
        }
    },
    Stock: {
        xml: "<button id='stock'>库存量更新</button>",
        fun: function (sys, items, opts) {
            let dialog = null;
            this.on("click", () => {
                this.trigger("publish", "/stock");
                dialog = window.app.dialog.preloader('库存量更新');
            });
            this.watch("/stock", (e, p) => {
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
        xml: "<select id='supplier' style='height: 23px;'>\
                 <option value='31043'>自采供应商</option>\
                 <option value='46251'>全有商贸</option>\
                 <option value='46246'>惠众商行</option>\
                 <option value='46250'>鹏辉贸易</option>\
                 <option value='86711'>奥曼力申</option>\
                 <option value='46422'>金峰商贸</option>\
                 <option value='86779'>双华批发</option>\
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
        xml: "<select id='types' style='height: 23px;'>\
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

$_("list").imports({
    Item: {
        css: "#item { display: block; float: left; border-bottom: 1px dotted #ccc; line-height: 40px; width: 100%; list-style: none; }\
              #item:hover { background: #F2F2F2;}\
              #item > span { display: block; float: left; line-height: 40px; height: 40px; }",
        xml: "<li id='item'>\
                <RowNum id='row_num'/>\
                <Name id='cgt_name'/>\
                <Stock id='stock'/>\
                <Stock id='kyl'/>\
                <Input id='req_qty' desc='需求量'/>\
                <Input id='lower_stock' desc='库存低位'/>\
                <Input id='upper_stock' desc='库存高位'/>\
                <Price id='xs_price'/>\
                <Price id='cgt_price'/>\
                <Price id='rtl_price'/>\
                <Rate id='gi_rate'/>\
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
                items.cgt_name(v['品名'], v['货号'],v['图片'],v['条码']);
                sys.xs_price.text(v["系数"].toFixed(0));
                sys.cgt_price.text(f ? v["进货价"].toFixed(2) : '#');
                sys.rtl_price.text(v["零售价"].toFixed(2));
                v["毛利率"] && items.gi_rate(f ? v["毛利率"].toFixed(1) + '%' : '#');
                sys.stock.text(v["库存量"]);
                //sys.kyl.text(v["可用量"]); 
                sys.kyl.text(999);
                items.lower_stock(v["库存低位"]);
                items.req_qty(v["需求量"]);
                items.upper_stock(v["库存高位"]);
                items.like(v["是否收藏"]);
            }
            sys.cgt_name.on("dblclick", function(e) {
                window.Q.editable && this.notify("open-editor", opts);
            });
            sys.item.on("change", "Input", function (e) {
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
    Price: {
        css: "#cgt_price { width: 60px; color: #ff6b09; font-weight: 700; text-align: right; }",
        xml: "<span id='cgt_price'/>"
    },
    Rate: {
        css: "#gi_rate { width: 60px; color: #333; font-weight: 700; text-align: right; }",
        xml: "<span id='gi_rate'/>",
        fun: function (sys, items, opts) {
            return function (rate) {
                sys.gi_rate.text(rate);
                sys.gi_rate.css("color", rate < 15 ? "#333" : "#F00");
            };
        }
    },
    Name: {
        css: "#cgt_name { width: 200px; font-weight: 700; }\
              #hidimg { display: bolck; float: left; margin: 5px 10px 0 0; width: 25px; height: 30px; border: 0; vertical-align: top; }\
              #big_img { display: block; float: left; line-height: 40px; height: 40px; position: relative; z-index: 0; }\
              #big_img img { display: none; position: absolute; left: -50px; top: 41px; z-index: 1; background-color: #fff; padding: 10px; border: 1px solid #eee; box-shadow: 0 3px 3px #666; width: 110px; height: 170px; float: left; margin: 5px 10px 0 0; vertical-align: top; }\
              #label { color: #333; display: block; width: 165px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; }",
        xml: "<span id ='cgt_name'>\
                <div href='javascript:void(0)'>\
                    <img id='hidimg' class='lazy' src='http://gx.xinshangmeng.com:88/xsm6/resource/ec/cgtpic/6901028124348_middle_star.png?v=2018062300' style='display: block;'/>\
                    <span id='big_img'>\
                        <img id='bigimg' src='http://gx.xinshangmeng.com:88/xsm6/resource/ec/cgtpic/6901028124348_middle_face.png?v=2018062300'/>\
                    </span>\
                    <span id='label' style='user-select: text'>塑合王冠</span>\
                </div>\
              </span>",
        fun: function (sys, items, opts) {
            sys.hidimg.on("mouseover", sys.bigimg.show);
            sys.hidimg.on("mouseout", sys.bigimg.hide);
            return function (label, bcode, img, bcode2) {
                sys.label.text(label);
                sys.label.attr("title", `货号:${bcode} 条码:${bcode2}`);
                sys.hidimg.attr("src", `http://star.td365.com.cn/Uploads/ItemImages/${img}`);
                sys.bigimg.attr("src", `http://star.td365.com.cn/Uploads/ItemImages/${img}`);
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

$_("insert").imports({
    Form: {
        xml: "<div id='form' class='dialog-inner'>\
                <div id='title' class='dialog-title'/>\
              </div>",
        fun: function (sys, items, opts) {
            let ptr, first = this.first();
            sys.title.text(opts.label);
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
    Name: {
        xml: "<Input id='part' label='品　名' maxlength='32'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.part.focus();
                sys.part.trigger("message", ["error", msg]);
            }
            this.on("start", function (e, o) {
                o.品名 = items.part.val();
                if (o.品名 === "") {
                    error("请输入商品名称");
                } else if (o.品名.length < 2) {
                    error("商品名称至少需要2个字符");
                } else {
                    sys.part.trigger("next", o);
                }
            });
            return items.part;
        }
    },
    OCode: {
        css: "#ocode { display: none; }",
        xml: "<Input id='ocode' label='原货号'/>",
        fun: function (sys, items, opts) {
            this.on("start", function (e, o) {
                o.原货号 = items.ocode.val();
                sys.ocode.trigger("next", o);
            });
            return items.ocode;
        }
    },
    BCode: {
        xml: "<Input id='code' label='货　号'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.code.focus();
                sys.code.trigger("message", ["error", msg]);
            }
            this.on("start", function (e, o) {
                o.货号 = items.code.val();
                if (o.货号 === "") {
                    error("请输入货号");
                } else if (o.货号.length < 6) {
                    error("货号至少需要6个字符");
                } else {
                    sys.code.trigger("next", o);
                }
            });
            return items.code;
        }
    },
    PCode: {
        xml: "<Input id='code' label='条　码'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.code.focus();
                sys.code.trigger("message", ["error", msg]);
            }
            this.on("start", function (e, o) {
                o.条码 = items.code.val();
                if (o.条码 === "") {
                    error("请输入条码");
                } else if (o.条码.length < 6) {
                    error("条码至少需要6个字符");
                } else {
                    sys.code.trigger("next", o);
                }
            });
            return items.code;
        }
    },
    IPrice: {
        xml: "<Input id='price' label='进货价'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.price.focus();
                sys.price.trigger("message", ["error", msg]);
            }
            this.on("start", function (e, o) {
                o.进货价 = items.price.val();
                if (o.进货价 === "") {
                    error("请输入进货价");
                } else {
                    o.进货价 = parseFloat(o.进货价);
                    sys.price.trigger("next", o);
                }
            });
            return items.price;
        }
    },
    OPrice: {
        xml: "<Input id='price' label='零售价'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.price.focus();
                sys.price.trigger("message", ["error", msg]);
            }
            this.on("start", function (e, o) {
                o.零售价 = items.price.val();
                if (o.零售价 === "") {
                    error("请输入零售价");
                } else {
                    o.零售价 = parseFloat(o.零售价);
                    sys.price.trigger("next", o);
                }
            });
            return items.price;
        }
    },
    Rate: {
        xml: "<Input id='rate' label='系　数' maxlength='3'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.rate.focus();
                sys.rate.trigger("message", ["error", msg]);
            }
            this.on("start", function (e, o) {
                o.系数 = parseInt(items.rate.val());
                if (o.系数 === "") {
                    error("请输入系数");
                } else {
                    sys.rate.trigger("next", o);
                }
            });
            return items.rate;
        }
    },
    Supplier: {
		xml: "<div class='dialog-input-field input' style='height: 23px;'>\
                <span>供应商</span>\
                <select id='supplier' style='border: 1px solid #B2B2B2; -webkit-appearance: auto; display: inline; height: 26px; width: 182px;'>\
                   <option value='31043'>自采供应商</option>\
                   <option value='46251'>全有商贸</option>\
                   <option value='46246'>惠众商行</option>\
                   <option value='46250'>鹏辉贸易</option>\
                   <option value='86711'>奥曼力申</option>\
                   <option value='46422'>金峰商贸</option>\
                   <option value='86779'>双华批发</option>\
                </select>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("start", function (e, o) {
                o.供应商 = sys.supplier.prop("value");
                sys.supplier.trigger("next", o);
            });
            function val(value) {
                sys.supplier.prop("value", value);
            }
            return {val: val};
        }
    },
    Types: {
		xml: "<div class='dialog-input-field input'>\
                <span>分　类</span>\
                <select id='type' style='border: 1px solid #B2B2B2; -webkit-appearance: auto; display: inline; height: 26px; width: 182px;'>\
                    <option value='1'>饮料</option>\
                    <option value='2'>食品</option>\
                    <option value='3'>奶类</option>\
                    <option value='4'>日用</option>\
                    <option value='5'>玩具</option>\
                    <option value='6'>茶酒</option>\
                </select>\
              </div>",
        fun: function (sys, items, opts) {
            this.on("start", function (e, o) {
                o.分类 = sys.type.prop("value");
                sys.type.trigger("next", o);
            });
            function val(value) {
                sys.type.prop("value", value);
            }
            return {val: val};
        }
    },
    Picture: {
        xml: "<Input id='picture' label='图　片'/>",
        fun: function (sys, items, opts) {
            function error( msg ) {
                items.picture.focus();
                sys.picture.trigger("message", ["error", msg]);
            }
            this.on("start", function (e, o) {
                o.图片 = items.picture.val();
                sys.picture.trigger("next", o);
            });
            return items.picture;
        }
    },
	Input: {
		xml: "<div class='dialog-input-field input' style='margin-top:0;'>\
                <span id='label'/>\
                <input id='text' class='dialog-input' style='width: auto; display: inline;'/>\
              </div>",
		map: { attrs: { text: "name value type maxlength placeholder disabled style" } },
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