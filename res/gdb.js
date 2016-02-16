// gdb from js by @sha0coder

var asm = new Pannel('divAsm');
var regs = new Pannel('divRegs');
var stack = new Pannel('divStack');
var out = new Pannel('divOut');
var mem = new Pannel('divMem');
var bp = new Pannel('divBreak');

Array.prototype.readLastItem = function() {
	return this[this.length-1];
}

Array.prototype.existsAddr = function(item) {
	for (var i=0; i<this.length; i++)
		if (item == this[i])
			return true;
	return false;
};

Array.prototype.remove = function(item) {
	var idx = this.indexOf(item);
	if (idx >= 0)
		this.splice(idx,1);
};

String.prototype.startsWith = function(suffix) {
    return this.indexOf(suffix) == 0;
};

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.ltrim = function() {
	return this.replace(/^ */,'');
};

String.prototype.rtrim = function() {
	return this.replace(/ *$/,'');
};

String.prototype.trim = function() {
	return this.rtrim().ltrim();
};

String.prototype.cut = function(delim, pos) {
	return this.split(delim)[pos];
};

String.prototype.has = function(substr) {
	return (this.indexOf(substr) != -1);
};




var gdb = {
	running: false,
	break_points: [],
	code_navigation: []
};

gdb.cmd = function(cmd,cb) {
	console.log(cmd);
	http.async('/gdb?cmd='+escape(cmd),'',cb);
};

gdb.breakpointAddrToNum = function(addr, cb) {
	gdb.cmd('info break', function(data) {
		var lines = data.data.split('\n');
		for (var i=0; i<lines.length; i++) {
			var line = lines[i];
			var lineAddr = parseInt(/0x[A-Fa-f0-9]+/.exec(line))
			
			if (!isNaN(lineAddr) && lineAddr == addr) {
				var lineNum = line.split(' ')[0]; //control this
				if (!isNaN(parseInt(lineNum)))
					return cb(lineNum);
			}
		}
	});
};

var ev = {
	lastcmd: 'ni',
};

ev.sendCommand = function(obj) {
	if (event.keyCode != 13)
		return;

		if (obj.value == '')
			obj.value = ev.lastcmd;
		
		gdb.cmd(obj.value,function(data) { 	
			ev.lastcmd = obj.value;
			out.set(data.data);
			obj.value = '';
			ev.syncAll();
		});
};
ev.syncMenu = function() {
	RightContext.addMenu("mnuMem", mnuMem);
	RightContext.addMenu("mnuRegs", mnuRegs);
	RightContext.addMenu("mnuBP", mnuBP);
	RightContext.addMenu("mnuStack", mnuStack);
	RightContext.addMenu("mnuAsm", mnuAsm);

	RightContext.initialize();
};
ev.syncMem = function(cb) {	
	var addr = document.getElementById('memAddr').value;
	if (addr == '') {
		mem.set('');
		if (cb)
			cb();
		return;
	}
	
	gdb.cmd('x/30wx '+addr,function(data) {
		mem.clear();
		
		var lines = data.data.split('\n');
		lines.pop();
		lines.forEach(function(line) {
			var spl = line.split(':');
			var s1 = spl[0].split(' ');
			var s2 = spl[1].split(' ');
			var s;
			s2.splice(0,1);
			if (s1.length>1)
				s = '<div context="mnuMem" class="inline" memAddr="'+s1[0]+'">'+s1[0]+' '+s1[1]+': </div>';
			else
				s = '<div context="mnuMem" class="inline" memAddr="'+s1[0]+'">'+s1[0]+': </div>';
				
			s2.forEach(function(data) {
				s+='<div context="mnuMem" class="inline" memAddr="'+data+'">'+data+'</div> ';
			});
			
			mem.add(s+'<br>');
		});
		
		gdb.cmd('x/s '+addr, function(data) {
        	mem.add(data.data);
        	ev.syncMenu();
        	if (cb)
        		cb();
        });
    });
};
ev.syncStack = function(cb) {
	gdb.cmd('bt',function(data) {
		var stk = data.data.split('\n');
		stack.clear();
		stk.forEach(function(st) {
			var addr = st.split(' ')[1];
			stack.add('<div context="mnuStack" class="inline" stackAddr="'+addr+'">'+st+'<br></div>');
		});
		ev.syncMenu();
		if (cb)
			cb();
	});
};
ev.syncRegs = function(cb) {
	gdb.cmd('i r',function(data) {
		var r = data.data.split('\n');
		regs.set('');
		r.forEach(function(rr) {
			var s = rr.split(' ');
			if (s.length>=2 && s[0].length>0)
				regs.add('<div context="mnuRegs" regName="'+s[0]+'" regValue="'+s[1]+'" >'+s[0]+' = '+s[1]+'</div>');
		});
		if (cb)
			cb();	
	});
};

ev.followBack = function() {
	if (gdb.code_navigation.length < 2)
		return;
	var current = gdb.code_navigation.pop();
	var back = gdb.code_navigation.pop();
	ev.syncAsm(back);
};

ev.followAsm = function(addr, cb) {
	//TODO: poder volver para atras, y poder navegar por el dissasm
	if (!addr)
		return;

	
	gdb.cmd('x/i '+addr, function(data) {
		var addrs = /:.*(0x[a-fA-F0-9]+)/.exec(data.data);
		if (addrs)
			ev.syncAsm(addrs[1], cb);
	});	
};

ev.syncAsm = function(addr,cb) {
	if (parseInt(gdb.code_navigation.readLastItem()) != parseInt(addr))
		gdb.code_navigation.push(addr);

	if (addr)
		cmd = 'x/30i '+addr;
	else
		cmd = 'x/30i $pc';

	gdb.cmd('i r $pc', function(data) {
		var pc = parseInt(/0x[a-fA-F0-9]+/.exec(data.data)[0]);

		gdb.cmd(cmd,function(data) {
			var asmcode = '';
			data.data.split('\n').forEach(function(line) {
				line = line.ltrim().replace(/^=> /,''); 
				var addr = line.split(':')[0].split(' ')[0];
				//TODO: remark breakpoints
				if (parseInt(addr) == pc)
					bgcolor = '#d3d3d3';
				else if (gdb.break_points.existsAddr(parseInt(addr)))
					bgcolor = '#F75D59';
				else 
					bgcolor = ''

				asmcode +=  '<div context="mnuAsm" style="background-color:'+bgcolor+'" asmAddr="'+addr+'">'+asmcolor.colorize(line)+'</div>';

				if (line.search(/: ret/)>0)
					asmcode += '___________________\n';
			});
			asm.set(asmcode);
			ev.syncMenu();
			if (cb)
				cb();
		});
	});
};
ev.syncBreak = function(cb) {
	gdb.cmd('info break',function(data) {
		bps = data.data.split('\n');
		bps.splice(0,1);
		bp.clear();
		gdb.break_points = []
		bps.forEach(function(ebp) {
			if (ebp != '' && !ebp.endsWith('time')) {
				var s = ebp.split(' ');
				var id = s[0];
				s.splice(0,4);
				var addr = parseInt(s[0]);
				if (!isNaN(addr))
					gdb.break_points.push(addr);

				if (s.length>1)
					bp.add('<div context="mnuBP" class="inline" bpID="'+id+'" bpAddr="'+s[0]+'">'+s[0]+' '+s[1]+'</div><br>');
				else
					bp.add('<div context="mnuBP" class="inline" bpID="'+id+'" bpAddr="'+s[0]+'">'+s[0]+'</div><br>');
			}
		});
		ev.syncMenu();
		if (cb)
			cb();
	});
};
ev.setBreak = function(obj) { 
	if (event.keyCode != 13)
		return;
	var bp;
	var addr = obj.value;
	if (addr == '')
		return;

	if (addr.substring(0,2) == '0x')
		bp = 'b *';
	else
		bp = 'b ';

	gdb.cmd(bp+addr,function(data) {
		ev.syncBreak();
		obj.value = '';
	});
};
ev.syncAll = function() {
	// sync the divs with gdb.js ona sync way 
	ev.syncRegs(function() {
		ev.syncStack(function() {
			ev.syncAsm(null,function() {
				ev.syncBreak(function() {
					ev.syncMem(function() {
						
						ev.syncMenu();
						
						console.log('synched.');
						document.getElementById('txtGdb').focus();
					});
				});
			});
		});
	});
};

ev.listFunctions = function() {
	gdb.cmd('info functions', function(data) {
		var w = window.open('about:blank');
		var fns = data.data.split('\n');
		var out = '';

		for (var i=0; i<fns.length; i++) {
			if (fns[i].startsWith('File ')) {
				out += '<br>* '+fns[i].split(' ')[1];
				out+='<br>';
			} else if (fns[i].has('(') && fns[i].has(')')) {
				var p = fns[i].split('(');
				var params = '('+p[1];
				var pp = p[0].split(' ');
				var name = pp.pop();
				var ret = pp.join(' ');
				out += '<div id="'+name+'">'+ret+' ';
				out += '<span style="color:red">'+name+'</span> '+params;
				out += '</div>';
				out+='<br>';
			}			
		}

		w.document.write(out);
	});
};

ev.setBreakpoint = function(sAddr) {
	var addr = parseInt(sAddr);
	
	if (gdb.break_points.existsAddr(addr)) {
		ev.clearBreakpoint(sAddr);
		return;
	}

	gdb.break_points.push(addr);
	gdb.cmd('b *'+sAddr, ev.syncAll);
};

ev.clearBreakpoint = function(sAddr) {
	var addr = parseInt(sAddr);

	if (!gdb.break_points.existsAddr(addr))
		return;

	gdb.breakpointAddrToNum(addr, function(bpNum) {
		gdb.cmd('delete '+bpNum, function() {
			gdb.break_points.remove(addr);
			ev.syncAll();
		});
	});

	
}

asmcolor = {
	colors: {
		'DarkOrange': ['test','cmp'],
		'Coral': ['je','jne','jg','jge','jl','jle','ja','jb','jae','jbe'],
		'Crimson': ['jmp','call'],
		'DarkCyan': ['push','pop','movzx','movz','mov','lea'],
		'Green': ['add','sub','shl','shr','rol','ror','xor','sar','sal','sete','dec','inc','lock dec','lock inc','and','or','nand','cld'],
		'DarkBlue': ['int','ret','leave','hlt','syscall','sysenter']
	},
	colorize: function(asm,red) {
		for (c in asmcolor.colors) {
			for (i=0; i<asmcolor.colors[c].length; i++) {
				if (asm.search(': '+asmcolor.colors[c][i])>=0)
					if (red)
						return asm.replace(asmcolor.colors[c][i],'<span style="color:'+c+';background-color:red">'+asmcolor.colors[c][i]+'</span>');
					else
						return asm.replace(asmcolor.colors[c][i],'<span style="color:'+c+'">'+asmcolor.colors[c][i]+'</span>');
			}
		}
		return asm;
	}
};

ev.syncAll();


console.log('gdb interface initialized!');

