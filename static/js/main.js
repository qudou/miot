require.config({
　　baseUrl: "js/",
　　paths: {
　　　　"mqtt": "mqtt",
　　　　"xmlplus": "xmlplus",
        "xui": "xui",
　　　　"index": "index"
　　}
});

require(['mqtt','xmlplus'], (mqtt,xmlplus) => {
    window.mqtt = mqtt;
    require(['xui','index'], () => xmlplus.startup("//miot/Index"));
});