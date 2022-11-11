const { workerData, parentPort } = require('worker_threads');
const xmlplus = require("xmlplus");
require(workerData);
const middle = xmlplus.startup(`//middle/Index`);

parentPort.on("message", p => {
	let msgs = middle.messages();
	console.log("c", msgs, p);
	if(msgs.indexOf(p.topic) == -1) {
		return parentPort.postMessage({topic: "to-users", payload: p});
	}
	middle.notify(p.topic, p);
});

middle.on("to-users", (e, p) => {
	console.log("e", p)
	parentPort.postMessage({topic: "to-users", payload: p});
});

middle.on("to-local", (e, p) => {
	console.log("f", p)
	parentPort.postMessage({topic: "to-local", payload: p});
});