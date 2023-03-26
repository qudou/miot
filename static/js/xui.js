/*!
 * miot.js v1.2.01
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */


xmlplus("xp", (xp, $_) => {

let ev = xmlplus.events;

$_().imports({
    Applet: { 
        xml: "<div id='applet'/>",
        fun: function (sys, items, opts) {
            this.on("#/popup/open", (e) => {
                e.stopPropagation();
                let elem = this.elem();
                let kids = elem.childNodes;
                let i, idx, zIndex = 0;
                for (i = 0; i < kids.length; i++) {
                    if (kids[i].nodeType == 1) {
                        idx = _zIndex(kids[i]);
                        idx != "auto" && (zIndex = Math.max(zIndex, idx));
                    }
                }
                elem.appendChild(e.target.elem());
                e.target.css("z-index", zIndex);
            });
            function _zIndex(elem) {
                return elem.style["z-index"] || getComputedStyle(elem, "").getPropertyValue("z-index");
            }
            this.on(ev.touchend, (e) => this.notify("#/app/click", e));
        }
    },
    Navbar: {
        css: "#navbar { display: flex; justify-content: space-between; align-items:center; position: relative; z-index: 2; height: 44px; box-sizing: border-box; padding: 0 10px; font-size: 17px; background: #f7f7f8; }\
              #navbar:after { content: ''; position: absolute; background-color: #c4c4c4; display: block; z-index: 15; top: auto; right: auto; bottom: 0; left: 0; height: 1px; width: 100%; transform-origin: 50% 100%; }\
              #navbar a:active { opacity: 0.5; }\
              #left { width: 60px; display: flex; fill: #007aff; cursor: pointer; }\
              #icon { display: flex; }\
              #icon svg { width: 24px; height: 24px; }\
              #title { display: inline-block; font-weight: 600; }\
              #right { width: 60px; text-align: right; }\
              #menu { height: 44px; line-height: 44px; margin-right: 4px; outline: 0; color: #007aff; cursor: pointer; text-decoration: none; }",
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'/>\
                 </div>\
                 <div id='title'>title</div>\
                 <div id='right'>\
                    <a id='menu'/>\
                 </div>\
              </div>",
        fun: function (sys, items, opts) {
            sys.icon.append(`//xp/assets/${opts.icon || 'Close'}`);
            sys.title.text(opts.title);
            opts.menu && sys.menu.text(opts.menu);
            sys.icon.on(ev.touchend, () => this.trigger("iconClick"));
            sys.menu.on(ev.touchend, () => this.trigger("menuClick"));
            return { title: sys.title.text };
        }
    },
    Content: {
        css: "#page { background: #efeff4; box-sizing: border-box; position: absolute; left: 0; top: 0; width: 100%; height: 100%; contain: layout size style; }\
              #content { padding-top: 44px; overflow: auto; box-sizing: border-box; height: 100%; position: relative; z-index: 1; contain: layout size style; will-change: scroll-position; }",
        xml: "<div id='page'>\
                 <div id='content'/>\
              </div>",
        map: { appendTo: "content" },
        fun: function (sys, items, opts) {
            this.on("#/scroll/to", (e, input, sheet) => { // used by Picker
                e.stopPropagation();
                let content = sys.content;
                let paddingTop = parseInt(content.css('padding-top'), 10);
                let paddingBottom = parseInt(content.css('padding-bottom'), 10);
                let pageHeight = content.elem().offsetHeight - paddingTop - parseInt(sheet.height(), 10);
                let pageScrollHeight = content.elem().scrollHeight - paddingTop - parseInt(sheet.height(), 10);
                let pageScroll = content.scrollTop();
                let scrollElTop = input.offset().top - paddingTop + input.elem().offsetHeight;
                if (scrollElTop > pageHeight) {
                    let scrollTop = pageScroll + scrollElTop - pageHeight;
                    if (scrollTop + pageHeight > pageScrollHeight) {
                        let newPaddingBottom = scrollTop + pageHeight - pageScrollHeight + paddingBottom;
                        if (pageHeight === pageScrollHeight) {
                            newPaddingBottom = sheet.height();
                        }
                        content.css("padding-bottom", `${newPaddingBottom}px`);
                    }
                    content.scrollTop(scrollTop);
                }
            });
            this.on("#/popup/close", (e) => sys.content.css("padding-bottom", ''));
        }
    },
    Picker: {
        css: "#popup > *:last-child { background: #FFF; }\
              #picker { width: 100%; }",
        xml: "<div id='picker'>\
                <Input id='input' xmlns='picker'/>\
                <Popup id='popup' modal='false'/>\
              </div>",
        map: { attrs: {input: "placeholder" }, appendTo: "popup" }, 
        opt: { updateOnTouchmove: true, formatValue: (values, displayValues) => {return displayValues.join(' ')} },
        fun: function (sys, items, opts) {
            let _values = [];
            let _displayValues = [];
            let scrollValues = [];
            let scrollDisplayValues = [];
            sys.input.on(ev.touchend, () => {
                if (sys.popup.css("display") == "block")
                    return;
                items.popup.show();
                let picker = this.last().val();
                for (let i = 0; i < _values.length; i++) 
                    picker.model[i].value = _values[i];
            });
            sys.popup.on("change", (e, col, values, displayValues, onScroll) => {
                e.stopPropagation();
                scrollValues = values;
                scrollDisplayValues = displayValues;
                if (onScroll && !opts.updateOnTouchmove) return;
                _values = values;
                _displayValues = displayValues;
                sys.input.prop("value", opts.formatValue(_values, _displayValues));
            });
            sys.popup.on("close", (e) => {
                e.stopPropagation();
                items.popup.hide();
            });
            sys.popup.on("confirm", (e) => {
                e.stopPropagation();
                _values = scrollValues;
                _displayValues = scrollDisplayValues;
                sys.input.prop("value", opts.formatValue(_values, _displayValues));
            });
            sys.popup.on("#/popup/open", (e, sheet) => {
                setTimeout(()=> sys.picker.trigger("#/scroll/to", [sys.input, sheet]),0);
            });
        }
    },
    Popup: {
        css: "#popup { display: none; position: absolute; left: 0; bottom: 0; width: 100%; height: 100%; }\
              #mask { position: absolute; width: 100%; height: 100%; background: rgba(0,0,0,.3); visibility: hidden; opacity: 0; transition-duration: .3s; }\
              #mshow { visibility: visible; opacity: 1; }\
              #sheet { position: absolute; left: 0; bottom: 0; width: 100%; max-height: 100%; overflow: auto; transition-duration: .3s; transform: translate3d(0,100%,0); transition-property: transform; will-change: transform; }\
              #modal-in { transform: translate3d(0,calc(-1 * env(safe-area-inset-bottom)),0); }",
        xml: "<div id='popup'>\
                 <div id='mask'/>\
                 <div id='sheet'/>\
              </div>",
        map: { appendTo: "sheet" }, 
        fun: function (sys, items, opts) {
            let modal = !(opts.modal == "false");
            modal || sys.mask.hide();
            function onclick(e, el) {
                if (sys.popup.css("display") == "block")
                    sys.sheet.contains(el.target) || hide();
            }
            function show() {
                sys.popup.show().trigger("#/popup/open", sys.sheet);
                modal || sys.popup.height(sys.sheet.height());
                setTimeout(() => {
                    sys.mask.addClass("#mshow");
                    sys.sheet.addClass("#modal-in");
                    sys.popup.watch("#/app/click", onclick)
                },10);
            }
            let parent = this.elem().parentNode;
            function hide() {
                sys.popup.unwatch("#/app/click");
                sys.mask.removeClass("#mshow");
                sys.sheet.removeClass("#modal-in");
                sys.sheet.once("transitionend", () => {
                    parent.appendChild(sys.popup.elem());
                    sys.popup.trigger("#/popup/close").hide();
                });
            }
            return { show: show, hide: hide };
        } 
    },
    ViewStack: {
        css: "#viewstack { position: relative; overflow: hidden; }\
              #viewstack > * { position: absolute; width: 100%; height: 100%; transition-duration: .3s; transform: translate3d(100%,0,0); }",
        xml: "<div id='viewstack'/>",
        map: { msgFilter: /#\/view\/ready/ },
        fun: function (sys, items, opts) {
            let kids = this.kids().hash();
            let stack = [kids[opts.index] || this.first()]; 
            stack.length && stack[0].css("transform", "translate3d(0,0,0)");
            // "to" is element name of target.
            this.on("goto", function (e, to) {
                e.stopPropagation();
                let last = stack[stack.length - 1];
                if (!kids[to] || kids[to] == last) return;
                last.css("transform", "translate3d(-100%,0,0)");
                stack.push(kids[to]);
                kids[to].css("transform", "translate3d(0,0,0)");
                let args = [].slice.call(arguments).slice(2);
                kids[to].once("transitionend", (e) => {
                    kids[to].notify("#/view/ready", [last+''].concat(args), false);
                });
                kids[to].css("transition-duration") == "0s" && kids[to].trigger("transitionend", [], false);
            });
            this.on("back", function (e) {
                e.stopPropagation();
                if (stack.length <= 1) return;
                let old = stack.pop();
                old && old.css("transform", "translate3d(100%,0,0)");
                let cur = stack[stack.length - 1];
                cur.css("transform", "translate3d(0,0,0)");
                let args = [].slice.call(arguments).slice(1);
                cur.once("transitionend", (e) => {
                    cur.notify("#/view/ready", [old+''].concat(args), false);
                });
                cur.css("transition-duration") == "0s" && cur.trigger("transitionend", [], false);
            });
        }
    },
    Table: {
        css: "#table { overflow-x: auto; }\
              #content { width: 100%; border: none; padding: 0; margin: 0; border-collapse: collapse; text-align: left; }\
              #card { background: #fff; position: relative; border-radius: 2px; font-size: 14px; box-shadow: 0 1px 2px rgb(0 0 0 / 30%); margin: 10px; }\
              #table thead { font-size: 12px; }\
              #table td, #table th { padding: 0; position: relative; padding-left: 15px; padding-right: 15px; height: 44px; }\
              #table th { font-weight: 600; color: #8e8e93; }\
              #table td:before { content: ''; position: absolute; background-color: #c8c7cc; display: block; z-index: 15; top: 0; right: auto; bottom: auto; left: 0; height: 1px; width: 100%; transform: scaleY(.5); transform-origin: 50% 0; }",
        xml: "<div id='table'>\
                 <table id='content'/>\
              </div>",
        map: { appendTo: "content" },
        fun: function (sys, items, opts) {
            opts.card && sys.table.addClass("#card").addClass("card");
        }
    },
    Toast: {
        css: "#toast { transition-property: transform,opacity; position: absolute; z-index: 20000; color: #FFF; font-size: 14px; box-sizing: border-box; background-color: rgba(0, 0, 0, 0.75); opacity: 0; }\
              #toast { transition-duration: .3s; width: 100%; left: 0; top: 0; transform: translate3d(0,-100%,0); }\
              #modal-in { opacity: 1; transform: translate3d(0,0%,0); }\
              #content { display: flex; justify-content: center; align-items: center; box-sizing: border-box; padding: 12px 16px; }\
              #text { line-height: 20px; flex-shrink: 1; min-width: 0; }",
        xml: "<div id='toast'>\
                <div id='content'>\
                  <div id='text'/>\
                </div>\
              </div>",
        fun: function (sys, items, opts) {
            function open(msg) {
                clearTimeout(opts);
                sys.toast.hide().show();
                sys.text.text(msg);
                sys.toast.addClass("#modal-in");
                opts = setTimeout(close, 3000);
            }
            function close() {
                sys.toast.removeClass("#modal-in");
            }
            return { open: open };
        }
    }
});

$_("assets").imports({
    About: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                <path d='M507.577907 23.272727C240.142852 23.272727 23.272727 239.870837 23.272727 507.094323 23.272727 774.535126 240.153546 991.375225 507.577907 991.375225 775.101356 991.375225 991.883087 774.596878 991.883087 507.094323 991.883087 239.824352 775.104293 23.272727 507.577907 23.272727ZM507.577907 69.818182C749.408866 69.818182 945.337633 265.541628 945.337633 507.094323 945.337633 748.890368 749.395172 944.82977 507.577907 944.82977 265.857934 944.82977 69.818182 748.826829 69.818182 507.094323 69.818182 265.590268 265.836128 69.818182 507.577907 69.818182ZM460.17174 368.061568 555.443661 368.061568 555.443661 763.664179 460.17174 763.664179 460.17174 368.061568ZM507.761743 230.268948C534.095946 230.268948 555.397702 251.580874 555.397702 277.899264 555.397702 304.171723 534.072967 325.506614 507.761743 325.506614 481.450515 325.506614 460.17174 304.171723 460.17174 277.899264 460.17174 251.580874 481.450515 230.268948 507.761743 230.268948Z'/>\
              </svg>"
    },
    Area: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                <path d='M309.474912 719.986985c26.89658 0 48.695049-21.798469 48.695049-48.646953l-49.715285-264.667915c0-26.920116-21.798469-48.767703-48.695049-48.767703L136.249639 357.904413c-26.89658 0-48.646953 21.847587-48.646953 48.767703l49.715285 264.667915c0 26.848485 21.750373 48.646953 48.646953 48.646953L309.474912 719.986985z' p-id='6348'></path><path d='M591.985194 719.986985c26.89658 0 48.646953-21.798469 48.646953-48.646953l49.714262-476.756311c0-26.89658-21.750373-48.719608-48.646953-48.719608L418.711825 145.864112c-26.847461 0-48.744167 21.823028-48.744167 48.719608l49.715285 476.756311c0 26.848485 21.895683 48.646953 48.743144 48.646953L591.985194 719.986985z' p-id='6349'></path><path d='M874.446357 719.986985c26.89658 0 48.744167-21.798469 48.744167-48.646953L923.190525 547.709293c0-26.921139-21.847587-48.743144-48.744167-48.743144l-73.844845 0c-26.846438 0-35.634592 15.730263-48.694025 48.743144l-49.715285 123.630738c0 26.848485 21.847587 48.646953 48.695049 48.646953L874.446357 719.986985z' p-id='6350'></path><path d='M913.139611 773.779122 146.930909 773.779122c-12.720719 0-23.206538 10.414187-23.206538 23.231097 0 12.792351 18.157545 53.550637 30.974455 53.550637l758.440785-30.271444c12.769838 0 23.25668-10.486842 23.25668-23.279193C936.395268 784.193309 925.908426 773.779122 913.139611 773.779122z'/>\
              </svg>"
    },
    Auto: {
        xml: '<svg viewBox="0 0 1024 1024">\
                <path d="M537.7 338.2c34.4 0 66.8 13.4 91.1 37.7 24.3 24.3 37.7 56.6 37.7 90.9v0.9l-0.2 40.9 40.7 4.1c14.3 1.5 27.6 8.2 37.3 18.9 9.8 10.8 15.2 24.8 15.2 39.4 0 32.3-26.3 58.6-58.6 58.6-0.8 0-1.7 0-2.6-0.1l-47-2.1v2.1H352.1l-2-0.1c-23.1-0.9-44.7-10.5-60.7-27.2-16.1-16.7-25-38.7-25-61.9 0-49.1 40-89.1 89.1-89.1 4.6 0 9.2 0.4 13.8 1.1l36.6 5.6 12.6-34.8c8.9-24.7 25-45.8 46.4-61.2 21.9-15.4 47.7-23.7 74.8-23.7M497.3 72c-112.6 0-225.2 43-311.1 128.9C42 345.1 18.8 564.6 116.7 733l-52.3-16.8L50.7 759l80.9 26 42.8 13.8L214.2 675l-42.8-13.8-15.8 49.1c-9.2-15.9-17.4-32.5-24.3-49.7-19.2-47.3-28.9-97.3-28.9-148.7 0-51.3 9.7-101.3 28.9-148.7 19.9-49 49.1-92.9 86.8-130.6 37.7-37.7 81.7-66.9 130.6-86.8C396 126.7 446 117 497.3 117s101.3 9.7 148.7 28.9c28.8 11.7 55.9 26.6 80.9 44.6l32.2-32.2C681.6 100.8 589.5 72 497.3 72z m352.3 148.4l-39.8 123.8 42.8 13.8 15-46.7c9.8 16.6 18.4 34 25.8 52.1 19.2 47.3 28.9 97.3 28.9 148.7 0 51.3-9.7 101.3-28.9 148.7-19.9 49-49.1 92.9-86.8 130.6C768.9 829 725 858.2 676 878.1c-47.3 19.2-97.3 28.9-148.7 28.9-51.3 0-101.3-9.7-148.7-28.9-28.8-11.7-55.9-26.6-80.9-44.6l-32.2 32.2C330 913.5 428.2 951 534.2 951c101.9 0 211-34.6 304.2-127.8 145.8-145.8 167.9-368.6 66.1-537.7l55 17.7 13.8-42.8-80.9-26-42.8-14z m-311.9 72.8c-75.3 0-139.3 47.8-163.5 114.8-6.7-1-13.6-1.6-20.6-1.6-74.1 0-134.1 60.1-134.1 134.1 0 72.4 57.4 131.4 129.1 134v0.1h347.7v-0.1c1.5 0.1 3.1 0.1 4.6 0.1 57.2 0 103.6-46.4 103.6-103.6 0-53.6-40.8-97.8-93-103.1v-1c0-95.8-77.9-173.7-173.8-173.7z"/>\
              </svg>'
    },
    Backward: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                <path d='M398.64 512l271.53 271.529c16.662 16.662 16.662 43.677 0 60.34-16.662 16.662-43.678 16.662-60.34 0l-301.699-301.7c-16.662-16.661-16.662-43.677 0-60.339l301.7-301.699c16.661-16.662 43.677-16.662 60.339 0 16.662 16.663 16.662 43.678 0 60.34L398.64 512z'/>\
              </svg>"
    },
    Close: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                <path id='path' d='M556.8 512L832 236.8c12.8-12.8 12.8-32 0-44.8-12.8-12.8-32-12.8-44.8 0L512 467.2l-275.2-277.333333c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8l275.2 277.333333-277.333333 275.2c-12.8 12.8-12.8 32 0 44.8 6.4 6.4 14.933333 8.533333 23.466666 8.533333s17.066667-2.133333 23.466667-8.533333L512 556.8 787.2 832c6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466666-8.533333c12.8-12.8 12.8-32 0-44.8L556.8 512z'/>\
              </svg>"
    },
    Home: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                <path d='M949.082218 519.343245 508.704442 107.590414 68.326667 518.133697c-8.615215 8.03193-9.096169 21.538549-1.043772 30.144554 8.043187 8.599865 21.566178 9.085936 30.175253 1.035586l411.214573-383.337665 411.232992 384.505257c4.125971 3.854794 9.363252 5.760191 14.5903 5.760191 5.690606 0 11.384281-2.260483 15.58393-6.757914C958.138478 540.883841 957.695387 527.388479 949.082218 519.343245L949.082218 519.343245zM949.082218 519.343245M814.699602 527.800871c-11.787464 0-21.349237 9.555633-21.349237 21.327748l0 327.037405L622.552373 876.166023 622.552373 648.662543 394.824789 648.662543l0 227.503481L224.032938 876.166023 224.032938 549.128619c0-11.772115-9.55154-21.327748-21.348214-21.327748-11.802814 0-21.35333 9.555633-21.35333 21.327748l0 369.691877 256.19494 0L437.526333 691.318038l142.329613 0 0 227.502457 256.1888 0L836.044746 549.128619C836.045769 537.356504 826.481949 527.800871 814.699602 527.800871L814.699602 527.800871zM814.699602 527.800871M665.254941 222.095307l128.095423 0 0 113.74867c0 11.789511 9.562796 21.332864 21.349237 21.332864 11.783371 0 21.346167-9.543354 21.346167-21.332864L836.045769 179.439812 665.254941 179.439812c-11.789511 0-21.35333 9.538237-21.35333 21.327748C643.900587 212.554 653.464407 222.095307 665.254941 222.095307L665.254941 222.095307zM665.254941 222.095307'/>\
              </svg>",
    },
    Password: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                 <path d='M801.469 307.63C786.431 158.27 662.45 41.37 512.219 41.37s-274.206 116.9-289.25 266.265c-76.117 16.828-133.525 89.194-133.525 175.664l0 318.162c0 98.889 75.101 179.351 167.411 179.351l510.74 0c92.309 0 167.405-80.463 167.405-179.351L935 483.299C935 396.829 877.592 324.463 801.469 307.63zM512.219 109.916c111.879 0 204.564 84.381 220.843 194.014L291.376 303.93C307.661 194.297 400.34 109.916 512.219 109.916zM867.845 801.461c0 61.095-44.972 110.805-100.251 110.805l-510.74 0c-55.284 0-100.262-49.709-100.262-110.805L156.592 483.299c0-61.108 44.978-110.823 100.262-110.823l510.74 0c55.279 0 100.251 49.716 100.251 110.823L867.845 801.461z'/>\
                 <path d='M476.066 605.066c-9.487 9.689-15.113 23.279-15.113 36.905 0 13.849 5.627 27.468 15.113 37.15 9.493 9.689 22.812 15.189 36.159 15.189 13.591 0 26.659-5.5 36.396-15.189 9.493-9.933 14.876-23.301 14.876-37.15 0-13.625-5.383-27.216-15.127-36.905C529.397 585.444 495.298 585.696 476.066 605.066z'/>\
              </svg>"
    },
    Router: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                <path d='M768 864H256c-70.4 0-128-57.6-128-128v-128c0-70.4 57.6-128 128-128h64V192c0-17.6 14.4-32 32-32s32 14.4 32 32v288h256V192c0-17.6 14.4-32 32-32s32 14.4 32 32v288h64c70.4 0 128 57.6 128 128v128c0 70.4-57.6 128-128 128z m64-256c0-35.2-28.8-64-64-64H256c-35.2 0-64 28.8-64 64v128c0 35.2 28.8 64 64 64h512c35.2 0 64-28.8 64-64v-128z m-160 128c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m0-96c-17.6 0-32 14.4-32 32s14.4 32 32 32 32-14.4 32-32-14.4-32-32-32z m-320 96c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m0-96c-17.6 0-32 14.4-32 32s14.4 32 32 32 32-14.4 32-32-14.4-32-32-32z'/>\
              </svg>"
    },
	Unknow: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                  <path d='M797.75744 438.02624c-11.07968 0-21.95456 0.8192-32.72704 2.56 2.2528-13.6192 3.62496-27.36128 3.62496-41.69728 0-146.47296-118.6816-265.3184-265.29792-265.3184-142.56128 0-258.62144 112.78336-264.62208 254.03392C105.6768 394.38336 0 503.99232 0 638.64832c0 139.10016 112.68096 251.76064 251.82208 251.76064h545.93536C922.64448 890.40896 1024 789.13536 1024 664.18688c0-124.88704-101.35552-226.16064-226.24256-226.16064zM510.27968 808.38656c-22.69184 0-41.14432-18.06336-41.14432-40.30464 0-22.24128 18.39104-40.30464 41.14432-40.30464 22.67136 0 41.14432 18.06336 41.14432 40.30464-0.02048 22.24128-18.41152 40.30464-41.14432 40.30464z m110.46912-228.0448c-8.06912 12.6976-25.1904 29.92128-51.44576 51.77344-13.57824 11.28448-22.03648 20.3776-25.31328 27.29984-3.2768 6.8608-4.8128 19.16928-4.48512 36.90496h-58.5728c-0.12288-8.3968-0.24576-13.5168-0.24576-15.38048 0-18.96448 3.13344-34.52928 9.4208-46.77632 6.26688-12.24704 18.8416-26.0096 37.62176-41.2672 18.78016-15.31904 30.04416-25.31328 33.71008-30.04416 5.632-7.49568 8.51968-15.7696 8.51968-24.73984 0-12.4928-5.05856-23.18336-15.0528-32.1536-9.99424-8.9088-23.57248-13.39392-40.57088-13.39392-16.40448 0-30.12608 4.68992-41.14432 13.96736-11.01824 9.29792-20.50048 29.7984-22.75328 42.496-2.10944 11.9808-59.84256 17.03936-59.14624-7.24992 0.69632-24.28928 13.33248-50.62656 34.97984-69.71392 21.66784-19.08736 50.11456-28.65152 85.2992-28.65152 37.04832 0 66.4576 9.68704 88.3712 29.02016 21.9136 19.3536 32.80896 41.84064 32.80896 67.54304a74.07616 74.07616 0 0 1-12.00128 40.36608z'/>\
              </svg>"
    },
    Person: {
        xml: "<svg viewBox='0 0 1024 1024'>\
                <path d='M939.904 821.333333a439.296 439.296 0 0 0-306.346667-317.994666 233.258667 233.258667 0 0 0 111.573334-198.869334c0-128.554667-104.576-233.173333-233.130667-233.173333S278.869333 175.914667 278.869333 304.469333a233.258667 233.258667 0 0 0 111.573334 198.869334 439.296 439.296 0 0 0-306.346667 317.994666 103.594667 103.594667 0 0 0 19.541333 89.088c21.034667 26.88 52.608 42.24 86.613334 42.24H833.706667a109.226667 109.226667 0 0 0 86.613333-42.24c20.138667-25.6 27.221333-58.069333 19.584-89.088zM330.069333 304.469333c0-100.352 81.621333-181.973333 181.930667-181.973333s181.930667 81.621333 181.930667 181.973333S612.352 486.4 512 486.4 330.069333 404.778667 330.069333 304.469333z m549.973334 574.421334a59.306667 59.306667 0 0 1-46.336 22.613333H190.250667a59.306667 59.306667 0 0 1-46.336-22.613333 52.096 52.096 0 0 1-10.154667-45.312C176.725333 659.328 332.245333 537.6 512 537.6s335.274667 121.728 378.197333 295.978667a52.053333 52.053333 0 0 1-10.154666 45.312z'/>\
              </svg>"
    }
});

$_("block").imports({
    Title: {
        css: "#title { position: relative; overflow: hidden; margin: 0; white-space: nowrap; text-overflow: ellipsis; text-transform: none; color: #000; font-size: 16px; font-weight: 600; line-height: 20px; margin-top: 35px; margin-bottom: 10px; margin-left: 16px; margin-right: 16px; }\
              #medium { font-size: 22px; font-weight: bold; line-height: 1.4 }\
              #large { font-size: 30px; font-weight: bold; line-height: 1.3 }\
              #title+.list, #title+.card { margin-top: 0; }",
        xml: "<div id='title'/>",
        fun: function (sys, items, opts) {
            if (opts.type == "medium" || opts.type == "large")
                sys.title.addClass(`#${opts.type}`);
        }
    },
    Block: {
        css: "#block { box-sizing: border-box; position: relative; z-index: 1; color: inherit; margin: 35px; padding-top: 0; padding-bottom: 0; padding-left: 16px; padding-right: 16px; font-size: inherit }\
              #strong { color: #000; padding-top: 16px; padding-bottom: 16px; background-color: #fff; }\
              #inset { border-radius: 8px; margin-left: 16px; margin-right: 16px; }",
        xml: "<div id='block'/>",
        fun: function (sys, items, opts) {
            opts.strong && sys.block.addClass("#strong");
            opts.inset && sys.block.addClass("#inset");
        }
    },
});

$_("form").imports({
    Inner: {
        css: "#inner { flex-direction: column; align-items: flex-start; }",
        map: { extend: { from: "../list/Inner", fun: "r" } }
    },
    Label: {
        css: "#label { min-width: 0; white-space: nowrap; position: relative; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }\
              #label { width: 100%; vertical-align: top; flex-shrink: 0; font-size: 12px; font-weight: 400; line-height: 1.3; color: inherit; transition-duration: .2s; transition-property: transform,color; }",
        xml: "<div id='label'/>"
    },
    Input: {
        css: "#wrap { width: 100%; margin-bottom: -8px; }\
              #input { width: 100%; height: 44px; color: #000; font-size: 17px; background-color: transparent; }\
              #input { box-sizing: border-box; appearance: none; border: none; box-shadow: none; border-radius: 0; outline: 0; display: block; padding: 0; margin: 0; font-family: inherit; background: 0 0; resize: none;}",
        xml: "<div id='wrap'>\
                <input id='input' type='text'/>\
              </div>",
        map: { attrs: { input: "name value type maxlength placeholder disabled readonly min max style" } },
        fun: function (sys, items, opts) {
            return sys.input;
        }
    },
    Range: {
        css: "#input { width: 100%; }\
              #input {appearance: none; margin: 0; width: 100%; height: 7px; background: #b7b8b7; border-radius: 5px; background-image: linear-gradient(#007AFF, #007AFF); background-size: 70% 100%; background-repeat: no-repeat;}\
              input[type='range']::-webkit-slider-thumb { appearance: none; height: 20px; width: 20px; border-radius: 50%; background: #FFF; cursor: ew-resize; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); transition: background .3s ease-in-out; }\
              input[type='range']::-webkit-slider-runnable-track  { -webkit-appearance: none; box-shadow: none; border: none; background: transparent; }\
              #wrap { height: 28px; display: flex; align-items: center; }",
        xml: "<div id='wrap'>\
                <input id='input' type='range' min='0' max='100' step='1' value='50'/>\
              </div>",
        fun: function (sys, items, opts) {
            sys.input.on("input", (e) => {
                let el = e.target.elem();
                e.target.css("background-size", (el.value - el.min) * 100 / (el.max - el.min) + '% 100%');
            }).trigger("input");
            return sys.input;
        }
    },
    Select: {
        xml: "<div id='wrap'>\
                <select id='input'/>\
              </div>",
        map: { extend: { from: "Input" }, appendTo: "input" }
    },
    Toggle: {
        css: ":root { --toggle-width: 52px; --toggle-height: 32px; }\
              #toggle { display: inline-block; vertical-align: middle; position: relative; box-sizing: border-box; align-self: center; user-select: none }\
              #toggle, #icon { width: var(--toggle-width); height: var(--toggle-height); border-radius: var(--toggle-height); }\
              #checkbox { display: none }\
              #checkbox[disabled]~#icon { pointer-events: none }\
              #checkbox:checked+#icon { background: #007aff; }\
              #checkbox:checked+#icon:before { transform: scale(0) }\
              #checkbox:checked+#icon:after { transform: translateX(calc(var(--toggle-width) - var(--toggle-height))) }\
              #icon { z-index: 0; margin: 0; padding: 0; appearance: none; border: none; position: relative; transition: .3s; box-sizing: border-box; display: block; cursor: pointer; background: #e5e5e5; }\
              #icon:before { content: ''; position: absolute; left: 2px; top: 2px; width: calc(var(--toggle-width) - 4px); height: calc(var(--toggle-height) - 4px); border-radius: var(--toggle-height); box-sizing: border-box; background: #fff; z-index: 1; transition-duration: .3s; transform: scale(1) }\
              #icon:after { content: ''; background: #fff; position: absolute; z-index: 2; transform: translateX(0px); transition-duration: .3s}\
              #icon:after { height: calc(var(--toggle-height) - 4px); width: calc(var(--toggle-height) - 4px); top: 2px; left: 2px; box-shadow: 0 2px 4px rgb(0 0 0 / 30%); border-radius: calc(var(--toggle-height) - 4px) }",
        xml: "<label id='toggle'>\
                  <input id='checkbox' type='checkbox'/>\
                  <span id='icon'/>\
              </label>",
        map: { attrs: { toggle: "class", checkbox: "checked disabled" } },
        fun: function (sys, items, opts) {
            return sys.checkbox.elem();
        }
    },
    Button: {
        css: "#button { padding: 0 15px; text-align: center; color: #007aff; line-height: 44px; display: block; border: 1px solid #E4E3E6; border-style: solid none; background: #FFF; outline: 0; cursor: pointer; text-decoration: none; }\
              #button { transition-duration: .3s; transition-property: background-color,color; }\
              #active { transition-duration: 0s; background-color: rgba(0, 0, 0, 0.15); }",
        xml: "<a id='button' href='#'/>",
        fun: function (sys, items, opts) {
            this.on(ev.touchstart, () => sys.button.addClass("#active"));
            this.on(ev.touchend, (e) => {
                e.preventDefault();
                sys.button.removeClass("#active");
            });
        }
    }
});

$_("iframe").imports({
    Applet: {
        css: "html, body { width: 100%; height: 100%; margin: 0; padding: 0; font-size: 100%; overflow: hidden; }",
        xml: "<div id='applet'/>",
        map: { extend: { from: "../Applet" } },
        fun: function (sys, items, opts) {
            window.addEventListener("message", (e) => {
                this.notify(e.data.topic, [e.data.body]);
            });
            this.on("close", (e, topic, body) => {
                window.top.postMessage("close", "*");
            });
            this.on("publish", (e, topic, body) => {
                window.top.postMessage({topic: topic, body: body}, "*");
            });
        }
    },
    Window: {
        css: "#iframe { background: #FFF; border: none; }",
        xml: "<iframe id='iframe'/>",
        map: { attrs: { iframe: "src" } },
        fun: function (sys, items, opts) {
            this.watch("message", (e, data) => {
                this.elem().contentWindow.postMessage(data, "*");
            });
            window.addEventListener("message", (e) => {
                if (e.data == "close")
                    return this.trigger("close");
                this.trigger("publish", [e.data.topic, e.data.body]);
            });
        }
    }
});

$_("list").imports({
    List: {
        css: "#list { z-index: 1; font-size: 17px; display: block; }\
              #list { list-style: none; margin: 35px 0; padding: 0; position: relative; background: #FFF;}\
              #list:before { content: ''; position: absolute; background-color: #E4E3E6; display: block; z-index: 15;  top: 0;  right: auto;  bottom: auto;  left: 0; height: 1px; width: 100%; transform-origin: 50% 0%;  transform: scaleY(calc(1 / var(--f7-device-pixel-ratio))); }\
              #list:after { content: ''; position: absolute; background-color: #E4E3E6; display: block; z-index: 15; top: auto; right: auto; bottom: 0; left: 0; height: 1px; width: 100%; transform-origin: 50% 100%; transform: scaleY(calc(1 / var(--f7-device-pixel-ratio))); }\
              #innerx:before { font-family: framework7-core-icons; font-weight: 400;  font-style: normal; letter-spacing: normal; text-transform: none; white-space: nowrap; overflow-wrap: normal; direction: ltr; -webkit-font-smoothing: antialiased; text-rendering: optimizelegibility; font-feature-settings: 'liga'; text-align: center; display: block; position: absolute; top: 50%; width: 8px; height: 14px; margin-top: -7px; font-size: var(--f7-list-chevron-icon-font-size); line-height: 14px;  color: var(--f7-list-chevron-icon-color); pointer-events: none; right: calc(var(--f7-list-item-padding-horizontal) + var(--f7-safe-area-right)); content: var(--f7-list-chevron-icon-right); }",
        xml: "<ul id='list' class='list'/>"
    },
    ListItem: {
        xml: "<li id='listItem'/>"
    },
    Content: {
        css: "#content { display: flex; justify-content: space-between; box-sizing: border-box; align-items: center; min-height: 44px; padding-left: 15px; }\
              #link { transition-duration: .3s; transition-property: background-color,color; }\
              #active { transition-duration: 0s; background-color: rgba(0, 0, 0, 0.15); }",
        xml: "<div id='content'/>",
        fun: function (sys, items, opts) {
            if (opts.style == "link") {
                sys.content.addClass("#link");
                this.on(ev.touchstart, () => sys.content.addClass("#active"));
                this.on(ev.touchend, () => sys.content.removeClass("#active"));
            }
        }
    },
    Media: {
        css: "#media { display: flex; flex-shrink: 0; flex-wrap: nowrap; align-items: center; box-sizing: border-box; padding-bottom: var(--f7-list-item-padding-vertical); padding-top: var(--f7-list-item-padding-vertical);}\
              #media+.inner { margin-left: 15px; }",
        xml: "<div id='media'/>"
    },
    Inner: {
        css: "#inner { position: relative; width: 100%; min-width: 0; display: flex; justify-content: space-between; box-sizing: border-box; align-items: center; align-self: stretch; padding: 8px 15px 8px 0; min-height: 44px; }\
              #inner:after { content: ''; position: absolute; background-color: #E4E3E6; display: block; z-index: 15; top: auto; right: auto; bottom: 0px; left: 0px; height: 1px; width: 100%; }\
              #link { cursor: pointer; padding-right: 35px; background-size: 8px 13px; background-repeat: no-repeat; background-position: calc(100% - 15px) center; background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D'8px'%20height%3D'13px'%20viewBox%3D'0%200%208%2013'%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%3E%3Cpolygon%20fill%3D'%23c7c7cc'%20transform%3D'translate(1.500000%2C%206.500000)%20rotate(-45.000000)%20translate(-1.500000%2C%20-6.500000)%20'%20points%3D'6%2011%206%202%204%202%204%209%20-3%209%20-3%2011%205%2011'%3E%3C%2Fpolygon%3E%3C%2Fsvg%3E\") }",
        xml: "<div id='inner' class='inner'/>",
        fun: function (sys, items, opts) {
            opts.style == "link" && sys.inner.addClass("#link");
        }
    },
    Title: {
        css: "#title { min-width: 0px; flex-shrink: 1; white-space: normal; position: relative; overflow: hidden; text-overflow: ellipsis; max-width: 100%; font-size: 17px; }",
        xml: "<div id='title'/>"
    },
    Header: {
        css: "#text { font-size: 12px; font-weight: 400; line-height: 1.2; white-space: normal; }",
        xml: "<div id='text'/>"
    },
    Footer: {
        css: "#text { color: #8e8e93; }",
        map: { extend: { from: "Header" } }
    },
    After: {
        css: "#after { padding-left: 5px; white-space: nowrap; flex-shrink: 0; display: flex; font-size: inherit; font-weight: 400; color: rgba(0, 0, 0, 0.45); line-height: inherit; margin-left: auto; }",
        xml: "<div id='after'/>"
    }
});

$_("picker").imports({
    Picker: {
        css: "#picker { display: flex; overflow: hidden; justify-content: center; padding: 0; text-align: right; height: 200px; position: relative; -webkit-mask-box-image: linear-gradient(to top,transparent,transparent 5%,white 20%,white 80%,transparent 95%,transparent); font-size: 20px; }\
              #highlight { z-index: 1000; height: 36px; box-sizing: border-box; position: absolute; left: 16px; right: 16px; top: 50%; margin-top: calc(-1 * 36px / 2); pointer-events: none; background-color: rgba(0, 0, 0, 0.12); border-radius: 8px; }",
        xml: "<div id='picker'>\
                <Renderer id='renderer'/>\
                <div id='highlight'/>\
              </div>",
        fun: function (sys, items, opts) {
            let proxy = sys.renderer.bind([]);
            sys.picker.on("#change", "./*", function (e, onScroll) { 
                e.stopPropagation();
                let kids = sys.picker.kids();
                let values = [], displayValues = [];
                for (let i = 0; i < kids.length - 2; i++) {
                    let item = kids[i].val()();
                    values.push(item.value());
                    displayValues.push(item.displayValue());
                }
                this.trigger("change", [kids.indexOf(this), values, displayValues, onScroll]);
            });
            return proxy;
        }
    },
    Renderer: {
        xml: "<div id='renderer'/>",
        map: { bind: {textAlign: "value"} },
        fun: function (sys, items, opts) {
            this.on("$/before/bind", (e, value) => {
                e.stopPropagation();
                if (e.target != this) return;
                let render = value.divider ? "<Divider id='value'/>" : "<Column id='value'><Item id='values'/></Column>"
                sys('//*')[0].replace(render);
            });
            return () => { return items.value };
        }
    },
    Column: {
        css: "#column { overflow: visible; position: relative; max-height: 100%; transform-style: preserve-3d; }\
              #items { text-align: center; transform-style: preserve-3d; overflow: auto; scrollbar-width: none; scroll-snap-type: y mandatory; height: 100%; box-sizing: border-box; padding: 82px 0px; }\
              #items::-webkit-scrollbar { display: none; opacity: 0; }\
              div#selected { color: black; transform: translate3d(0,0,0) rotateX(0deg); }",
        xml: "<div id='column'>\
                <div id='items'/>\
              </div>",
        map: { appendTo: "items" },
        fun: function (sys, items, opts) {
            let object = {};
            let selected, that = this;
            function updateItems(activeIndex, scrollTop, onScroll) {
                if (typeof scrollTop === 'undefined') {
                    scrollTop = sys.items.elem().scrollTop;
                }
                let itemHeight = that.get(0).elem().offsetHeight;
                if (typeof activeIndex === 'undefined') {
                    activeIndex = Math.round(scrollTop / itemHeight);
                }
                let items = that.kids();
                if (activeIndex < 0) activeIndex = 0;
                if (activeIndex >= items.length) activeIndex = items.length - 1;
                if (items[activeIndex] == selected) return;
                selected && selected.removeClass("#selected", sys.items);
                selected = items[activeIndex];
                selected.addClass("#selected", sys.items);
                selected.trigger("#change", onScroll);
            }
            this.on(ev.touchend, "./*", function (e) {
                let itemHeight = that.get(0).elem().offsetHeight;
                let newActiveIndex = that.kids().indexOf(this);
                let newScrollTop = newActiveIndex * itemHeight;
                sys.items.elem().scrollTop = newScrollTop;
                updateItems(newActiveIndex, newScrollTop, true);
            });
            sys.items.elem().addEventListener("scroll", () => {
                updateItems(undefined, undefined, true);
            });
            function value(newValue) {
                if (newValue == undefined)
                    return selected && selected.val().value();
                let itemHeight = that.get(0).elem().offsetHeight;
                xp.each(that.kids(), (index, item) => {
                    if (item.val().value() != newValue) return;
                    let scrollTop = index * itemHeight;
                    sys.items.elem().scrollTop = scrollTop;
                    updateItems(index, scrollTop);
                    return false;
                });
            }
            function displayValue() {
                return selected && selected.val().display();
            }
            function textAlign(value) {
                if (value == undefined)
                    return sys.items.css("text-align");
                sys.items.css("text-align", value);
            }
            return { value: value, displayValue: displayValue, textAlign: textAlign };
        }
    },
    Divider: {
        css: "#divider { overflow: visible; position: relative; max-height: 100%; display: flex; align-items: center; color: black; }",
        xml: "<div id='divider'/>",
        fun: function (sys, items, opts) {
            let fn = sys.divider.text;
            return { value: fn, displayValue: fn };
        }
    },
    Item: {
        css: "#item { perspective: 1200px; overflow: visible; transform-style: preserve-3d; height: 36px; line-height: 36px; white-space: nowrap; position: relative; overflow: hidden; text-overflow: ellipsis; left: 0; top: 0; width: 100%; box-sizing: border-box; color: rgba(0, 0, 0, 0.45); cursor: pointer; scroll-snap-align: center; }\
              #display { padding: 0 10px; -webkit-backface-visibility: hidden; backface-visibility: hidden; display: block; transform-style: preserve-3d; position: relative; overflow: hidden; text-overflow: ellipsis; box-sizing: border-box; max-width: 100%; transform-origin: center center -100px; }",
        xml: "<div id='item'>\
                <span id='display'/>\
              </div>",
        fun: function (sys, items, opts) {
            let val;
            function value(newValue) {
                if (newValue == undefined)
                    return val || sys.display.text();
                val = newValue;
            }
            let text = sys.display.text;
            return { value: value, model: text, display: text };
        }
    },
    Navbar: {
        css: "#navbar:before { content: ''; position: absolute; background-color: #c4c4c4; display: block; z-index: 15; top: 0; right: auto; bottom: auto; left: 0; height: 1px; width: 100%; transform-origin: 50% 100%; }",
        xml: "<div id='navbar'>\
                 <div id='left'>\
                    <a id='icon'><Close xmlns='//xp/assets'/></a>\
                 </div>\
                 <div id='title'>Picker</div>\
                 <div id='right'>\
                    <a id='menu'>确定</a>\
                 </div>\
              </div>",
        map: { extend: { "from": "../Navbar", fun: "r" } },
        fun: function (sys, items, opts) { 
            sys.title.text(opts.title || "Picker");
            sys.icon.on(ev.touchend, e => this.trigger("close"));
            sys.menu.on(ev.touchend, () => this.trigger("confirm").trigger("close"));
        }
    },
    Input: {
        xml: "<input id='input' readonly='true'/>",
        map: { extend: { from: "../form/Input" } }
    }
});

$_("preload").imports({ 
    Preload: {
        css: "#preload { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,.4); z-index: 13000; visibility: hidden; opacity: 0; -webkit-transition-duration: .4s; transition-duration: .4s; }\
              #visible { visibility: visible; opacity: 1; }",
        xml: "<div id='preload'>\
                <Loader/>\
              </div>",
        fun: function (sys, items, opts) {
            function show() {
                sys.preload.addClass("#visible");
            }
            function hide() {
                sys.preload.removeClass("#visible");
            }
            return { show: show, hide: hide };
        }
    },
    Loader: {
        css: "#preloader { position: absolute; left: 50%; top: 50%; padding: 8px; margin-left: -25px; margin-top: -25px; background: rgba(0, 0, 0, 0.8); z-index: 13500; border-radius: 5px; }\
              #spinner { display: block; width: 34px; height: 34px; background-position: 50%; background-size: 100%; background-repeat: no-repeat; -webkit-animation: $spin 1s steps(12, end) infinite; animation: $spin 1s steps(12, end) infinite; background-image: url(\"data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D'0%200%20120%20120'%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20xmlns%3Axlink%3D'http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink'%3E%3Cdefs%3E%3Cline%20id%3D'l'%20x1%3D'60'%20x2%3D'60'%20y1%3D'7'%20y2%3D'27'%20stroke%3D'%23fff'%20stroke-width%3D'11'%20stroke-linecap%3D'round'%2F%3E%3C%2Fdefs%3E%3Cg%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(30%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(60%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(90%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(120%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.27'%20transform%3D'rotate(150%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.37'%20transform%3D'rotate(180%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.46'%20transform%3D'rotate(210%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.56'%20transform%3D'rotate(240%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.66'%20transform%3D'rotate(270%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.75'%20transform%3D'rotate(300%2060%2C60)'%2F%3E%3Cuse%20xlink%3Ahref%3D'%23l'%20opacity%3D'.85'%20transform%3D'rotate(330%2060%2C60)'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\"); }\
              @-webkit-keyframes $spin { 100% { -webkit-transform: rotate(360deg); } }\
              @keyframes $spin { 100% { transform: rotate(360deg); } }",
        xml: "<div id='preloader'>\
                <span id='spinner'/>\
              </div>"
    }
});

$_("swipeout").imports({
    Swipeout: {
        css: "#swipeout { position: relative; box-sizing: border-box; overflow: hidden; transform-style: preserve-3d; background: #FFF; list-style-type: none; }\
              #swipeout > *:first-child { transition-duration: .3s; transition-property: transform,left; position: relative; z-index: 10; }",
        xml: "<li id='swipeout'/>",
        fun: function (sys, items, opts) {
            let touchesStart = {};
            let isTouched;
            let isMoved;
            let isScrolling;
            let touchStartTime;
            let touchesDiff;
            let content = this.first();
            let actions = this.last();
            let translate;
            content.on(ev.touchstart, (e) => {
                isMoved = false;
                isTouched = true;
                isScrolling = false;
                touchesStart.x = e.type === 'touchstart' ? e.targetTouches[0].pageX : e.pageX;
                touchesStart.y = e.type === 'touchstart' ? e.targetTouches[0].pageY : e.pageY;
                touchStartTime = new Date().getTime();
            });
            content.on(ev.touchmove, (e) => {
                if (!isTouched) return;
                let pageX = e.type === 'touchmove' ? e.targetTouches[0].pageX : e.pageX;
                let pageY = e.type === 'touchmove' ? e.targetTouches[0].pageY : e.pageY;
                if (!isMoved) {
                    isScrolling = isScrolling || Math.abs(pageY - touchesStart.y) > Math.abs(pageX - touchesStart.x);
                    if (isScrolling) {
                        isTouched = false;
                        return;
                    }
                }
                touchesDiff = pageX - touchesStart.x;
                translate = touchesDiff;
                let opened = sys.swipeout.hasClass('#opened');
                if (translate > 0 && !opened) {
                    isTouched = false;
                    return isMoved = false;
                }
                isMoved = true;
                let actionsWidth = actions.outerWidth();
                if (opened)
                    translate -= actionsWidth;
                let buttonTranslate = translate;
                let progress = buttonTranslate / actionsWidth;
                if (buttonTranslate < -actionsWidth) {
                    buttonTranslate = -actionsWidth - (-buttonTranslate - actionsWidth) ** 0.8;
                    translate = buttonTranslate;
                }
                actions.kids().forEach((buttonEl) => {
                    let buttonOffset = buttonEl.elem().offsetLeft;
                    buttonEl.css("transform",  `translate3d(${buttonTranslate - buttonOffset * (1 + Math.max(progress, -1))}px,0,0)`);
                });
                content.css("transform",  `translate3d(${translate}px,0,0)`);
            });
            content.on(ev.touchend, (e) => {
                if (!isTouched || !isMoved) return;
                let actionsWidth = actions.outerWidth();
                let timeDiff = new Date().getTime() - touchStartTime;
                let action = (timeDiff < 300 && touchesDiff < -10) || (timeDiff >= 300 && Math.abs(translate) > actionsWidth / 2) ? "open" : "close";
                if (timeDiff < 300) {
                    if (Math.abs(translate) === 0) action = "close";
                    if (Math.abs(translate) === actionsWidth) action = "open";
                }
                let buttons = actions.kids();
                if (action === "open") {
                    sys.swipeout.addClass("#opened");
                    content.css("transform", `translate3d(-${actionsWidth}px,0,0)`);
                    buttons.forEach(item => item.css("transform", `translate3d(-${actionsWidth}px,0,0)`));
                } else {
                    sys.swipeout.removeClass("#opened");
                    content.css("transform", "");
                    buttons.forEach(item => item.css("transform", "translate3d(0,0,0)"));
                }
                isTouched = false;
                isMoved = false;
            });
            content.watch("#/app/click", (e, el) => {
                let opened = sys.swipeout.hasClass("#opened");
                if (opened && !sys.swipeout.contains(el.target)) {
                    sys.swipeout.removeClass("#opened");
                    content.css("transform", "");
                    actions.kids().forEach(item => item.css("transform", "translate3d(0,0,0)"));
                }
            });
        }
    },
    Actions: {
        css: "#actions { right: 0%; transform: translateX(100%); }\
              #actions { position: absolute; top: 0; height: 100%; display: flex; direction: ltr; }",
        xml: "<div id='actions'/>"
    },
    Button: {
        css: "#button { color: #FFF; padding: 0 30px; display: flex; align-items: center; position: relative; left: 0; outline: 0; cursor: pointer; text-decoration: none; }\
              #button:after { left: 100%; margin-left: -1px;content: ''; position: absolute; top: 0; width: 600%; height: 100%; background: inherit; z-index: -1; transform: translate3d(0,0,0); pointer-events: none; }\
              #button { transition-duration: .3s; transition-property: transform,left; }",
        xml: "<a id='button' href='#'/>",
        fun: function (sys, items, opts) {
            let table = {red: "#ff3b30", blue: "#007aff", green: "#4cd964"};
            this.css("background-color", table[opts.color] || "#007aff");
        }
    }
});

});

if ( typeof define === "function" && define.amd ) {
    define( "xui", [], new Function("return xmlplus;"));
}