#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var glob = require('glob');
var Q = require('q');
var express = require('express');
var Readable = require('stream').Readable;
var MimeMultipartStream = require('mime-multipart-stream');
var hogan = require('hogan.js');

/*
 * Cloud-Init Module
 */
function Module(options) {
  var name = options.name;
  var templates = {};

  // build lookup table
  options.templates.forEach(function(template) {
    templates[template.name] = template;
  });

  // todo: determine interface
  return {
    name: function() {
      return name;
    },

    hasTemplate: function(name) {
      return !!templates[name];
    },

    get: function(templateName) {
      return templates[templateName];
    },

    each: function(fn) {
      Object.keys(templates).forEach(function(name) {
        fn(templates[name]);
      });
    }
  }
}

Module.init = function(options) {
  var name = options.name;
  var basePath = options.basePath;
  var modulePath = path.join(basePath, name);
  var manifestFile = path.join(modulePath, 'cloudinit.json');

  function parseManifest() {
    return readFile(manifestFile).then(JSON.parse.bind(JSON));
  }

  function compileTemplates(manifest) {
    var compiledTemplates = [];

    Object.keys(manifest).forEach(function(mime) {
      manifest[mime].forEach(function(templateFile) {
        compiledTemplates.push(
          compileTemplate(mime, templateFile)
        );
      });
    });

    return Q.all(compiledTemplates);
  }

  function compileTemplate(mime, templateFile) {
    return readFile(path.join(modulePath, templateFile))
      .then(function(templateStr) {
        return hogan.compile(templateStr);
      })
      .then(function(template) {
        return { name: templateFile, template: template, mime: mime };
      });
  }

  return parseManifest()
    .then(compileTemplates)
    .then(function(templates) {
      return new Module({
        name: name,
        templates: templates
      });
    });
};

/*
 * Module Registry
 */
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

  console.log('Loading modules from: ' + path.resolve(basePath));

  return Q.nfcall(glob, pattern, { nodir: true })
    .then(function (files) {
      return Q.all(files.map(function(file) {
        console.log('[module]', file);
        return Module.init({
          basePath: basePath,
          name: path.dirname(path.relative(basePath, file))
        });
      }));
    })
    .then(function(modules) {
      console.log('Loaded ' + modules.length + ' module(s).');
      return new Registry(modules);
    });
}

/*
 * Cloud-Init Server
 */
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

  function serveModule(req, res) {
    var module = registry.get(req.params.moduleName);

    if (!module) {
      res.status(404).send('Not Found!');
      return;
    }

    var mimeStream = MimeMultipartStream({
      boundary: genMimeBoundry(),
      type: 'mixed'
    });

    module.each(function(template) {
      var fileStream = new Readable();
      fileStream._read = function noop() {};

      mimeStream.add({
        type: template.mime + '; charset=UTF-8',
        // transferEncoding: 'base64',
        headers: {
          'Content-Disposition': 'attachment; filename="' + template.name + '"'
        },
        body: fileStream
      });

      var body = template.template.render(req.query);

      fileStream.push(body);
      fileStream.push(null);
    });

    res.status(200);
    mimeStream.pipe(res);
  }

  // Start server on port `port` and returns a promise.
  // The server is ready to handle connections when
  // the returned promise is resolved.
  function start(port) {
    console.log('Starting Server on port: ' + port);
    return Q.ninvoke(app, 'listen', port);
  }

  // Stops a running server.
  // It must be call after the server is ready for
  // connections. Otherwise it will return error.
  function stop() {
    app.close();
  }

  // configure app server
  app.get('/:moduleName/:templateName', serveTemplate);
  app.get('/:moduleName', serveModule);

  // expose public interface.
  return {
    start: start,
    stop: stop
  };
}

/*
 *  Helpers
 */
function genMimeBoundry() {
  var numbers = new Array(10);
  for (var i = 0; i < numbers.length; i++) {
    numbers[i] = Math.floor(Math.random() * 10);
  }

  return numbers.join('');
}

function readFile(file) {
  return Q.ninvoke(fs, 'readFile', file, 'utf8');
}


/*
 * Startup
 */
var port = process.env.PORT || 8888;
var modulesPath = process.execArgv[0] || '.';
var server;

Registry.init(modulesPath)
  .then(function (registry) {
    server = new Server(registry);
    return server.start(port);
  })
  .done(function() {
    console.log('Server started!');
  });
