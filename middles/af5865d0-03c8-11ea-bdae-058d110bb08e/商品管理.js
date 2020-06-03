const inquirer = require("inquirer");
const xmlplus = require("xmlplus");

xmlplus("xsm-to-td365", (xp, $_, t) => {

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Insert id='insert'/>\
                <Update id='update'/>\
              </main>",
        fun: function (sys, items, opts) {
            let inquirer = require("inquirer");
            const promptList = [
                {type: 'list',message: '请选择操作:',name: '操作',choices: ["添加商品","删除商品","修改商品"]}
            ];
            inquirer.prompt(promptList).then(async answers => {
                this.notify(answers.操作);
            });
        }
    },
    Insert: {
        xml: "<Sqlite id='db'/>",
        fun: function (sys, items, opts) {
            const promptList = [
                {type: 'input', message: '请输入货号:', name: '货号'},
                {type: 'input',message: '请输入条码:',name: '条码'},
                {type: 'input',message: '请输入品名:',name: '品名'},
                {type: 'input',message: '请输入系数:',name: '系数'},
                {type: 'input',message: '请输入进货价:',name: '进货价'},
                {type: 'input',message: '请输入零售价:',name: '零售价'},
                {type: 'list',message: '请输入分类:',name: '分类',choices: ["饮料","食品","奶类","日用","玩具","茶酒"]},
                {type: 'list',message: '请输入供应商:',name: '供应商',choices: ["自采供应商","全有商贸"]}
            ];
            this.watch("添加商品", () => {
                inquirer.prompt(promptList).then(async answers => {
                    await insertGood(answers);
                    await insertGood2(answers, "仓库");
                    await insertGood2(answers, "迎宾街");
                    await insertGood2(answers, "总部");
                    await insertGood2(answers, "铜锣湾");
                    await insertGood2(answers, "三生天海");
                    await insertGood2(answers, "钻石园");
                    await insertGood2(answers, "财经中心");
                    await insertGood2(answers, "荣兴");
                });
            });
            let table = {"饮料":1,"食品":2,"奶类":3,"日用":4,"玩具":5,"茶酒":6};
            let table2 = {"自采供应商":"31043","全有商贸":"46251"};
            function insertGood(o) {
                return new Promise((resolve, reject) => {
                    let stmt = items.db.prepare("INSERT INTO 商品资料 (货号,条码,系数,品名,进货价,零售价,分类,供应商) VALUES(?,?,?,?,?,?,?,?)");
                    stmt.run(o.货号.trim(),o.条码.trim(),parseInt(o.系数),o.品名,parseFloat(o.进货价),parseFloat(o.零售价),table[o.分类],table2[o.供应商]);
                    stmt.finalize(() => {
                        console.log("添加基础商品资料成功！");
                        resolve(true);
                    });
                });
            }
            function insertGood2(o, store) {
                return new Promise((resolve, reject) => {
                    let stmt = items.db.prepare(`INSERT INTO ${store} (货号) VALUES(?)`);
                    stmt.run(o.货号.trim());
                    stmt.finalize(() => {
                        console.log(`添加${store}商品资料成功！`);
                        resolve(true);
                    });
                });
            }
        }
    },
    Update: {
        xml: "<Sqlite id='db'/>",
        fun: function (sys, items, opts) {
            this.watch("修改商品", () => {
                const promptList = [
                    {type: 'input', message: '请输入要修改商品的货号:', name: '货号'}
                ];
                inquirer.prompt(promptList).then(async answers => {
                    let o = await info(answers);
                    let promptList2 = [
                        {type: 'input',message: '请输入条码:',name: '条码',default: o.条码},
                        {type: 'input',message: '请输入品名:',name: '品名',default: o.品名},
                        {type: 'input',message: '请输入系数:',name: '系数',default: o.系数}
                    ];
                    inquirer.prompt(promptList2).then(async answers2 => {
                        await updateGood(answers2, answers.货号);
                    });
                });
            });
            function info(o) {
                return new Promise((resolve, reject) => {
                    let stmt = `SELECT * FROM 商品资料 WHERE 货号 = ${o.货号}`;
                    items.db.all(stmt, (err, rows) => {
                        if (err) throw err;
                        resolve(rows[0]);
                    });
                });
            }
            function updateGood(o, code) {
                return new Promise((resolve, reject) => {
                    let stmt = items.db.prepare("UPDATE 商品资料 SET 条码=?,品名=?,系数=? WHERE 货号=?");
                    stmt.run(o.条码.trim(),o.品名.trim(),parseInt(o.系数),code);
                    stmt.finalize(() => {
                        console.log("修改基础商品资料成功！");
                        resolve(true);
                    });
                });
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