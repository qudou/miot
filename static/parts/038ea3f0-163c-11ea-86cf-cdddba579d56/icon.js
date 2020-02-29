/*!
 * icon.js v1.0.0
 * https://github.com/qudou/miot-parts
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("038ea3f0-163c-11ea-86cf-cdddba579d56", (xp, $_, t) => {

$_().imports({
    Icon: {
        xml: "<svg viewBox='0 0 1024 1024' width='200' height='200'>\
                <path d='M864.4 831.1V191.7c0-35.3-28.6-63.9-63.9-63.9H225.1c-35.3 0-63.9 28.6-63.9 63.9V831h703.2zM736.5 895H289v63.9H161.1V895H97.2V191.7c0-70.6 57.2-127.9 127.9-127.9h575.4c70.6 0 127.9 57.2 127.9 127.9V895h-63.9v63.9h-128V895z'/>\
                <path d='M161.1 383.5h703.3v63.9H161.1v-63.9z m511.5 127.9h63.9v127.9h-63.9V511.4z m-191.8 0h63.9v127.9h-63.9V511.4z m-191.8 0h63.9v127.9H289V511.4z m383.6-319.7h63.9v127.9h-63.9V191.7z m-191.8 0h63.9v127.9h-63.9V191.7z m-191.8 0h63.9v127.9H289V191.7zM225.1 767.1V831h575.4v-63.9H225.1zM97.2 703.2h831.1V895H97.2V703.2z'/>\
              </svg>"
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}
