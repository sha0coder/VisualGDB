/*
	gdb.js by @sha0coder

	<spam>
		My android apps:
		https://play.google.com/store/search?q=jesus.olmos
	</spam>
*/

var spawn = require('child_process').spawn;


String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var gdb = {
	bin: null,
	first: 0,
	debug: false,
	fireInit: false,
	cbs: [],
	cmds: [],
	buffer: '',
	init: function(file,readycb) {
		// init event streams
		gdb.bin = spawn('gdb', ['-q',file]);
		gdb.bin.stdout.on('data',gdb.onStdout);
		gdb.bin.stdout.on('end',gdb.onStdoutEnd);
		gdb.bin.stderr.on('data',gdb.onStderr);
		gdb.bin.on('close',gdb.onClose);
		gdb.onReady = readycb;
	},

	// LOW LEVEL API
	cmd: function(cmd,cb) {
		if (gdb.debug)
			console.log('gdb.js command: '+cmd);

		// prepare command and callback
		cmd = cmd+'\n'
		if (!cb)
			cb = function(){};

		gdb.cbs.push(cb);
		gdb.bin.stdin.write(cmd);
	},
	enableDebug: function() {
		gdb.debug = true;
	},

	// HIGHT LEVEL API
	getEntry: function(cb) {
		gdb.cmd('info files', function(out) {
			cb(/: (0x[0-9a-f]+)/.exec(out)[1]);
		});
	},
	getArch: function(cb) {
		gdb.cmd('info files', function(out) {
			cb(/file type ([a-z0-9-]+)/.exec(out)[1]);
		});
	},
	getRegs: function(cb) {
		gdb.cmd('i r', function(out) {
			var re = /([a-z0-9]{2,3}) *(0x[0-9a-f]+) *([0-9xa-f]+)/g;
			var regs = {};
			var v;
			do {
				v = re.exec(out);
				if (v) {
					regs[v[1]] = [v[2],v[3]];
				}
			} while (v);
			cb(regs);
		});
	},
	setBP: function(name_or_addr,cb) {
		var cmd = 'b ';
		if (name_or_addr.substring(0,2) == '0x')
			cmd += '*';

		gdb.cmd(cmd+name_or_addr, function(out) {
			cb(/Breakpoint [0-9]+ at/.exec(out));
		});
	},
	getBPs: function(cb) {
		gdb.cmd('info break', function(out) {
			var bps = out.split('\n');
			bps.splice(0,1);
			cb(bps);
		});
	},
	setRegs: function(regs) {
		for (reg in regs) {
			gdb.cmd('set '+reg+' = '+regs[reg][0]);
		}
	},
	displayIntel: function() {
		gdb.cmd('set disassembly-flavor intel');
	},


	patch: function(addr,byte_array) {
		byte_array.forEach(function(b) {
			gdb.cmd('set *('+addr+') = '+b);
			addr++;
		});
	},
	patchStr: function(addr, str) {
		var byte_array = [];
		for (var i = 0; i < str.length; i++) {
		    byte_array.push(str.charCodeAt(i));
		}
		gdb.patch(addr,byte_array);
	},
	patchNOP: function(addr) {
		gdb.cmd('set *(unsigned char*)'+addr+' = 0x90');
	},
	patchASM: function(asm) {
		//TODO: opcode db
	},

	find: function(start,bytes,key,cb) {
		gdb.cmd('find '+start+', +'+bytes+', '+key, function(out) {
			var addrs = [];
			var reg = /0x[0-9a-f]+/g;
			var v;
			do {
				v = reg.exec(out);
				if (v)
					addrs.push(v);
			}	while(v);
			cb(v);
		});
	},
	findStr: function(start,bytes,str,cb) {
		gdb.find(start,byes,'"'+str+'"',cb);
	},

	// ASYNC EVENTS
	end: function() {
		gdb.bin.stdin.end();
	},
	onStdout: function(data) { // streaming management
		data.toString().split('\n').forEach(function(line) {

			if (line == '')
				return;

			if (gdb.debug)
				console.log('gdb.js stdout: '+line);

			// initialization
			if ((line.search('done\.')>=0 || line.search('hecho\.')>=0) && gdb.onReady && gdb.onReady != null) {
				gdb.fireInit = true;
			}

			if (line.search(/^\(gdb\) /)==0) {

				if (gdb.fireInit) {
					console.log('gdb.js up!');
					gdb.fireInit = false;
					var cb = gdb.onReady;
					gdb.onReady = null;
					gdb.buffer = '';
					//gdb.cmd('set pagination off');
					return cb();
				}

				// buffering & attending callback queue
				if (gdb.cbs.length>0) {
					var cb = gdb.cbs.splice(0,1)[0];
					line = gdb.buffer.replace(/\t\n/g,'');
					line =line.replace(/\t/g,' ').replace(/ +/g,' ');
					gdb.buffer = '';
					if (cb)
						cb(line);
				} else  {
					gdb.buffer += line+'\n';
				}

			} else {
				gdb.buffer += line+'\n';
			}
		});
	},
	onStdoutEnd: function(data) {
		console.log('stdout end');
	},
	onStderr: function(data) {
		if (gdb.debug)
			console.log('err: '+data.toString());
	},
	onClose: function() {
		console.log('gdb closed the session.');
	},
	onReady: null
};

exports.gdb = gdb;
