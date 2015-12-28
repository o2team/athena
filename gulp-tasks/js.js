module.exports = function(){
    
	var gulp = this.gulp,
		$ = this.opts.$;
    
    return gulp.src('./js/*.js')
        .pipe($.uglify())
        .pipe(gulp.dest('dist/js'))
        .pipe($.livereload());
};
