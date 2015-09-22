var gulp = require('gulp');
var server = null;

var concat = require('gulp-concat');
var child = require('child_process');
var debug = require('gulp-debug');
var del = require('del');
var inject = require('gulp-inject');
var less = require('gulp-less');
var merge = require('merge-stream');
var minifyCSS = require('gulp-minify-css');
var notifier = require('node-notifier');
var path = require('path');
var pkg = require('./package.json');
var reload = require('gulp-livereload');
var replace = require('gulp-replace');
var rmcomments = require('gulp-remove-html-comments');
var rmlines = require('gulp-remove-empty-lines');
var shell = require('gulp-shell');
var sync = require('gulp-sync')(gulp).sync;
var util = require('gulp-util');

var conf = {
  build_dir: '.build',
  dist_dir: 'dist',
  stage_dir: '.stage',
  // External files to copy
  external_js: [],
  external_css: [
    gulp.src('font-awesome.css', {cwd: 'src/external/npm/font-awesome@4.4.0/css'})
  ],
  external_fonts: [
    gulp.src('*', {cwd: 'src/external/npm/font-awesome@4.4.0/fonts'})
  ]
}

// Clean transient directories
gulp.task('clean', function(cb) {
  del([
        conf.stage_dir,
        conf.build_dir,
        conf.dist_dir
      ], {dot: true}, cb);
});

// Replace placeholder text
gulp.task('replace', function() {
  return gulp.src('src/server/**/*.go')
    .pipe(replace('@@project_name', pkg.name))
    .pipe(replace('@@version', pkg.version))
    .pipe(gulp.dest(conf.stage_dir + '/server'));
});


// Server Side Binary
gulp.task('binary:dev', ['replace'], function() {
  var src_file = path.join(path.basename(path.dirname(__filename)), conf.stage_dir, 'server');
  var dest_file = path.join(conf.build_dir, pkg.name);
  var build = child.spawnSync('go', ['build', '-o', dest_file, src_file]);
  if (build.stderr.length) {
    var lines = build.stderr.toString()
      .split('\n').filter(function(line) {
        return line.length
      });
    for (var l in lines)
      util.log(util.colors.red(
        'Error (go build): ' + lines[l]
      ));
    notifier.notify({
      title: 'Error (go build)',
      message: lines
    });
  }
  return build;
});

gulp.task('binary:dist', ['replace'], function() {
  var src_file = path.join(conf.stage_dir, 'server', '*.go');
  var dest_file = path.join(conf.dist_dir, pkg.name);
  var build = child.spawnSync('go', ['build', '-o', dest_file, src_file]);
  if (build.stderr.length) {
    var lines = build.stderr.toString()
      .split('\n').filter(function(line) {
        return line.length
      });
    for (var l in lines)
      util.log(util.colors.red(
        'Error (go build): ' + lines[l]
      ));
    notifier.notify({
      title: 'Error (go build)',
      message: lines
    });
  }
  return build;
});


// External Resources
gulp.task('external:dev', function(cb) {
  merge(conf.external_js)
    .pipe(gulp.dest(path.join(conf.build_dir, 'static', 'js')));
  merge(conf.external_css)
    .pipe(gulp.dest(path.join(conf.build_dir, 'static', 'css')));
  merge(conf.external_fonts)
    .pipe(gulp.dest(path.join(conf.build_dir, 'static', 'fonts')));
  cb();
});


// Static Resources
gulp.task('static:dev', function() {
  var dest = path.join(conf.build_dir, 'static');
  return gulp.src('static/**')
    .pipe(gulp.dest(dest))
    .pipe(reload());
});


// JS
gulp.task('js:dev', function() {
  var dest = conf.build_dir + '/static/js/' + pkg.name + '-' + pkg.version + '.js';
  return gulp.src('src/client/*.js')
    .pipe(shell(['jspm bundle-sfx --no-mangle --skip-source-maps src/client/app ' + dest]))
    .pipe(reload());
});


// CSS
gulp.task('css:dev', function() {
  return gulp.src('src/style/**/*.less')
    .pipe(less())
    .pipe(concat(pkg.name + '-' + pkg.version + '.css'))
    .pipe(gulp.dest(conf.build_dir + '/static/css'))
    .pipe(reload());
});

gulp.task('css:dist', function() {
  return gulp.src('src/style/**/*.less')
    .pipe(less())
    .pipe(minifyCSS())
    .pipe(concat(pkg.name + '-' + pkg.version + '.min.css'))
    .pipe(gulp.dest(conf.dist_dir + '/static'));
});


// HTML
gulp.task('templates:dev', function() {
  var srcs = gulp.src([
    conf.build_dir + '/static/js/*.js',
    conf.build_dir + '/static/css/*.css'
  ]);
  return gulp.src('src/templates/index.html')
    .pipe(inject(srcs, {ignorePath: conf.build_dir}))
    .pipe(rmcomments())
    .pipe(rmlines())
    .pipe(gulp.dest(conf.build_dir + '/templates'))
    .pipe(reload());
});

gulp.task('partials:dev', function() {
  return gulp.src('**/*.ng', {cwd: 'src/templates'})
    .pipe(gulp.dest(conf.build_dir + '/static/partials'))
});


// Start backend server.
gulp.task('server:spawn', function() {
  if (server)
    server.kill();

  // Spawn application server
  server = child.spawn(path.join(conf.build_dir, pkg.name), [
    '--httpport', 8080,
    '--alsologtostderr',
    '--templateroot', conf.build_dir + '/templates',
    '--staticroot', conf.build_dir + '/static'
  ]);
  // Trigger reload upon server start
  server.stdout.once('data', function() {
    reload.reload('/');
  });

  // Pretty print server log output
  server.stdout.on('data', function(data) {
    var lines = data.toString().split('\n')
    for (var l in lines)
      if (lines[l].length) util.log(lines[l]);
  });

  // Print errors to stdout
  server.stderr.on('data', function(data) {
    process.stdout.write(data.toString());
  });
});


// Build local server.
gulp.task('build', sync([
  'clean',
  ['binary:dev', 'external:dev', 'static:dev', 'css:dev', 'js:dev', 'partials:dev'],
  'templates:dev'
]));

// Build production dist package.
gulp.task('dist', sync([
  'clean',
  ['binary:dist', 'external:dist', 'static:dist', 'css:dist', 'js:dev'],
  'templates:dist'
]));


// Watch static and client side stuff.
gulp.task('assets:watch', function() {
  gulp.watch(['src/style/**/*.less'], ['css:dev']);
  gulp.watch(['src/client/**/*.js'], ['js:dev']);
  gulp.watch(['src/templates/**/*.html'], ['templates:dev']);
  gulp.watch(['src/templates/**/*.ng'], ['partials:dev']);
});

// Watch server side stuff.
gulp.task('server:watch', function() {
  gulp.watch(['src/server/**/*.go'], sync([
    'binary:dev',
    'server:spawn'
  ], 'server'));
});

// Start a backend server and watch everything for changes.
gulp.task('watch', ['build'], function() {
  reload.listen();
  return gulp.start([
    'assets:watch',
    'server:watch',
    'server:spawn'
  ]);
});

// Run a local dev server
gulp.task('run', sync(['build', 'server:spawn']));
gulp.task('default', ['watch']);