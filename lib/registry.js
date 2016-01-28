var path = require('path');
var glob = require('glob');
var Module = require('./module');
var Q = require('q');

// TODO: determine interfaces.
function Registry(modules) {
  var registry = {};

  // build lookup table
  modules.forEach(function(mod) {
    registry[mod.name()] = mod;
  });

  return {
    get: function(moduleName) {
      return registry[moduleName];
    }
  };
}

Registry.init = function(basePath) {
  var pattern = path.join(basePath, '**', 'cloudinit.json');

  return Q.nfcall(glob, pattern, { nodir: true })
    .then(function (files) {
      return Q.all(files.map(function(file) {
        return Module.init({
          basePath: basePath,
          name: path.dirname(path.relative(basePath, file))
        });
      }));
    })
    .then(function(modules) {
      return new Registry(modules);
    });
}

module.exports = Registry;
