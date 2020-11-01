/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

const xmlweb = require("xmlweb");
const request = require("request");
const xmlreader = require("xmlreader");
const mchid = "1512944511";                         // 微信支付商户号
const appid = "wx991a253c49c5afac";                 // 公众号APPID
const secret = "77c6914c4af9202c281491cae63956a3";  // 密钥
const mchkey = "c431eda71215891bced9de7991afa73d";  // 安全密钥

let CurrentOrder = null;
xmlweb("6c610b08-85e9-4706-a6b3-3221bf5bc1f7", (xp, $_) => { //leyaoyao

$_().imports({
    Index: {
        xml: "<main id='index'>\
                <Unifiedorder id='unifiedorder'/>\
                <ReceiveNotice id='receiveNotice'/>\
              </main>",
        fun: function (sys, items, opts) {
            this.watch("/ready", (e, p) => this.trigger("to-local", p));
            this.watch("/ready", (e, p) => console.log(p));
        }
    },
    Unifiedorder: {
        xml: "<Flow id='unifiedorder' xmlns:i='unifiedorder'>\
                <i:AccessToken id='accessToken'/>\
                <i:Sign id='sign'/>\
                <i:Unifiedorder id='unifiedorder2'/>\
              </Flow>",
        map: { share: "unifiedorder/PaySignApi" },
        fun: function (sys, items, opts) {
            this.watch("/unifiedorder", items.unifiedorder.start);
        }
    },
    ReceiveNotice: {
        xml: "<i:HTTP xmlns:i='//xmlweb' listen='8000'>\
                <i:Router url='/receive/notice' method='POST'/>\
                <span id='receive'/>\
              </i:HTTP>",
        fun: function (sys, items, opts) {
            const R = "<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>";
            sys.receive.on("enter", (e, d) => {
                d.res.setHeader("Content-Type", "text/html");
                d.res.end(R);
                let b = JSON.parse(CurrentOrder.body.text());
                console.log(b);
                let payload = { link: b.link, pid: b.pid, topic: "/drop", body: {ln:b.ln,col:b.col} };
                this.trigger("to-local", payload);
            });
        }
    },
    Flow: {
        fun: function (sys, items, opts) {
            var ptr, first = this.first();
            this.on("next", (e, r) => {
                e.stopPropagation();
                ptr = ptr.next();
                ptr.trigger("exec", r, false);
            });
            function start(e, p) {
                ptr = first;
                ptr.trigger("exec", p, false);
            }
            return { start: start };
        }
    }
});

$_("unifiedorder").imports({
    AccessToken: {
        fun: function (sys, items, opts) {
            const head = "https://api.weixin.qq.com/sns/oauth2/access_token";
            this.on("exec", (e, payload) => {
                let url = `${head}?appid=${appid}&secret=${secret}&code=${payload.body.code}&grant_type=authorization_code`;
                request.get(url, (error, response, body) => {
                    if (error || response.statusCode !== 200)
                        throw error;
                    body = JSON.parse(body);
                    payload.body.openid = body.openid;
                    this.trigger("next", payload);
                });
            });
        }
    },
    Sign: {
        xml: "<PaySignApi id='api'/>",
        fun: function (sys, items, opts) {
            let uuidv4 = require("uuid/v4");
            let api = items.api;
            this.on("exec", (e, payload) => {
                let b = payload.body;
                b.nonce_str = api.createNonceStr();
                b.timestamp = api.createTimeStamp();
                b.body = JSON.stringify({ln:b.ln,col:b.col,link:payload.link,pid:payload.pid});
                console.log("hello", b.ln, b.col);
                b.out_trade_no = uuidv4().replace(/\-/g, '');
                b.total_fee = api.getMoney(b.money);
                b.spbill_create_ip = b.spbill_create_ip;
                b.notify_url = "http://www.xmlplus.cn:8000/receive/notice";
                b.trade_type = 'JSAPI';
                b.sign = items.api.sign(appid,b.body,mchid,b.nonce_str,b.notify_url,b.out_trade_no,b.spbill_create_ip,b.total_fee,b.trade_type,b.openid,mchkey);
                this.trigger("next", payload);
            });
        }
    },
    Unifiedorder: {
        xml: "<PaySignApi id='api'/>",
        fun: function (sys, items, opts) {
            const url = 'https://api.mch.weixin.qq.com/pay/unifiedorder';
            this.on("exec", (e, payload) => {
                let b = payload.body, formData =
                `<xml>
                    <appid>${appid}</appid>
                    <body><![CDATA[${b.body}]]></body>
                    <mch_id>${mchid}</mch_id>
                    <nonce_str>${b.nonce_str}</nonce_str>
                    <notify_url>${b.notify_url}</notify_url>
                    <out_trade_no>${b.out_trade_no}</out_trade_no>
                    <spbill_create_ip>${b.spbill_create_ip}</spbill_create_ip>
                    <total_fee>${b.total_fee}</total_fee>
                    <trade_type>${b.trade_type}</trade_type>
                    <openid>${b.openid}</openid>
                    <sign>${b.sign}</sign>
                </xml>`;
                let data = { url:url, method:'POST', body: formData };
                request(data, async (error, response, body) => {
                    if (error || response.statusCode !== 200)
                        throw error;
                    body = body.toString("utf-8");
                    let xml = await readxml(body);
                    let prepay_id = xml.prepay_id.text();
                    payload.data = items.api.finalSign(appid,b.timestamp,b.nonce_str,prepay_id,mchkey);
                    CurrentOrder = await readxml(formData);
                    this.trigger("to-user", payload);
                });
                function readxml(body) {
                    return new Promise(resolve => {
                        xmlreader.read(body, (errors, r) => {
                            if (errors !== null)
                                throw errors;
                            resolve(r.xml);
                        });
                    });
                }
            });
        }
    },
    PaySignApi: {
        fun: function (sys, items, opts) {
            function raw(args) {
                var keys = Object.keys(args);
                keys = keys.sort()
                var newArgs = {};
                keys.forEach(key => newArgs[key] = args[key]);
                var string = '';
                for (var k in newArgs)
                    string += '&' + k + '=' + newArgs[k];
                string = string.substr(1);
                return string;
            }
            function getMoney(money) {
                return parseFloat(money) * 100;
            }
            function createNonceStr() {
                return Math.random().toString(36).substr(2, 15);
            }
            function createTimeStamp() {
                return parseInt(new Date().getTime() / 1000) + '';
            }
            function sign(appid, body, mch_id, nonce_str, notify_url, out_trade_no, spbill_create_ip, total_fee, trade_type, openid, mchkey) {
                var ret = {
                    appid: appid,
                    mch_id: mch_id,
                    nonce_str: nonce_str,
                    body: body,
                    notify_url: notify_url,
                    out_trade_no: out_trade_no,
                    spbill_create_ip: spbill_create_ip,
                    total_fee: total_fee,
                    trade_type: trade_type,
                    openid: openid
                };
                var string = raw(ret);
                var key = mchkey;
                string = string + '&key=' + key;
                var crypto = require('crypto');
                return crypto.createHash('md5').update(string, 'utf8').digest('hex').toUpperCase();
            }
            function finalSign(appid,timestamp,noncestr,prepayid,mchkey) {
                var ret = {
                    appId: appid,
                    timeStamp: timestamp,
                    nonceStr: noncestr,
                    package: `prepay_id=${prepayid}`,
                    signType: 'MD5'
                };
                var string = raw(ret);
                var key = mchkey;
                string = string + '&key=' + key;
                var crypto = require('crypto');
                ret.paySign = crypto.createHash('md5').update(string, 'utf8').digest('hex').toUpperCase();
                return ret;
            }
            return { getMoney: getMoney, createNonceStr: createNonceStr, createTimeStamp: createTimeStamp, sign: sign, finalSign: finalSign };
        }
    }
});

});