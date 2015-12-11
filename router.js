const router = require('koa-router')();


module.exports = function (app) {
  router.get('/authorize', function* (next) {
    this.status = 204;
  });

  app.use(router.routes());
  app.use(router.allowedMethods());
}