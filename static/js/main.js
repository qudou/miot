require.config({
　　baseUrl: "js/",
　　paths: {
　　　　"mqtt": "mqtt",
　　　　"xmlplus": "xmlplus",
        "xui": "xui",
　　　　"index": "index",
　　　　"crypto": "crypto-js/crypto-js"
　　}
});

require(['mqtt','xmlplus','crypto'], (mqtt,xmlplus,crypto) => {
    window.mqtt = mqtt;
    window.CryptoJS = crypto;
    require(['xui','index'], () => xmlplus.startup("//miot/Index"));
});