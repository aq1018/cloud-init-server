var Q = require('q');
var express = require('express');
var Registry = require('./registry');

function Server(registry) {
  var app = express();

  function serveTemplate(req, res) {

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
  app.get('/:module', serveTemplate);

  // expose public interface.
  return {
    start: start,
    stop: stop
  };
}



module.exports = Server;
