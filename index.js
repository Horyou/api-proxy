require('dotenv').load();

var koa = require('koa');
var path = require('path');
var Promise = require('bluebird');
var fs = require('mz/fs');
var agent = require('superagent').agent();
var defaults = require('lodash/object/defaults');
const send = require('koa-send');
var pixie = require('koa-pixie-proxy');

const log = {
  resource: require('debug')('resource'),
  error: require('debug')('error'),
  middleware: require('debug')('middleware')
};

app = koa();

var jsonp = require('koa-safe-jsonp');
jsonp(app, {
  limit: 50, // max callback name string length, default is 512
});

var baseDir = path.join(__dirname, 'public');
var root = '/api';
var rootPattern = new RegExp(root);

var isSecure = process.env.HTTPS || false;
var host = process.env.HOST || 'http://localhost:5000';
var remote = process.env.REMOTE;

const cors = require('koa-cors');
app.use(cors({
    origin: true
}));

var json = require('koa-json');
app.use(json());

const views = require('koa-views');
app.use(views('views'));

app.use(function* (next) {
  try {
    const data = yield* next;

    if (!data) {
      return;
    }
    const response = defaults(data, {
      status: !data.body ? 404 : 200,
      body: 'Not found',
      type: 'text/plain'
    });

    log.middleware('sending response');
    this.type = response.type;
    this.status = response.status;

    // send response
    const prop = this.query.callback ? 'jsonp' : 'body';
    this[prop] = response.body;
  }
  catch (err) {
    this.status = 500;
    this.body = err.message;
  }
});

require('./router')(app);

app.use(function *(next) {
  log.middleware('api:local');

  if (yield send(this, [this.path, 'json'].join('.'), { root: __dirname + '/public/api' })) {
    return;
  }

  yield* next;
});

if (remote) {
  app.use(pixie({host: remote})());
  app.use(function *(next) {
    log.middleware('api:remote');
  });
}

var fn = app.callback();
var options = {
  port: process.env.PORT || 5000,
  hostname: process.env.HOST || 'http://localhost'
};

require(isSecure ? 'https' : 'http').createServer(fn).listen(options, function (err) {
  if (err) throw err;
  console.log('API listening on port %s', this.address().port);
});
