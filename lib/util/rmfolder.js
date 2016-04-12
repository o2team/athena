/**
* @fileoverview 删除目录
*/

var fs = require('fs');

function walk(path){

	if(!/\/$/.test(path)){
		path += '/';
	}
	var files = [],
	    directs = [];
	var _temp = fs.readdirSync(path);

	_temp.forEach(function(o,i){

		var thepath = path + o;
		var stats = fs.statSync(thepath);
		if(stats.isDirectory()){

			var _detail = walk(thepath);
			directs = directs.concat(_detail.directs);
			files   = files.concat(_detail.files);
			directs.push(thepath);
		}else{
			files.push(thepath);
		}

	});

	return {
		files : files,
		directs : directs
	}

}

function rmfolder(path, onlycontent){
	if(!fs.existsSync(path)){
		return;
	}
	var files = walk(path);
	files.files.forEach(function(o,i){
		fs.unlinkSync(o);
	});

	files.directs.forEach(function(o,i){
		fs.rmdirSync(o);
	})



	!onlycontent && fs.rmdirSync(path);
}

module.exports = rmfolder;
