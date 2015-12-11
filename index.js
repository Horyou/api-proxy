var koa = require('koa');
var path = require('path');
var Promise = require('bluebird');
var fs = require('mz/fs');
var agent = require('superagent').agent();
var defaults = require('lodash/object/defaults');

const log = {
  resource: require('debug')('resource'),
  error: require('debug')('error'),
  middleware: require('debug')('middleware')
};

app = koa();
var router = require('koa-router')();

var jsonp = require('koa-safe-jsonp');
jsonp(app, {
  limit: 50, // max callback name string length, default is 512
});

var baseDir = path.join(__dirname, 'public');
var root = '/api';
var rootPattern = new RegExp(root);

var isSecure = process.env.HTTPS || false;
var host = process.env.HOST || 'http://localhost:5000';
var remote = process.env.REMOTE || 'http://localhost:5002';

const cors = require('koa-cors');
app.use(cors({
    origin: true
}));

var json = require('koa-json');
app.use(json());

app.use(function* (next) {
  try {
    const data = yield* next;

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

function* send(path) {
  function done() {
    console.log('done');
  }
  return fs.createReadStream(path)
      .on('error', done)
      .on('finish', done);
}


function* through(resource) {
  return new Promise(function (resolve, reject) {
    agent.get(remote + resource)
      .buffer(true)
      .set('Accept', 'application/json')
      .end(function (err, resp) {
        log.error(err);
        if (err) {
          return resolve({
            status: 404
          });
        }
        resolve({
          status: 200,
          body: resp.text,
          type: 'application/json'
        });
      });
    });
}

app.use(function *(next) {
  log.middleware('api:local');

  const resource = path.join(baseDir, root, [this.path, 'json'].join('.'));

  if (this.path.match(rootPattern) || this.path.match('favicon.ico')) {
    log.resource('non supported resource');
    return {
      status: 404
    };
  }

  log.resource(resource);

  if (yield fs.exists(resource)) {
    body = yield send(resource);
    return {
      body: body,
      type: 'application/json'
    };
  }

  yield* next;
});

app.use(function *(next) {
  log.middleware('api:remote');
  return yield through(this.req.url);
});

app.use(router.routes());
app.use(router.allowedMethods());

var fn = app.callback();
var options = {
  port: process.env.PORT || 5000,
  hostname: process.env.HOST || 'http://localhost'
};

require(isSecure ? 'https' : 'http').createServer(fn).listen(options, function (err) {
  if (err) throw err;
  console.log('API listening on port %s', this.address().port);
});
