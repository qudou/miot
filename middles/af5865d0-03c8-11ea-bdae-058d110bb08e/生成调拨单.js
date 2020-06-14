let req = require("request");
let jar = req.jar();
let request = req.defaults({jar: jar});
let cheerio = require("cheerio");
let headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
};

const PATH = `${__dirname}/缓存/`;
let TenantCode = "";      // 天店商户 ID
let UserAccountN = "";    // 天店用户名
let PasswordN = "";       // 天店密码
let Name = "总部";        // 调入门店名
let BranchId;             // 调出门店ID
let DBranchId;            // 调入门店ID

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
            let c = items.config['迎宾街'];
            TenantCode = c.TenantCode;
            UserAccountN = c.UserAccountN;
            PasswordN = c.PasswordN;
            BranchId = c.BranchId;
            let argvs = process.argv.slice(1);
            if (argvs.length > 1)
                Name = argvs[1];
            let o = items.config[Name];
            DBranchId = o.BranchId;
            sys.tiandian.notify("startup")
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
            this.watch("login-ok", e => console.log("已成功登录天店后台...\n正在获取调拨单添加页面..."), 1);
            this.watch("get-page-ok", e => console.log("已成功获取调拨页面...\n正在读取调拨订单..."), 1);
            this.watch("read-xls-ok", e => console.log("已成功读取调拨订单...\n正在创建后台调拨订单..."), 1);
            this.watch("create-page-ok", e => console.log("已成功创建后台调拨订单..."), 1);
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
                    this.notify("login-ok2");
                });
            });
            this.watch("login-ok2", e => {
                request.get({
                      url: "http://star.td365.com.cn/AllocationSheet/Create",
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
            this.watch("get-page-ok", async (e, OperId, __RequestVerificationToken) => {
                let result = await read();
                let Amount = 0.0, Qty = 0.0, StockSheetDetail = [], rowNum = 0;
                for (let i = 0; i < result.length; i++) {
                    let item = result[i];
                    let v = item;
                    let code = item["条码"];
                    item["确认量"] = Math.ceil(v["需求量"]/v["系数"]);
                    console.log(code);
                    let q = await query(code);
                    let o = {};
                    o.Amount = (new Number(item["确认量"] * item["进货价"])).toFixed(2);
                    o.Id = 0;
                    o.ItemId = q.Id;
                    o.ItemPurcPrice = q.PurcPrice;
                    o.LargeQty = (new Number(item["确认量"])).toFixed(2);
                    o.MasterId = "0";
                    o.Memo = `本店: ${v["库存量"]}, 迎宾街: ${v["迎宾街库存量"]}`;
                    o.OriginalPrice = q.PurcPrice;
                    o.PackFactor = q.PackFactor;
                    o.Price = (new Number(item["进货价"])).toFixed(2);
                    o.Qty = o.LargeQty;
                    o.RealAmount = "0.00";
                    o.RealQty = "0.00";
                    o.RowNo = ++rowNum;
                    o.SaleAmount = "0.00";
                    o.SalePrice = (new Number(item["零售价"])).toFixed(2);
                    o.StockQty = (0).toFixed(4);
                    o.UnitId = q.UnitId;
                    o.UnitName = q.UnitName;
                    o.operating = " ";
                    o.rowNum = rowNum;
                    Qty += parseFloat(o.Qty);
                    Amount += parseFloat(o.Amount);
                    StockSheetDetail.push(o);
                }
                Qty = (new Number(Qty)).toFixed(2);
                Amount = (new Number(Amount)).toFixed(4);
                this.notify("read-xls-ok", [OperId, __RequestVerificationToken, Qty, Amount, StockSheetDetail]);
            });
            function read() {
                return new Promise(resolve => {
                    let stmt = `SELECT ${Name}.*,条码,品名,系数,进货价,零售价,分类,迎宾街.库存量 AS 迎宾街库存量 FROM ${Name},迎宾街,商品资料 WHERE ${Name}.货号 = 商品资料.货号 AND ${Name}.是否收藏 = 1 AND ${Name}.货号 = 迎宾街.货号 AND ${Name}.需求量 > 0 AND 供应商 = '31043' ORDER BY 零售价`;
                    items.db.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows);
                    });
                });
            }
            function query(BCode) {
                return new Promise(resolve => {
                    request.get({
                          url: `http://star.td365.com.cn/AllocationSheet/Query?t=${Date.now()}&hideCheckbox=true&queryFields=Code&query=${BCode}&popWindow=true&querynumber=144&branchId=15267`,
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
            let ApproveSealFlag = "未审核";
            let ApproveStopAfterSave = "False";
            let ApproveTwiceAfterApprove = "False";
            let ApproverId = "";
            //let BranchId = BranchId;
            //let ChainSheetDetail;
            let ConfirmSave = "false";
            //let DBranchId = "15267";                 // 调入门店
            let DeliveryType = "0";
            let IO = "-";
            let Id = "0";
            let IsAlowSheetCreateItem = "N";
            let IsApprovedTwiceOpened = "True";
            let IsDBAndDbDiffApproveOne = "Y";
            let IsDBAndRGSheet = "Y";
            let IsDBByOriginalSheetsControll = "Y";
            let IsDBDiffSheetOpen = "Y";
            let IsDBSheetApproveTwice = "Y";
            let IsRGSheetApproveOne = "Y";
            let IsRePullInSheet = "False";
            let LargeQty = "1.00";                   // 箱数
            let Memo = "自动出单";
            // let OperDate = fmt(new Date(), "yyyy-MM-dd hh:mm:ss");
            let ModifiedCount = "0";
            let OperDate = fmt(new Date(), "yyyy-MM-dd hh:mm:ss");
            let OperId = "29573";
            let Qty = "1.00";                        // 数量
            let RealAmount = "0.00";
            let RealQty = "0.00";
            let SaleAmount = "0.00";
            let SheetNo = "";
            let Status = "Normal";
            let TransNo = "DB";
            let TwiceApproveDate = "";
            let TwiceApproverId = "";
            let VoucherNo = "";
            let VoucherNoId = "0";
            let WorkerId = "";
            let __RequestVerificationToken = "";
            
            this.watch("read-xls-ok", (e, OperId, __RequestVerificationToken, Qty, Amount, ChainSheetDetail) => {
                let OperDate = fmt(new Date(), "yyyy-MM-dd hh:mm:ss");
                request.post({
                      url: `http://star.td365.com.cn/AllocationSheet/Create?t=${Date.now()}&`,
                      headers: xp.extend({}, headers, {"Content-Type": "application/json"}),
                      body: JSON.stringify({
                          "Amount": Amount,
                          "ApproveDate": ApproveDate,
                          "ApproveSealFlag": ApproveSealFlag,
                          "ApproveStopAfterSave": ApproveStopAfterSave, 
                          "ApproveTwiceAfterApprove": ApproveTwiceAfterApprove,
                          "ApproverId": ApproverId,
                          "BranchId": BranchId,
                          "ChainSheetDetail": ChainSheetDetail,
                          "ConfirmSave": ConfirmSave,
                          "DBranchId": DBranchId,
                          "DeliveryType": DeliveryType,
                          "IO": IO,
                          "Id": Id, 
                          "IsAlowSheetCreateItem": IsAlowSheetCreateItem,
                          "IsApprovedTwiceOpened": "True",
                          "IsDBAndDbDiffApproveOne": "Y",
                          "IsDBAndRGSheet": "Y",
                          "IsDBByOriginalSheetsControll": "Y",
                          "IsDBDiffSheetOpen": "Y",
                          "IsDBSheetApproveTwice": "Y",
                          "IsRGSheetApproveOne": "Y",
                          "IsRePullInSheet": "False",
                          "LargeQty": Qty,
                          "Memo": Memo,
                          "OperDate": OperDate,
                          "ModifiedCount": ModifiedCount,
                          "OperId": OperId,
                          "Qty": Qty,
                          "RealAmount": "0.00",
                          "RealQty": "0.00",
                          "SaleAmount": "0.00",
                          "SheetNo": SheetNo,
                          "Status": Status,
                          "TransNo": TransNo,
                          "TwiceApproveDate": "",
                          "TwiceApproverId": "",
                          "VoucherNo": "", 
                          "VoucherNoId": "0",
                          "WorkerId": OperId,
                          "__RequestVerificationToken":__RequestVerificationToken
                      })
                
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