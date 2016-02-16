// Pannel() object by @sha0coder

var Pannel = function(id) {
    this.obj = document.getElementById(id);
};
Pannel.prototype.add = function(data) {
    this.obj.innerHTML += data.replace(/\n/g,'<br>');
};
Pannel.prototype.set = function(data) {
   this.obj.innerHTML = data.replace(/\n/g,'<br>');
};
Pannel.prototype.clear = function() {
	this.obj.innerHTML = '';
};

