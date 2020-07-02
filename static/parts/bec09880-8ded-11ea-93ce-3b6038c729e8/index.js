/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("bec09880-8ded-11ea-93ce-3b6038c729e8", (xp, $_) => {

$_().imports({
    Index: {
        xml: "<div id='index'>\
                <Navbar id='navbar'/>\
                <Content id='content'/>\
              </div>"
    },
    Navbar: {
        css: ".ios .navbar-inner { padding: 0 14px; }\
              .ios .navbar #close { margin-right: 0; padding-right: 10px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='close' class='left'>\
                      <i class='icon f7-icons ios-only'>xmark</i>\
                   </div>\
                   <div class='title'>\
                       <Picker id='title'/>\
                   </div>\
                   <div class='right'/>\
                </div>\
              </div>",
        cfg: {title: { value: "规章制度", values: ["规章制度","日常工作内容"]}},
        fun: function (sys, items, opts) {
            sys.close.on(Click, e => this.trigger("close"));
            sys.title.on("picker-change", e => {
                let title = items.title.value;
                this.notify("title-change", title);
            });
        }
    },
    Content: {
        css: "#rules,#manual { padding-left: 8px; padding-right: 8px; }",
        xml: "<i:ViewStack id='content' class='page' xmlns:i='//miot'>\
                <Rules id='rules'/>\
                <Manual id='manual'/>\
              </i:ViewStack>",
        fun: function (sys, items, opts) {
            sys.content.addClass("page");
            this.watch("title-change", (e, title) => {
                sys.content.trigger("switch", title == "规章制度" ? "rules" : "manual");
            });
        }
    },
    Rules: {
        xml: "<div class='page-content'>\
                 <p>本制度规定了店员一些行为准责以及违规后的惩罚明细</p>\
                 <ol>\
                 <li><p>严禁内盗，一经发现，除了赔偿已知损失外，将扣除所有未发放的工资、奖金，并在群里通报，严重的将报警处理</p></li>\
                 <li><p>严禁使用个人手机收款，收款优先级如下：(现金 == 思迅Pay) =&gt; 拉卡拉设备; 经常检查拉卡拉设备是否足电</p></li>\
                 <li><p>严禁在店内刷抖音、看视频、玩游戏</p></li>\
                 <li><p>不得在收银台内长时间接打与工作无关的电话、语音、视频</p></li>\
                 <li><p>有顾客在店内选购商品时，必须停止与手机相关的电话、语音、视频等行为</p></li>\
                 <li><p>收银时切记钱款到账后，才让顾客拿走商品。如有顾客跑单，请如实上报(仅赔偿商品成本价)。如若隐瞒，一经查实则按商品零售价的双倍赔偿</p></li>\
                 <li><p>非24小时营业的门店，下班时应将所有现金（含营业额与底金）放至保险柜</p></li>\
                 <li><p>自购商品打小票</p></li>\
                 <li><p>严禁赊账或拿身份证及其他证件类的做抵押赊账</p></li>\
                 <li><p>严禁在店内吸烟</p></li>\
                 <li><p>上班时间严禁与他人聚餐喝酒</p></li>\
                 <li><p>上班（所有人）收银必须着工装，严禁坐着进行收银工作</p></li>\
                 <li><p>上班期间如上洗手间，请锁好门并挂好标识牌，严禁由朋友或者其他无关人员代看门店</p></li>\
                 <li><p>夏天空调设定温度不得低于24度</p></li>\
                 <li><p>非24小时营业的门店，中班下班时应确保空调、冰柜门、冷柜门处于关闭状态</p></li>\
                 <li><p>上班不得迟到，迟到不超过1小时扣款25，迟到1-4小时扣款50，迟到超过4小时为旷工，扣款2天基本工资</p></li>\
                 <li><p>发现过期商品在售的，一次扣款25元（店助 20元, 店员 5元）</p></li>\
                 <li><p>固定每周末由店助负责烟草的盘点事项</p></li>\
                 <li><p>销售香烟时，每笔都要刷进烟草零售终端，每月刷烟天数确保在25天以上</p></li>\
                 </ol>\
                 <p>备注：以上条例，若未注明惩罚事项的，每违反一条扣款 25 元。任何员工/门店违反以上任一条例，都将发内部群里通报批评。</p>\
              </div>"
    },
    Manual: {
        xml: "<div class='page-content'>\
                <h2>收银相关</h2>\
                <p>假币识别。</p>\
                <p>防盗，防骗，防跑单，已售出的烟酒不退换。</p>\
                <p>现金结账、思迅Pay结账，拉卡拉结账，退货，挂单取单，会员使用，赠送，查库存，查交易打小票。</p>\
                <p>交接班对账，确保交接班时现金底金足够 <code>1000</code> 元。严禁因现金出错而私自多拿少补，退货，补货等行为。</p>\
                <p>刷烟。</p>\
                <p>槟榔奖票兑奖，饮料盖、酒盖兑奖，一定要清楚换购与直接兑现金的区别。</p>\
                <h2>烟草库存盘点</h2>\
                <p>每周末盘点香烟库存，具体盘点事项由店助安排执行。</p>\
                <h2>设备使用</h2>\
                <p>知道收银机的正常开关机。</p>\
                <p>知道店内灯光，冰柜灯光的开闭。</p>\
                <p>知道门锁，保险柜的使用。</p>\
                <p>知道报警器的使用。</p>\
                <p>知道灭火器的使用。</p>\
                <h2>应急处理</h2>\
                <p>门店着火要及时用灭火器灭火，并通知管理员和拨打119电话。</p>\
                <p>门店停电后，首先应该向管理员汇报，并启用拉卡拉收银。售卖商品时，记录每个商品的名称、数量，支付方式以及金额。</p>\
                <h2>商品管理</h2>\
                <p>平时要多熟悉商品的摆放位置，做到有求必应。</p>\
                <h3>品质</h3>\
                <p>经常性检查是否有临期、过期商品的商品在售。如有，应及时下架。</p>\
                <p>临期商品的界定：对于保质期为半年及以上的商品(含货架和门店库存)，对于2店，产品的保质期前1个月为临期。对于其它门店，产品的保质期前2个月为临期。对于半年以下保质期的商品，保质期的1/10为临期。</p>\
                <h3>标签</h3>\
                <p>每种商品都应该有标有正确价格的标签条，如没有应及时补上；如有错位应及时纠正。</p>\
                <h3>陈列</h3>\
                <p>对于已售卖的商品，货架或者冰柜将出现空缺，应及时补上。</p>\
                <p>若没有多余的库存，则将位于货架里面的商品往外移。</p>\
                <p>若该商品已售罄，则临时以隔壁商品替代，并将相应标签反过来放置。</p>\
                <p>后进先出，日期相对旧的商品应摆放在外面优先售卖。</p>\
                <h3>库存</h3>\
                <p>拆散商品应及时上架，或者封装摆放整齐（仓库包含在内）</p>\
                <p>门店所有堆装要求整齐、统一、丰满（建议高度不得超过1.3米）靠墙商品两排内除外</p>\
                <h3>签收</h3>\
                <p>对于签单的货品，要和配送员根据单据核对好数量与金额，并查看好日期。并以如下格式注明金额与付款日期并签名盖上店章。</p>\
                <p><strong>已收货，未付款，于 <code>2020.05.15</code> 付款 <code>560</code> 元</strong></p>\
                <p>上述的日期固定为次月的 15 日，付款金额以实际情况为准。</p>\
                <p>对于现金结款的单据，需要联系管理员确认。</p>\
                <h2>卫生管理</h2>\
                <p>卫生按区域划分为门面、地板、货架、冰柜以及台面五个区域。上班人员应时刻关注门店的卫生，及时清扫。</p>\
                <h3>门面</h3>\
                <p>玻璃应该整体透亮无明显积灰和胶迹及无乱贴乱写现象</p>\
                <p>门口地面边角无多天积尘或多天未清理大块污渍</p>\
                <h3>地板</h3>\
                <p>地板应干净无明显杂物, 无卫生死角</p>\
                <h3>货架</h3>\
                <p>货架无积灰及清晰可见的污渍</p>\
                <p>货架底部无多天积灰和老鼠屎尿</p>\
                <h3>冰柜</h3>\
                <p>冰柜四周除自然生锈外是否干净无明显积尘，底部无明显的积尘加积水</p>\
                <p>冰柜玻璃起雾结水珠应及时擦拭干净</p>\
                <p>应定期清理冰块，以避免因结冰太多而导致玻璃门无法开启</p>\
                <h3>收银台</h3>\
                <p>收银台区整洁不凌乱无乱堆乱放现象</p>\
                <p>桌椅干净简洁(无跨班未处理的残留物)</p>\
             </div>"
    },
    Picker: {
        css: ".sheet-modal { z-index: 100000; }\
              .ios .list ul:before { height: 0; }\
              .ios .list ul:after { height: 0; }",
        xml: "<div class='list no-hairlines-md'>\
                <ul><li><div class='item-content item-input'><div class='item-inner'><div class='item-input-wrap'>\
                      <input id='input' type='text' readonly='readonly' style='text-align:center; background:#F7F7F8;'/>\
                </div></div></div></li></ul>\
              </div>",
        fun: function (sys, items, opts) {
            let lastValue;
            let picker = app.picker.create({
                inputEl: sys.input.elem(),
                rotateEffect: true,
                toolbarCloseText: "确定",
                value: [opts.value],
                formatValue: (values, displayValues) => {return displayValues[0]},
                cols: [{textAlign: 'center', values: opts.values, displayValues: opts.displayValues || opts.values}],
                on: {
                    opened: p => lastValue = getValue(),
                    closed: p => lastValue == getValue() || sys.input.trigger("picker-change")
                }
            });
            function getValue() {
                return picker.getValue()[0];
            }
            function setValue(value) {
                if (getValue() == value) return;
                picker.setValue([value]);
            }
            return Object.defineProperty({}, "value", { get: getValue, set: setValue });
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}