let requestx = require("request");
let jar = requestx.jar();
let request = requestx.defaults({jar: jar});
let cheerio = require("cheerio");
let headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Content-Type": "application/x-www-form-urlencoded"
};

let Name = "荣兴";        // 天店名称
let TenantCode = "";      // 天店商户 ID
let UserAccountN = "";    // 天店用户名
let BranchId = "";        // 分店 ID
let PasswordN = "";       // 天店密码
const PATH = `${__dirname}/缓存/`;
const DAYS = 16;

navigator = undefined;
const xmlplus = require("xmlplus");

xmlplus("app", (xp, $_, t) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Config id='config'/>\
                <Tiandian id='tiandian'/>\
              </main>",
        fun: function (sys, items, opts) {
            let argvs = process.argv.slice(1);
            if (argvs.length > 1) 
                Name = argvs[1];
            let o = items.config[Name];
            BranchId = o.BranchId;
            TenantCode = o.TenantCode;
            UserAccountN = o.UserAccountN;
            PasswordN = o.PasswordN;
            sys.tiandian.notify("login").once("login-ok", () => sys.tiandian.notify("download"));
        }
    },
    Tiandian: {
        xml: "<main id='index' xmlns:i='tiandian'>\
                <i:Login id='login'/>\
                <i:Download id='download'/>\
                <i:ReadXLS id='readxls'/>\
                <i:CreateData id='createData'/>\
              </main>",
        map: { msgscope: true },
        fun: function (sys, items, opts) {
            this.watch("login", e => console.log("正在登录天店后台..."), 1);
            this.on("login-ok", e => console.log("已成功登录天店后台"), 1);
            this.watch("download", e => console.log("开始下载库存及日流水..."), 1);
            this.on("download-ok", e => console.log("已完库存及流水的下载"), 1);
            this.watch("read-xls", e => console.log("开始读取库存及流水..."), 1);
            this.on("read-xls-ok", e => console.log("已完库存及流水的读取"), 1);
            this.watch("create-data", e => console.log("开始创建日汇总数据..."), 1);
            this.on("create-data-ok", e => console.log("已完成日汇总数据的创建"), 1);
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
            this.watch("login", () => {
                let LOGIN = "http://passport.td365.com.cn/Account/Login";
                request(LOGIN, (error, response, body) => {
                    if ( error || response.statusCode !== 200 )
                        throw error;
                    let $ = cheerio.load(body);
                    let token = $('[name=__RequestVerificationToken]')[0].attribs.value;
                    request.post({
                          url: LOGIN,
                          headers: headers,
                          form: {__RequestVerificationToken:token, TenantCode: TenantCode, UserAccountN: UserAccountN, PasswordN: PasswordN, LoginType: 1}
                    }, (error, httpResponse, body) => {
                        if ( error || response.statusCode !== 200 )
                             throw error;
                        let $ = cheerio.load(body);
                        if ($('title').text() !== "Object moved")
                            throw error;
                        this.trigger("login-ok");
                    });
                });
            });
        }
    },
    Download: {
        xml: "<main id='download'/>",
        fun: function (sys, items, opts) {
            let count = 0, fs = require("fs");
            this.watch("download", e => {
                count = 0;
                let storage = `http://star.td365.com.cn/RptStmCost/Export?pageIndex=5&SortOptions={"Column":"StockQty","Direction":"Descending"}&query=&queryFields=ItemCode,ItemName,SelfCode,Mnemonic&advancedQuery=[{"Field":"BranchId","Operator":"Equals","Value":"${BranchId}"},{"Field":"Branch.Name","Operator":"Equals","Value":"${Name}"},{"Field":"BrandId","Operator":"Equals","Value":"88427"},{"Field":"Brand.Name","Operator":"Equals","Value":"在售商品"}]`;
                download(encodeURI(storage), "库存成本");
                //download(daily_summary(), "商品流水");
            });
            function download(path, filename) {
                let stream = fs.createWriteStream(`${PATH}/${filename}.xls`);
                stream.once('error', error => {throw error});
                stream.once('finish', e => {
                    ++count == 1 && sys.download.trigger("download-ok").notify("read-xls");
                    //++count == 2 && sys.download.trigger("download-ok").notify("read-xls");
                });
                request(path).pipe(stream);
            }
            function daily_summary() {
                let now = new Date;
                let dfrom = fmt(minus(now, DAYS - 1)); // 6, 27, 83
                let dto = fmt(now);
                return encodeURI(`http://star.td365.com.cn/RptFlow/Export?Ids=&pageIndex=14&SortOptions={"Column":"OperDate","Direction":"Descending"}&query=&queryFields=BillNo,ItemCode,ItemName,BillNo,ItemCode,ItemName&advancedQuery=[{"Field":"BranchId","Operator":"Equals","Value":"${BranchId}"},{"Field":"Branch.Name","Operator":"Equals","Value":"${Name}"},{"Field":"CategoryId","Operator":"Equals","Value":"53830"},{"Field":"Category.Name","Operator":"Equals","Value":"烟草"},{"Field":"GroupType","Value":"Item"},{"Field":"OperDate","Value":"${dfrom},${dto}","Operator":"Between"}]`);
            }
            function minus(date,inc){
                var a = new Date(date);
                a = a.valueOf();
                a = a - inc * 24 * 60 * 60 * 1000;
                return new Date(a);
            }
            function fmt(date) {
                let m = date.getMonth() + 1;
                let d = date.getDate();
                return date.getFullYear() + "-" + (m < 10 ? '0' + m : m) + "-" + (d < 10 ? '0' + d : d);
            }
        }
    },
    ReadXLS: {
        xml: "<main id='readxls'/>",
        fun: function (sys, items, opts) {
            let count, table = {};
            let node_xj = require("xls-to-json-2");
            this.watch("read-xls", (e, tables) => {
                count = 0;
                table = {};
                read("库存成本");//("商品流水");
            });
            function read(filename) {
                node_xj({
                    input: `${PATH}/${filename}.xls`,
                    output: null,
                    field_name_row: 1
                }, (err, result) => {
                    if (err) throw err;
                    table[filename] = result;
                    //++count == 2 && sys.readxls.trigger("read-xls-ok").notify("create-data", table);
                    ++count == 1 && sys.readxls.trigger("read-xls-ok").notify("create-data", table);
                });
                return read;
            }
        }
    },
    CreateData: {
        xml: "<Sqlite id='sqlite'/>",
        fun: function (sys, items, opts) {
            this.watch("create-data", async (e, table2) => {
                let stock = table2["库存成本"];
                await clearSummary();
                for (let item of stock)
                    await updateStock(item["货号"], item["库存数量"]);
                this.trigger("create-data-ok");
            });
            function clearSummary() {
                return new Promise((resolve, reject) => {
                    let str = `UPDATE '${Name}' SET 库存量=0`;
                    let stmt = items.sqlite.prepare(str);
                    stmt.run(function(err) {
                        if (err) throw err;
                        resolve(this.changes);
                    });
                });
            }
            function updateStock(BCode, Stock) {
                return new Promise((resolve, reject) => {
                    let stmt = items.sqlite.prepare(`UPDATE '${Name}' SET 库存量=? WHERE 货号=?`);
                    stmt.run(Stock, BCode, function(err) {
                        if (err) throw err;
                        resolve(this.changes);
                    });
                })
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

}).startup("//app/Index");