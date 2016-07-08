/**
 * 暂时只压缩了png图片
 */
'use strict';

var fs = require('fs');
var through2 = require('through2');
var path = require('path');
var _ = require('lodash');
var gutil = require('gulp-util');
var chalk = require('chalk');
var mkdirp = require('mkdirp');

var Util = require('../../util');

var mapJSONCache = {};

/**
 * Try to transform a file to the format like 'data:image/png;base64,fasdfk=='.
 * Return original filename when failed. 
 * @param {String} filename - filename to the file.
 * @return String
 */
var transform2DataURI = function (filename) {
    var uri;
    try {
        uri = 'data:image/' + path.extname(filename).substr(1) + ';base64,' + fs.readFileSync(filename).toString('base64');
    } catch (e) {
        uri = filename;
    }
    return uri;
};

/**
 * processing urls in css files and replace them with datauri when needed.
 * @param {{cwd: String, module: String, outputPath: String, exclude: String[], size: (Number|String)}} opts - options for processing base64.
 */
function base64(opts) {
    var config = _.assign({
        cwd: undefined,
        module: undefined,
        outputPath: '',
        exclude: [],
        isServe: true,
        size: 5000
    }, opts);

    var includeJson = {},
        modulePath,
        mapJson,
        imgMap;

    config.replaceType = config.replaceType ? config.replaceType : 'local';

    // 当前模块的路径
    modulePath = path.join(config.cwd, config.module);
    // 读取module-conf配置文件
    config.moduleConf = require(path.join(modulePath, 'module-conf'));

    try {
        mapJson = JSON.parse(fs.readFileSync(path.join(modulePath, 'dist', 'map.json')).toString());
        imgMap = mapJson.rev.img;
    } catch (e) {
        mapJson = {};
        imgMap = {};
    }


    var stream = through2.obj(function (file, encoding, callback) {
        // Exception
        if (!file.isBuffer())
            return callback(null, file);

        file._contents = new Buffer(Util.processCss(file._contents.toString(), function (value) {
            var pathname,
                size,
                result,
                formatedValue;

            formatedValue = value.replace(/['"]/g, '');
            // judge if file excluded
            if (_.isArray(opts.exclude) && opts.exclude.length > 0 && opts.exclude.indexOf(formatedValue) >= 0) {
                return value;
            }

            // if `opt.isServe`, use the original one instead of the compressed one.
            if (opts.isServe || !(formatedValue in imgMap)) {
                pathname = path.join(config.outputPath, formatedValue);
            } else {
                pathname = path.join(config.outputPath, imgMap[formatedValue]);
            }

            // try to judge if size exceeded
            try {
                size = fs.statSync(pathname).size;
                result = size < config.size ? Util.transform2DataURI(pathname) : value;
            }
            catch (e) {
                result = value;
            }
            return result;
        }));
        return callback(null, file);
    });
    return stream;
};
module.exports = base64;