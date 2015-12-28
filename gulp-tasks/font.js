module.exports = function(){
    
	var gulp = this.gulp,
		$ = this.opts.$;
    
    return gulp.src('./css/font/*')
        .pipe(gulp.dest('dist/css/font'));
};
