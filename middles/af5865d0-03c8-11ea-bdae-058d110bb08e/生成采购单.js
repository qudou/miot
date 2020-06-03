let req = require("request");
let jar = req.jar();
let request = req.defaults({jar: jar});
let cheerio = require("cheerio");
let headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
};

let TenantCode = "";      // 天店商户 ID
let UserAccountN = "";    // 天店用户名
let PasswordN = "";       // 天店密码
const PATH = `${__dirname}/缓存/`;
let Name = '迎宾街';
let VendorId = '31043';

const fs = require("fs");
const xmlplus = require("xmlplus");

xmlplus("xsm-to-td365", (xp, $_, t) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Config id='config'/>\
                <Tiandian id='tiandian'/>\
              </main>",
        fun: function (sys, items, opts) {
            let argvs = process.argv.slice(1);
            if (argvs.length > 2) {
                Name = argvs[1];
                VendorId = argvs[2];
            }
            let c = items.config[Name];
            TenantCode = c.TenantCode;
            UserAccountN = c.UserAccountN;
            PasswordN = c.PasswordN;
            sys.tiandian.notify("startup");
        }
    },
    Tiandian: {
        xml: "<main id='index' xmlns:i='tiandian'>\
                <i:Login id='login'/>\
                <i:GetPage id='getpage'/>\
                <i:CreatePage id='createPage'/>\
                <i:ReadXLS id='readxls'/>\
              </main>",
        map: { msgscope: true },
        fun: function (sys, items, opts) {
            this.watch("startup", e => console.log("正在登录天店后台..."), 1);
            this.watch("login-ok", e => console.log("已成功登录天店后台...\n正在获取库存添加页面..."), 1);
            this.watch("get-page-ok", e => console.log("已成功获取采购页面...\n正在读取采购订单..."), 1);
            this.watch("read-xls-ok", e => console.log("已成功读取采购订单...\n正在创建后台采购订单..."), 1);
            this.watch("create-page-ok", e => console.log("已成功创建后台采购订单..."), 1);
        }
    },
    Config: {
        fun: function (sys, items, opts) {
            let fs = require("fs");
            let json = fs.readFileSync(`${__dirname}/config.json`);
            let config = JSON.parse(json.toString());
            let table = {};
            config.forEach(item => table[item.Name] = item);
            return table;
        }
    }
});

$_("tiandian").imports({
    Login: {
        fun: function (sys, items, opts) {
            let LOGIN = "http://passport.td365.com.cn/Account/Login";
            this.watch("startup", e => {
                request(LOGIN, (error, response, body) => {
                    if ( error || response.statusCode !== 200 )
                        throw error;
                    let $ = cheerio.load(body);
                    let token = $('[name=__RequestVerificationToken]').attr("value");
                    request.post({
                          url: LOGIN,
                          headers: xp.extend({}, headers, {"Content-Type": "application/x-www-form-urlencoded"}),
                          form: {__RequestVerificationToken:token, TenantCode: TenantCode, UserAccountN: UserAccountN, PasswordN: PasswordN, LoginType: 1}
                    }, (error, httpResponse, body) => {
                        if ( error || response.statusCode !== 200 )
                             throw error;
                        let $ = cheerio.load(body);
                        if ($('title').text() !== "Object moved")
                            throw error;
                        this.notify("login-ok");
                    });
                });
            });
        }
    },
    GetPage: {
        fun: function (sys, items, opts) {
            this.watch("login-ok", e => {
                request.get({
                      url: "http://star.td365.com.cn/PISheet/Create",
                      headers: xp.extend({}, headers, {"Content-Type": "text/html"})
                }, (error, response, body) => {
                    if ( error || response.statusCode !== 200 )
                         throw error;
                    let $ = cheerio.load(body);
                    let OperId = $("[name=OperId]").attr("value");
                    let __RequestVerificationToken = $("[name=__RequestVerificationToken]").attr("value");
                    this.notify("get-page-ok", [OperId, __RequestVerificationToken]);
                });
            });
        }
    },
    ReadXLS: {
        xml: "<Sqlite id='db'/>",
        fun: function (sys, items, opts) {
            let node_xj = require("xls-to-json");
            this.watch("get-page-ok", async (e, OperId, __RequestVerificationToken) => {
                let result = await read();
                let Amount = 0.0, Qty = 0.0, StockSheetDetail = [], rowNum = 0;
                for (let i = 0; i < result.length; i++) {
                    let item = result[i];
                    let v = item;
                    let code = item["条码"];
                    item["确认量"] = v["需求量"];
                    console.log(code);
                    let q = await query(code);
                    console.log(i, result.length);
                    let o = {rowNum: `${++rowNum}`, operating: " ", Id: 0, RowNo: `${rowNum}`, MasterId: "0", ItemId: q.Id, ItemPackType: q.ItemPackType, OtherQty: "0.00" };
                    o.Amount = (new Number(item["确认量"] * item["进货价"])).toFixed(2);
                    o.LargeQty = (new Number(item["确认量"])).toFixed(2);
                    o.Memo = "";
                    o.OriginalPrice = q.PurcPrice;
                    o.PackFactor = q.PackFactor;
                    o.Price = (new Number(item["进货价"])).toFixed(4);
                    o.Qty = o.LargeQty;
                    o.UnitId = q.UnitId;
                    o.UnitName = q.UnitName;
                    Qty += parseFloat(o.Qty);
                    Amount += parseFloat(o.Amount);
                    StockSheetDetail.push(o);
                }
                Qty = (new Number(Qty)).toFixed(2);
                Amount = (new Number(Amount)).toFixed(2);
                this.notify("read-xls-ok", [OperId, __RequestVerificationToken, Qty, Amount, StockSheetDetail]);
            });
            function read() {
                return new Promise(resolve => {
                    let stmt = `SELECT ${Name}.*,条码,品名,系数,进货价,零售价,需求量 FROM ${Name},商品资料 WHERE ${Name}.货号 = 商品资料.货号 AND ${Name}.是否收藏 = 1 AND 需求量 > 0 AND 供应商 = '${VendorId}'`;
                    items.db.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows);
                    });
                });
            }
            function query(BCode) {
                return new Promise(resolve => {
                    request.get({
                          url: `http://star.td365.com.cn/SelectPurchaseItem/Query?t=${Date.now()}&hideCheckbox=true&queryFields=Code&query=${BCode}&popWindow=true&querynumber=152&vendorId=6670`,
                          headers: xp.extend({}, headers, {"Content-Type": "text/html"})
                    }, (error, response, body) => {
                        if ( error || response.statusCode !== 200 )
                             throw error;
                        let $ = cheerio.load(body);
                        let name = $("td[field=Name]").text();
                        if (!name) throw new Error(BCode + " not found");
                        resolve({
                            rowNum: $("td[field=rowNum]").text(),
                            Id: $("td[field=Id]").text(),
                            Code: $("td[field=Code]").text(),
                            Name: $("td[field=Name]").text(),
                            Mnemonic: $("td[field=Mnemonic]").text(),
                            Specification: $("td[field=Specification]").text(),
                            UnitName: $("td[field='UnitName']").text(),
                            UnitId: $("td[field='UnitId']").text(),
                            PackFactor: $("td[field=PackFactor]").text(),
                            SalePrice: $("td[field=SalePrice]").text(),
                            PurcPrice: $("td[field=PurcPrice]").text(),
                            ItemPackType: $("td[field=ItemPackType]").text()
                        });
                    });
                });
            }
        }
    },
    CreatePage: {
        fun: function (sys, items, opts) {
            let Amount = "0.75";                     // 总金额
            let ApproveDate = "";
            let ApproverId = "";
            let BranchId = "1493";
            let BranchName = "总部";
            let IO = "+";
            let Id = "";
            let IsAlowSheetCreateItem = "N";
            let IsBanChangePrice = "Y";
            let IsBanChangeQty = "Y";
            let IsMustQuotePreOrder = "N";
            let IsRepullInSheet = "";
            let IsWhenQuotePreOrderQtyNotExceed = "Y";
            let LargeQty = "1.00";                   // 箱数
            let Memo = "";
            let ModifiedCount = "";
            let OperDate = fmt(new Date(), "yyyy-MM-dd hh:mm:ss");
            let OperId = "2206";
            let Qty = "1.00";                        // 数量
            let SheetNo = "";
            let StockSheetDetail = [{rowNum: "1", operating: " ", Id: 0, RowNo: "1", MasterId: "", ItemId: "1284560", Amount: "0.75", LargeQty: "1.00", Memo: "", OriginalPrice : "0.7500", PackFactor: "1.00", Price: "0.7500", ProductionDate: "", Qty: "1.00", UnitId: "153724", UnitName: "份"}];
            let TransNo = "PI";
            //let VendorId = "27691"                   // 供应商ID
            let WorkerId = "";
            let __RequestVerificationToken = "";

            this.watch("read-xls-ok", (e, OperId, __RequestVerificationToken, Qty, Amount, StockSheetDetail) => {
                let OperDate = fmt(new Date(), "yyyy-MM-dd hh:mm:ss");
                request.post({
                      url: `http://star.td365.com.cn/PISheet/Create?t=${Date.now()}`,
                      headers: xp.extend({}, headers, {"Content-Type": "application/json"}),
                      body: JSON.stringify({"Amount": Amount, "ApproveDate": ApproveDate, "ApproverId": ApproverId, "IO": IO, "Id": Id, "IsAlowSheetCreateItem": IsAlowSheetCreateItem, IsBanChangePrice: IsBanChangePrice, IsBanChangeQty: IsBanChangeQty, IsMustQuotePreOrder: IsMustQuotePreOrder, IsRepullInSheet: IsRepullInSheet, IsWhenQuotePreOrderQtyNotExceed: IsWhenQuotePreOrderQtyNotExceed, "LargeQty": Qty, "Memo": Memo, "ModifiedCount": ModifiedCount, "OperDate": OperDate, "OperId": OperId, "Qty": Qty, "SheetNo": SheetNo, "StockSheetDetail": StockSheetDetail, "TransNo": TransNo, VendorId: VendorId, VoucherNo: "", VoucherNoId: "", "WorkerId": WorkerId, "__RequestVerificationToken":__RequestVerificationToken})
                }, (error, response, body) => {
                    if ( error || response.statusCode !== 200 )
                         throw error;
                    let r = JSON.parse(body);
                    if (r.status !== "success")
                        throw new Error(body);
                    this.notify("create-page-ok");
                });
            });
            function fmt( date, fmt_ ) {
                var o = {
                    "y+" : date.getFullYear(),
                    "M+" : date.getMonth() + 1,
                    "d+" : date.getDate(),
                    "h+" : date.getHours(),  
                    "m+" : date.getMinutes(),  
                    "s+" : date.getSeconds(),
                    "S+" : date.getMilliseconds()
                };
                var z = { "y+" : '0000', 'M+': '00', 'd+': '00', 'h+': '00', 'm+': '00', 's+': '00', 'S+': '000' };
                for (var k in o) {
                    if (new RegExp("(" + k + ")").test(fmt_)) {
                        fmt_ = fmt_.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : ((z[k] + o[k]).substr(("" + o[k]).length)));
                    }
                }
                return fmt_;
            }
        }
    },
    Sqlite: {
        fun: function (sys, items, opts) {
            let sqlite = require("sqlite3").verbose(),
                db = new sqlite.Database(`${__dirname}/data.db`);
			db.exec("VACUUM");
            db.exec("PRAGMA foreign_keys = ON");
            return db;
        }
    }
});

}).startup("//xsm-to-td365/Index");