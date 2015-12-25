module.exports = function(){
    
    var pngquant = require('imagemin-pngquant');
	var gulp = this.gulp,
		$ = this.opts.$;
    
    gulp.src('./images/*')
        .pipe($.imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        }))
        .pipe(gulp.dest('dist/images'));

    return gulp.src('./img/*')
        .pipe($.imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        }))
        .pipe(gulp.dest('dist/img'));  
 
};
