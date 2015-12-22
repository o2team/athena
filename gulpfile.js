var gulp = require('gulp');
var $ = require('gulp-load-plugins')({lazy:true});
var concatCss = require('gulp-concat-css');
var pngquant = require('imagemin-pngquant');


gulp.task('default', ['css','image','img','font','js']);

gulp.task('css', function(){
  return gulp.src(['./css/**/*.css','!./css/**/all.css','!./css/**/all.min.css'])
    .pipe(concatCss('all.css'))
    .pipe($.csso())
    .pipe(gulp.dest('dist/css'));
});

gulp.task('image', function(){
  return gulp.src('./images/*')
    .pipe($.imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [pngquant()]
    }))
    .pipe(gulp.dest('dist/images'));
});

gulp.task('img', function(){
  return gulp.src('./img/*')
    .pipe($.imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [pngquant()]
    }))
    .pipe(gulp.dest('dist/img'));
});

gulp.task('font', function(){
  return gulp.src('./css/font/*')
    .pipe(gulp.dest('dist/css/font'));
});

gulp.task('js', function(){
  return gulp.src('./js/*.js')
    .pipe($.uglify())
    .pipe(gulp.dest('dist/js'));
});


