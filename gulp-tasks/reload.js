module.exports = function(){
    return this.gulp.src(['index.html'])
        .pipe(this.opts.$.livereload());
};

module.exports.dependencies = ['express'];
