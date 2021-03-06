var Router = require('../lib/router')
  , Resource = require('../lib/resource');

describe('Router', function() {

  describe('.route()', function() {
    it('should route to a matching resource', function(done) {
      var resource = new Resource({path: '/foo'})
        , router = new Router([resource], {});

      this.timeout(100);

      resource.handle = function() {
        done();
      };
      
      router.route({url: '/foo/1234'}, {});
    });

    it('should route to an exactly matching resource', function(done) {
      var resource = new Resource({path: '/foo'})
        , other = new Resource({path: '/'})
        , router = new Router([resource, other], {});

      this.timeout(100);

      resource.handle = function() {
        done();
      };

      other.handle = function() {
        throw Error("This one shouldn't get called");
      };
      
      router.route({url: '/foo'}, {});
    });

    it ('should route to resources in turn', function(done) {
      var foobar = new Resource({path: '/foo/bar'})
        , foo = new Resource({path: '/foo'})
        , router = new Router([foo, foobar], {})
        , foobarCalled = false;

      this.timeout(100);

      foobar.handle = function(ctx, next) {
        foobarCalled = true;
        next();
      };
      foo.handle = function() {
        expect(foobarCalled).to.be.true
        done();
      };

      router.route({url: '/foo/bar'}, {});
    });

    it ('should return 404 if no resources match', function(done) {
      var foo = new Resource({path: '/foo'})
        , router = new Router([foo], {});

      this.timeout(100);
      
      foo.handle = function() {
        throw "/foo was handled"
      };

      router.route({url: '/dont-match'}, {end: function() {
        expect(this.statusCode).to.equal(404);
        done();
      }});

    });

    it ('should return 404 if all resources call next', function(done) {
      var foobar = new Resource({path: '/foo/bar'})
        , foo = new Resource({path: '/foo'})
        , router = new Router([foo, foobar], {});

      this.timeout(100);
      
      foobar.handle = function(ctx, next) {
        next();
      };

      foo.handle = function(ctx, next) {
        next();
      };

      router.route({url: '/foo/bar'}, {end: function() {
        expect(this.statusCode).to.equal(404);
        done();
      }});
    });

    it('should modify ctx.url to remove the base path', function(done) {
      var foo = new Resource({path: '/foo'})
        , router = new Router([foo], {});

      this.timeout(1000);

      foo.handle = function(ctx, res) {
        expect(ctx.url).to.equal('/1234');
        done();
      }

      router.route({url: '/foo/1234'}, {});
    });

    it('should still have a leading slash for root resources', function(done) {
      var resource = new Resource({path: '/'})
        , router = new Router([resource], {});

      this.timeout(1000);

      resource.handle = function(ctx, res) {
        expect(ctx.url).to.equal('/index.html');
        done();
      }

      router.route({url: '/index.html'}, {});
    });
  });

  describe('.matchResources()', function() {

    beforeEach(function() {
      this.resources = [
          new Resource({path: '/'})
        , new Resource({path: '/foo'})
        , new Resource({path: '/food'})
        , new Resource({path: '/bar'})
        , new Resource({path: '/foo/bar'})
      ];

      this.router = new Router(this.resources, {});
    });

    function paths(result) {
      return result.map(function(r) { return r.settings.path });
    }

    it ('should match /index.html to /', function() {
      var result = this.router.matchResources('/index.html');
      expect(paths(result)).to.include('/');
      expect(result.length).to.equal(1);
    });

    it ('should match /foo/12345 to / and /foo', function() {
      var result = this.router.matchResources('/foo/12345');
      expect(paths(result)).to.include('/').and.to.include('/foo');
      expect(result.length).to.equal(2);
    }); 

    it ('should not match /food to /foo', function() {
      var result = this.router.matchResources('/food');
      expect(paths(result)).to.not.include('/foo');
    });

    it ('should match /foo?test=1 to / and /foo', function() {
      var result = this.router.matchResources('/foo?test=1');
      expect(paths(result)).to.include('/').and.to.include('/foo');
      expect(result.length).to.equal(2);
    }); 

    it ('should match /foo/bar/12345 to /, /foo, and /foo/bar', function() {
      var result = this.router.matchResources('/foo/bar/12345');
      expect(paths(result)).to.include('/').and.include('/foo').and.include('/foo/bar');
      expect(result.length).to.equal(3);
    });

    it ('should order results by best match', function() {
      var result = this.router.matchResources('/foo/bar/12345');
      expect(paths(result)).to.eql(['/foo/bar', '/foo', '/']);
    });

    it('should match a route exactly', function() {
      var result = this.router.matchResources('/foo');
      expect(paths(result)).to.eql(['/foo', '/']);
    });

  });

  describe('.generateRegex()', function() {
    function example(path, url, expected) {
      var regex = Router.prototype.generateRegex(path)
        , result = url.match(regex);

      if (expected) {
        expect(result).to.be.ok;
      } else {
        expect(result).to.not.be.ok;
      }
    }

    it('should properly match the url', function() {
      // should pass
      example('/foo', '/foo', true);
      example('/foo', '/foo/index.html', true);
      example('/foo', '/foo/index.htm', true);
      example('/foo', '/foo?blah', true);
      example('/foo', '/foo?q={"foo":"bar"}', true);
      example('/foo', '/foo/', true);
      example('/foo', '/foo?', true);
      example('/foo', '/foo?q', true);
      example('/foo', '/foo?q=', true);
      example('/foo', '/foo?q=a', true);
      example('/foo', '/foo/some-id', true);
      example('/foo', '/foo/some-id/', true);
      example('/foo', '/foo/bar', true);
      example('/foo', '/foo/bar/', true);
      // should fail
      example('/foo', '/', false);
      example('/foo', 'foo', false);
      expect('/foo', '/food', false);
      expect('/food', '/foo', false);
      // TODO: I think this one's OK
      // example('/foo', '/foo/../bar', false);
    })

  });

});