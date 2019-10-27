/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("eee825dc-d900-47ab-b98c-b4dc9aed31ae", (xp, $_, t) => { //player

$_().imports({
    Index: {
        xml: "<div id='index'>\
                <Navbar id='navbar'/>\
                <Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            let data = {};
            items.navbar.title(opts.name);
            this.trigger("publish", "/ready");
            this.watch("/ready", (e, msg) => {
                data = msg;
                this.notify("data-change", msg);
            });
            this.watch("data-change", (e, msg) => {
                xp.extend(data, msg);
                this.notify("/data-change", data);
            });
        }
    },
    Navbar: {
        css: ".ios .navbar-inner { padding: 0 10px; }\
              .ios .navbar #close { margin-right: 0; width: 22px; height: 22px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='close' class='left'>\
                      <i class='icon f7-icons ios-only' style='margin:auto;'>close</i>\
                   </div>\
                   <div id='title' class='title'/>\
                   <div class='right'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.close.on("touchend", e => this.trigger("close"));
            return { title: sys.title.text };
        }
    },
    Content: {
        css: "#vol { margin-top: 35px; }",
        xml: "<div id='content' class='page' xmlns:i='content'>\
                <div class='page-content'>\
                    <i:Player id='player'/>\
                    <i:Range id='vol'/>\
                    <div class='block-title'>当前歌单</div>\
                    <i:Channel id='channel'/>\
                    <div class='block-title'>同步时间</div>\
                    <i:Interval id='interval'/>\
                </div>\
              </div>",
        map: { nofragment: true },
        fun: function (sys, items, opts) {
            sys.vol.on("range-change", e => {
                this.trigger("publish", ["control", {vol: items.vol.value }]);
            });
            this.watch("/data-change", (e, data) => {
                items.vol.value = data.vol;
            });
        }
    }
});

$_("content").imports({
    Player: {
        css: "#toggle { margin: 10px auto; }\
              #ctrl { text-align: center; margin-top: 16px; }\
              #skip_next { margin-left: 16px; }",
        xml: "<div id='player' xmlns:i='player'>\
                <i:Title id='title'/>\
                <div id='ctrl'>\
                  <i:Toggle id='toggle'/>\
                  <i:SkipNext id='skip_next'/>\
                </div>\
              </div>"
    },
    Range: {
        xml: "<div id='range' class='list simple-list'>\
              <ul>\
                <li>\
                  <div class='item-cell width-auto flex-shrink-0'>\
                    <i class='icon f7-icons ios-only'>volume_mute_fill</i>\
                    <i class='icon material-icons md-only'>volume_mute</i>\
                  </div>\
                  <div class='item-cell flex-shrink-3'>\
                    <div id='range' class='range-slider range-slider-init'>\
                      <input id='input' type='range' min='0' max='100' step='1' value='10'/>\
                    </div>\
                  </div>\
                  <div class='item-cell width-auto flex-shrink-0'>\
                    <i class='icon f7-icons ios-only'>volume_fill</i>\
                    <i class='icon material-icons md-only'>volume_up</i>\
                  </div>\
                </li>\
              </ul>\
            </div>",
        fun: function (sys, items, opts) {
            let timer;
            let range = app.range.create({
                label: true,
                el: sys.range.elem()
            });
            range.on("change", e => {
                clearTimeout(timer);
                timer = setTimeout(e => this.trigger("range-change"), 300); 
            });
            function getValue() {
                return range.getValue();
            }
            function setValue(value) {
                parseInt(getValue()) != value && range.setValue(value)
            }
            return Object.defineProperty({}, "value", { get: getValue, set: setValue });
        }
    },
    Channel: {
        xml: "<Picker id='channel'/>",
        cfg: {channel: { value: "云音乐热歌榜", values: ["轻音乐","新年歌单","云音乐热歌榜"]}},
        fun: function (sys, items, opts) {
            sys.channel.on("picker-change", e => {
                clearTimeout(opts.timer);
                opts.timer = setTimeout(update, 10);
            });
            function update() {
                sys.channel.trigger("publish", ["control", {channel: items.channel.value}]);
            }
            this.watch("/data-change", (e, data) => {
                items.channel.value = data.channel;
            });
        }
    },
    Interval: {
        xml: "<Picker id='interval'/>",
        cfg: {interval: {value: "60", values: ["3", '60', '120'], displayValues: ["3分钟","1小时","2小时"]}},
        fun: function (sys, items, opts) {
            sys.interval.on("picker-change", e => {
                clearTimeout(opts.timer);
                opts.timer = setTimeout(update, 10);
            });
            function update() {
                sys.interval.trigger("publish", ["control", {interval: items.interval.value}]);
            }
            this.watch("/data-change", (e, data) => {
                items.interval.value = data.interval;
            });
        }
    },
    Picker: {
        css: ".sheet-modal { z-index: 100000; }",
        xml: "<div class='list no-hairlines-md'>\
                <ul><li><div class='item-content item-input'><div class='item-inner'><div class='item-input-wrap'>\
                      <input id='input' type='text' readonly='readonly'/>\
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

$_("content/player").imports({
    Title: {
        css: "#title { text-align: center; }", 
        xml: "<div id='title' class='block-title'>标题</div>",
        fun: function (sys, items, opts) {
            this.watch("/data-change", (e, data) => {
                data.song && sys.title.text(data.song.name);
            });
        }
    },
    Toggle: {
        css: "#toggle { display: inline; }\
              #toggle, #toggle > * { width: 64px; height: 64px; }\
              #toggle i { font-size: 64px; }",
        xml: "<ViewStack id='toggle'>\
                <i id='play' class='icon f7-icons ios-only'>play_round</i>\
                <i id='pause' class='icon f7-icons ios-only'>pause_round</i>\
                <i id='ready' class='icon f7-icons ios-only'>world</i>\
              </ViewStack>",
        fun: function (sys, items, opts) {
            let table = { play: "pause", pause: "play", ready: "ready" };
            sys.toggle.on("touchend", "./*[@id]", function () {
                sys.toggle.trigger("switch", table[this]);
                sys.toggle.trigger("publish", ["control", {stat: this.toString()}]);
            });
            this.watch("/data-change", (e, data) => {
                sys.toggle.trigger("switch", table[data.stat]);
            });
        }
    },
    SkipNext: {
        css: "#skip_next { width: 64px; height: 64px; font-size: 64px; }",
        xml: "<i id='skip_next' class='icon f7-icons ios-only'>refresh_round</i>",
        fun: function (sys, items, opts) {
            let key = 0;
            sys.skip_next.on("touchend", () => {
                this.trigger("publish", ["control", {next: ++key % 3}]);
            });
        }
    },
    ViewStack: {
        xml: "<div id='viewstack'/>",
        fun: function (sys, items, opts) {
            var args, children = this.children(),
                table = children.call("hide").hash(),
                ptr = table[opts.index] || children[0];
            if (ptr) ptr = ptr.trigger("show", null, false).show();
            this.on("switch", function (e, to) {
                table = this.children().hash();
                if ( !table[to] || table[to] == ptr ) return;
                e.stopPropagation();
                args = [].slice.call(arguments).slice(2);
                ptr.trigger("hide", [to+''].concat(args)).hide();
                ptr = table[to].trigger("show", [ptr+''].concat(args), false).show();
            });
            return Object.defineProperty({}, "selected", { get: () => {return ptr}});
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}
