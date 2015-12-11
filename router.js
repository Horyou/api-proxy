const router = require('koa-router')();


module.exports = function (app) {
  router.get('/authorize', function* (next) {
    yield this.render('authorize');
  });

  app.use(router.routes());
  app.use(router.allowedMethods());
}
