module.exports = function(){
    
	var gulp = this.gulp,
		dirs = this.opts.dirs,
		cfg = this.opts.cfg,
		$ = this.opts.$;

	gulp.src('./logo.png').pipe($.favicons({
		"icons": {
			// Create Android homescreen icon. `boolean`
			android: true,              
			// Create Apple touch icons. `boolean`
			appleIcon: true,            
			// Create Apple startup images. `boolean`
			appleStartup: false,         
			// Create Opera Coast icon. `boolean`
			coast: false,                
			// Create regular favicons. `boolean`
			favicons: true,             
			// Create Firefox OS icons. `boolean`
			firefox: false,              
			// Create Facebook OpenGraph. `boolean`
			opengraph: false,
			// Create Windows 8 tiles. `boolean`
			windows: true,              
			// Create Yandex browser icon. `boolean`
			yandex: false
		}
	})).pipe(gulp.dest('./img/'));

};
