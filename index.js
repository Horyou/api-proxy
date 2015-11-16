var koa = require('koa');
var path = require('path');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));
var superagent = Promise.promisifyAll(require('superagent'));

app = koa();
var router = require('koa-router')();

var root = path.join(__dirname, 'public');

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

router.all('*', function (next) {
  console.log('api');
  console.dir(this.req.url);
  var resource = path.join(root, [this.req.url, 'json'].join('.'));
  console.log(resource);
  fs.accessAsync(resource, fs.F_OK)
    .then(function () {
      this.body = yield fs.readFileAsync(resource);
    })
    .catch(function (err) {
      this.body = yield* superagent.get(host + this.req.url)
        .then(function (resp) {
          this.status = 200;
        })
        .catch(function (error) {
          this.status = 500;
        });
    });
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
