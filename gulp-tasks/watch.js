module.exports = function(){
    this.opts.$.livereload.listen();
    this.gulp.watch('css/**/*.css', ['css']);
    this.gulp.watch('js/*.js', ['js']);
};

module.exports.dependencies = ['express'];
