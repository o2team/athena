module.exports = function(){
    
	var gulp = this.gulp,
		$ = this.opts.$;

    return gulp.src([
        './css/base.css',
        './css/skeleton.css',
        './css/flexslider.css',
        './css/magnific-popup.css',
        './css/rome.css',
        './css/layout.css',
        './css/devices.css',
        './css/animate.css',
        './css/Montserrat.css',
    ])
    .pipe($.concatCss('all.css'))
    .pipe($.csso())
    .pipe(gulp.dest('dist/css'))
    .pipe($.livereload());
};
