var validation = require('validation')
  , util = require('util')
  , send = require('send')
  , Resource = require('../resource')
  , path = require('path')
  , debug = require('debug')('files')
  , fs = require('fs')
  , url = require('url');

/**
 * A `Collection` proxies validates incoming requests then proxies them into a `Store`.
 *
 * Settings:
 *
 *   - `path`         the base path a resource should handle
 *   - `public`       the root folder to server public assets
 *
 * @param {Object} settings
 * @api private
 */

function Files(settings) {
  Resource.apply(this, arguments);
  if(settings.public) {
    this.public = settings.public;
  } else {
    throw new Error('public root folder location required when creating a file resource');
  }
}
util.inherits(Files, Resource);

Files.prototype.handle = function (ctx, next) {
  if(ctx.req && ctx.req.method !== 'GET') return next();

  send(ctx.req, url.parse(ctx.url).pathname)
    .root(path.resolve(this.public))
    .pipe(ctx.res);
}

module.exports = Files;