var Server = require('./lib/server');
var Registry = require('./lib/registry');

// testing
var repoPath = './tmp/aq1018/cloud-init-test';

function initRegistry() {
  return Registry.init(repoPath);
}

function initServer(registry) {
  return new Server(registry);
}

function startServer(server) {
  return server.start();
}

initRegistry()
  .then(initServer)
  .then(startServer)
  .done(function() {
    console.log('server started!');
  });
