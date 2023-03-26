/*!
 * icon.js v1.0.0
 * https://github.com/qudou/miot
 * (c) 2009-2017 qudou
 * Released under the MIT license
 */

xmlplus("d9c69375-2edc-43d3-a2a4-7bd93c31eb4f", (xp, $_, t) => {

$_().imports({
    Icon: {
		map: { extend: { from: "//xp/assets/Person"} }
    }
});

});

if ( typeof define === "function" ) {
    define( "xmlplus", [], function () { return xmlplus; } );
}
