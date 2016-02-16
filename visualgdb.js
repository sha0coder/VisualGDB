/*
	visual gdb by @sha0coder


	<spam>
		My android apps:
		https://play.google.com/store/search?q=jesus.olmos
	</spam>
*/

var gdb = require('./gdb.js').gdb;
var http = require('http');
var fs = require('fs');
var url = require("url");


res = {
	db: [
		{ req: '/',			file: 'res/gdb.html', content: '' }, 
		{ req: '/gdb.js',	file: 'res/gdb.js', content: '' }, 
		{ req: '/gdb.css',	file: 'res/gdb.css', content: '' }, 	
		{ req: '/http.js',	file: 'res/http.js', content: '' }, 
		{ req: '/pannel.js',file: 'res/pannel.js', content: '' },
		{ req: '/menu.js',	file: 'res/menu.js', content: '' }, 
		{ req: '/rightcontext.js',	file: 'res/rightcontext.js', content: '' }, 
		{ req: '/rightcontext.css',	file: 'res/rightcontext.css', content: '' }, 
	]
};
res.load = function(cb) {
	for (var i=0; i<res.db.length; i++) {
		res.db[i].content = fs.readFileSync(res.db[i].file);
	}
	cb();
};
res.serve = function(url,cb,notfoundcb) {
	for (var i=0; i<res.db.length; i++) {
		if (url == res.db[i].req) {
			return cb(res.db[i].content);
		}
	}
	notfoundcb();
};



res.load(function() {
	
	if (process.argv.length <= 2) {
		console.log("node visual.js [file to debug]");
		return;
	}

	var binary = process.argv[2];
	//var binary = '../test';
	
	//gdb.enableDebug();
	gdb.init(binary, function() {

		process.on('SIGINT', function() {
			console.log('stopping gdb.js ...');
			gdb.end();
  			process.exit();
		});

		console.log(binary+' loaded!');

		gdb.displayIntel();
		gdb.getEntry(function(addr) {
			gdb.cmd('b *'+addr, function(out) {
				gdb.cmd('r');
			});
		});

		http.createServer(function(req, resp) {
			var uri = url.parse(req.url).pathname;
			console.log(req.url);
			 
			resp.writeHead(200, {'Content-Type': 'text/html'}); // text/plain text/html 

			if (uri == '/gdb') {
					var cmd = unescape(req.url.split('=')[1]); //TODO: control
					gdb.cmd(cmd, function(gdbout) {
						resp.end(gdbout);
					});
			} else {
				res.serve(uri, function(content) {
					resp.end(content);

				}, function() {
					console.log('[404] '+uri);
					resp.writeHead(404, {'Content-Type': 'text/html'});
					resp.end('404');
				});
			}
	
		}).listen(1337,'127.0.0.1');
		console.log('gdb.js on http://127.0.0.1:1337');

	});
});
