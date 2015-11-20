var koa = require('koa');
var path = require('path');
var Promise = require('bluebird');
var fs = require('mz/fs');
var agent = require('superagent').agent();

app = koa();
var router = require('koa-router')();

var root = path.join(__dirname, 'public');
var host = process.env.HOST || 'http://localhost:5000/api';

var json = require('koa-json');
app.use(json());

app.use(function* (next) {
  try {
    yield* next;
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
    agent.get(host + resource)
      .buffer(true)
      .set('Accept', 'application/json')
      .end(function (err, resp) {
        if (err) {
          return reject({
            status: 500,
            body: resp.error
          });
        }
        resolve({
          status: 200,
          body: resp.text
        });
      });
    });
}

router.all('*', function *(next) {
  const url = this.req.url;
  const resource = path.join(root, [url, 'json'].join('.'));
  console.log(resource);

  if (yield fs.exists(resource)) {
    this.body = yield send(resource);
  }
  else {
    const response = yield through(url);
    this.status = response.status;
    this.body = response.body;
  }
});
app.use(router.routes());
app.use(router.allowedMethods());

var fn = app.callback();
var options = {
  port: process.env.PORT || 5000
};

require('http').createServer(fn).listen(options, function (err) {
  if (err) throw err;
  console.log('Koala app listening on port %s', this.address().port);
});
