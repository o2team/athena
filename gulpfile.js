var gulp    = require('gulp'),
    $       = require('gulp-load-plugins')({lazy:true});

require('gulp-task-loader')({
	EXPRESS_PORT : 4000,
    EXPRESS_ROOT : __dirname,
    LIVERELOAD_PORT : 35729,
	$: $
});

gulp.task('default', ['css','image','font','js', 'watch']);

