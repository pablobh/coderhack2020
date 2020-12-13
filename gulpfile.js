'use strict';

var gulp          = require('gulp');
var browserSync   = require('browser-sync').create();
var plugins       = require('gulp-load-plugins')();
var autoprefixer  = require('autoprefixer');
var del           = require('del');
var runSequence   = require('gulp4-run-sequence');
var imageResize   = require('gulp-image-resize');
var realFavicon   = require ('gulp-real-favicon');
var fs            = require('fs');
var FAVICON_DATA_FILE = 'faviconData.json'; // Donde se guardan los datos del favicon

// Default
gulp.task('default', function(callback) {
  runSequence(['sass', 'browserSync'],
    callback
  )
})

// Start browserSync server
gulp.task('browserSync', function() {
  browserSync.init({
    server: {
      baseDir: './'
    }
  })
  gulp.watch('scss/**/*.scss', gulp.series('sass', reload));
  gulp.watch('*.html', reload);
  gulp.watch('js/**/*.js', reload);
});

// Reload
function reload(done) {
  browserSync.reload();
  done();
}

 // Sass Live compile + auto-inject
gulp.task('sass', function() {
	return gulp.src('scss/**/*.scss')
	.pipe(plugins.sass().on('error', plugins.sass.logError))
  .pipe(plugins.postcss([autoprefixer()]))
  .pipe(plugins.size())
  .pipe(gulp.dest('css'))
  .pipe(browserSync.stream());
})

// JavaScript Babelization + minification 
gulp.task('js-build', function() {
  return gulp.src('js/**/*.js')
  .pipe(plugins.babel({
    presets: ['@babel/env']
  }))
  .pipe(plugins.uglify())
  .pipe(plugins.size())
  .pipe(gulp.dest('dist/js'))
});

// Sass compile + minification
gulp.task('sass-build', function() {
  return gulp.src('scss/**/*.scss')
  .pipe(plugins.sass({
    outputStyle: 'compressed'
  })
  .on('error', plugins.sass.logError))
  .pipe(plugins.postcss([
    autoprefixer()
  ]))
  .pipe(plugins.cssnano())
  .pipe(plugins.size())
  .pipe(gulp.dest('dist/css'));
});

// Images resizing + optimization
gulp.task('images', function() {
  return gulp.src('img/**/*.+(png|jpg|jpeg|gif)')
  .pipe(plugins.size())
  .pipe(imageResize({
    width: 1920,
    upscale: false
  }))
  .pipe(plugins.size())
  .pipe(plugins.cache(
    plugins.imagemin([
      plugins.imagemin.gifsicle({interlaced: true}),
      plugins.imagemin.mozjpeg({quality: 75, progressive: true}),
      plugins.imagemin.optipng({optimizationLevel: 5}),
    ],
      {verbose: true}
    )))
    .pipe(plugins.size())
    .pipe(gulp.dest('dist/img'))
});

// SVG optimization
gulp.task('vectors', function() {
  return gulp.src('img/**/*.svg')
  .pipe(plugins.cache(
    plugins.imagemin([
      plugins.imagemin.svgo({
        plugins: [
            {removeViewBox: true},
            {cleanupIDs: false}
        ]
      })
    ],
      {verbose: true}
    )))
    .pipe(gulp.dest('dist/img'))
});

// HTML 
gulp.task('html-build', function() {
  return gulp.src('*.html')
  .pipe(plugins.size())
  .pipe(gulp.dest('dist/'))
});

// Generate favicon
gulp.task('generate-favicon', function(done) {
	realFavicon.generateFavicon({
		masterPicture: 'img/favicon_color.svg',
		dest: 'dist',
		iconsPath: '/',
		design: {
			ios: {
				pictureAspect: 'backgroundAndMargin',
				backgroundColor: '#ffffff',
				margin: '14%',
				assets: {
					ios6AndPriorIcons: false,
					ios7AndLaterIcons: false,
					precomposedIcons: false,
					declareOnlyDefaultIcon: true
				}
			},
			desktopBrowser: {
				design: 'raw'
			},
			windows: {
				pictureAspect: 'whiteSilhouette',
				backgroundColor: '#9d794b',
				onConflict: 'override',
				assets: {
					windows80Ie10Tile: false,
					windows10Ie11EdgeTiles: {
						small: false,
						medium: true,
						big: false,
						rectangle: false
					}
				}
			},
			androidChrome: {
				pictureAspect: 'shadow',
				themeColor: '#fdedd8',
				manifest: {
					name: 'Opera Tower',
					display: 'standalone',
					orientation: 'notSet',
					onConflict: 'override',
					declared: true
				},
				assets: {
					legacyIcon: false,
					lowResolutionIcons: false
				}
			},
			safariPinnedTab: {
				pictureAspect: 'silhouette',
				themeColor: '#9d794b'
			}
		},
		settings: {
			compression: 5,
			scalingAlgorithm: 'Lanczos',
			errorOnImageTooSmall: false,
			readmeFile: false,
			htmlCodeFile: false,
			usePathAsIs: false
		},
		markupFile: FAVICON_DATA_FILE
	}, function() {
		done();
	});
});

// Favicon inject
gulp.task('inject-favicon-markups', function() {
	return gulp.src([ 'dist/*.html' ])
		.pipe(realFavicon.injectFaviconMarkups(JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).favicon.html_code))
		.pipe(gulp.dest('dist'));
});

// Check for updates on RealFaviconGenerator (think: Apple has just
gulp.task('check-for-favicon-update', function(done) {
	var currentVersion = JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).version;
	realFavicon.checkForUpdates(currentVersion, function(err) {
		if (err) {
			throw err;
		}
	});
});

/*
*  Cleaning
*/ 
gulp.task('clean', function() {
  return del('dist').then(function(cb) {
    return plugins.cache.clearAll(cb);
  });
})

gulp.task('clean:dist', function() {
  return del(['dist/**/*', '!dist/img', '!dist/img/**/*']);
});

/*
* Building for deployment
*/
gulp.task('build', function(callback) {
  runSequence(
    'clean:dist',
    ['generate-favicon', 'html-build'],
    ['js-build', 'images', 'vectors', 'sass-build', 'inject-favicon-markups'],
    callback
  )
})
