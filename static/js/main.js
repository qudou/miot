require.config({
　　baseUrl: "js/",
　　paths: {
　　　　"mqtt": "mqtt",
　　　　"xmlplus": "xmlplus",
　　　　"index": "index",
　　　　"crypto": "crypto-js/crypto-js",
        "framework7": "framework7.min"
　　}
});

require(['mqtt','xmlplus','crypto', 'framework7'], (mqtt,xmlplus,crypto, f7) => {
    window.mqtt = mqtt;
    window.CryptoJS = crypto;
    window.Framework7 = f7;
    require(['index'], () => xmlplus.startup("//miot/Index"));
});