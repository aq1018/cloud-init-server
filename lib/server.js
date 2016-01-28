var Q = require('q');
var express = require('express');
var Registry = require('./registry');

function Server(registry) {
  var app = express();

  function serveTemplate(req, res) {
    var module = registry.get(req.params.moduleName);
    var template = module && module.get(req.params.templateName);

    if (!template) {
      res.status(404).send('Not Found!');
      return;
    }

    res
      .status(200)
      .set('Content-Type', template.mime)
      .send(
        template.template.render(req.query)
      );
  }

  // Start server on port 8888 and returns a promise.
  // The server is ready to handle connections when
  // the returned promise is resolved.
  function start() {
    return Q.ninvoke(app, 'listen', 8888);
  }

  // Stops a running server.
  // It must be call after the server is ready for
  // connections. Otherwise it will return error.
  function stop() {
    app.close();
  }

  // configure app server
  app.get('/:moduleName/:templateName', serveTemplate);

  // expose public interface.
  return {
    start: start,
    stop: stop
  };
}



module.exports = Server;
