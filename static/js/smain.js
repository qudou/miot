require.config({
　　baseUrl: "js/",
　　paths: {
　　　　"mqtt": "mqtt",
　　　　"xmlplus": "xmlplus",
        "xui": "xui",
　　　　"index": "spa"
　　}
});

require(['mqtt','xmlplus'], (mqtt,xmlplus) => {
    window.mqtt = mqtt;
    require(['xui','index'], () => xmlplus.startup("//miot/Index"));
});