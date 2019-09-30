/*!
 * index.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("c135d42e-2bc4-4a06-9f9e-054adf44a35d", (xp, $_, t) => { //auto

$_().imports({
    Index: {
        xml: "<div id='index'>\
                <Navbar id='navbar'/>\
                <Content id='content'/>\
              </div>",
        fun: function (sys, items, opts) {
            items.navbar.title(opts.name);
            this.notify("data-change", opts.data);
        }
    },
    Navbar: {
        css: ".ios .navbar-inner { padding: 0 14px; }\
              .ios .navbar #close { margin-right: 0; padding-right: 10px; }",
        xml: "<div id='navbar' class='navbar'>\
                <div class='navbar-inner'>\
                   <div id='close' class='left'>\
                      <i class='icon f7-icons ios-only'>close</i>\
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
        xml: "<div id='content' class='page'>\
                <div id='list' class='page-content'/>\
              </div>",
        map: { nofragment: true },
        fun: function (sys, items, opts) {
            sys.content.on("picker-change", e => {
                clearTimeout(opts.timer);
                opts.timer = setTimeout(update, 10);
            });
            function update() {
                let payload = [];
                let list = sys.list.children().values();
                list.forEach(item => payload.push(item.data()));
                sys.content.trigger("publish", ["schedule", {schedule: payload}]);
            }
            this.watch("data-change", (e, array) => {
                let list = sys.list.children();
                for ( let i = 0; i < array.schedule.length; i++ )
                    (list[i] || sys.list.append("Item")).show().value().init(array.schedule[i]);
                for ( let k = i; k < list.length; k++ )
                    list[k].remove();
            });
        }
    },
    Item: {
        xml: "<div id='item'>\
                <div id='label' class='block-title'/>\
                <TimePicker id='picker'/>\
              </div>",
        fun: function (sys, items, opts) {
            let target, body;
            function init(data) {
                body = data.body;
                target = data.target;
                sys.label.text(data.label);
                items.picker.value = data.pattern;
            }
            function data() {
                return { label: sys.label.text(), pattern: items.picker.value, body: body, target: target };
            }
            return { init: init, data: data };
        }
    },
    TimePicker: {
        css: ".sheet-modal { z-index: 100000; }",
        xml: "<div class='list no-hairlines-md'>\
                <ul><li><div class='item-content item-input'><div class='item-inner'><div class='item-input-wrap'>\
                      <input id='input' type='text' readonly='readonly'/>\
                </div></div></div></li></ul>\
              </div>",
        fun: function (sys, items, opts) {
            let today = new Date();
            let picker = window.app.picker.create({
                inputEl: sys.input.elem(),
                rotateEffect: true,
                toolbarCloseText: "确定",
                value: [today.getHours(), today.getMinutes()],
                cols: [{values: hours()},{divider: true, content: ':'},{values: minutes()}],
                on: { close: p => sys.input.trigger("picker-change") },
                formatValue: (p, values) => {return `${values[0]}:${values[1]}`}
            });
            function hours() {
                let arr = [];
                for (let i = 0; i <= 23; i++) arr.push(i < 10 ? '0' + i : i);
                return arr;
            }
            function minutes() {
                let arr = [];
                for (let i = 0; i <= 59; i++) arr.push(i < 10 ? '0' + i : i);
                return arr;
            }
            function getValue() {
                return picker.value.join(':');
            }
            function setValue(value) {
                if (getValue() == value) return;
                let val = value.split(':');
                picker.setValue([val[0], val[1]]);
            }
            return Object.defineProperty({}, "value", { get: getValue, set: setValue });
        }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}