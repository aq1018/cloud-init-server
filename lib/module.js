var path = require('path');
var fs = require('fs');
var Q = require('q');
var hogan = require('hogan.js');

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

function readFile(file) {
  return Q.ninvoke(fs, 'readFile', file, 'utf8');
}

module.exports = Module;
