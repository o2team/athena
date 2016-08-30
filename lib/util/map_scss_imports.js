/**
* @fileoverview 解析组件的SCSS引用链，区别于athena_sass_graph
* @author manjiz
*/

var fs = require('fs');
var path = require('path');
var glob = require('glob');

module.exports = function(scssFile) {
	var Util = this;
	var map = [];
	var scssFiles = [{path: scssFile}];

	var mapper = function(scssFile) {
		var tmpMap = [];
		scssFile.dir = scssFile.dir || '';
		if(Util.existsSync(scssFile.path)) {
		  // 解析Imports
		  var scssFileCont = fs.readFileSync(scssFile.path);
		  var imports = Util.sassImports(scssFileCont);
		  
			imports.forEach(function(e) {
			  var pathObj = path.parse(e);
			  var staticPath = path.join('static', '@(scss|css)', scssFile.dir,  pathObj.dir, '?(_)' + pathObj.base + '.+(scss|sass)');
			  var find = glob.sync(staticPath, {});
			  if(find.length===0) {
			  	find = glob.sync(path.join('../gb', staticPath), {});
			  }
			  if(find[0]) {
					tmpMap.push({path: find[0], dir:path.join(scssFile.dir, pathObj.dir)});
				}
			});
		}
		return tmpMap;
	}
	var mapEngine = function(scssFiles) {
		var newScssFiles = [];
		scssFiles.forEach(function(e) {
			newScssFiles = newScssFiles.concat(mapper(e));
		});
		if(newScssFiles.length>0) {
			map = map.concat(newScssFiles);
			mapEngine(newScssFiles);
		}
	}

	mapEngine(scssFiles);
	return map;
}