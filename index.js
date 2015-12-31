'use strict';
var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    xmldom = require('xmldom'),
    DOMParser = xmldom.DOMParser,
    SVGO = require('svgo'),
    exist = require('./existsSync');

var camelCase = function (prop) {
  return prop.replace(/[-|:]([a-z])/gi, function (all, letter) {
    return letter.toUpperCase();
  });
};

module.exports = function(input, options) {
  var config = {
    json: false,
    svgo: false,
    svgoPlugins: [
      { removeStyleElement: true }
      ]
  };
  
  for(var prop in options) {
    if(options.hasOwnProperty(prop)){
      config[prop] = options[prop];
    }
  }

  var data, 
      r;

  var parse = function(input) {
    var doc = new DOMParser().parseFromString(input);
    return doc.documentElement ? doc.documentElement : undefined;
  };

  var generate = function(source) {
    var obj = {}; 
    if (source.nodeType === 1) {
      obj.name = source.nodeName;

      if (source.attributes.length > 0) {
        obj.attrs = {};
        [].slice.call(source.attributes).forEach(function(item) {
          obj.attrs[camelCase(item.name)] = item.value;
        });
      }

    }

    if (source.hasChildNodes()) {
      var elements = [];
      for (var i = 0; i < source.childNodes.length; i++) {
        var item = source.childNodes.item(i);
        if (item.nodeType == 1 || (item.nodeType == 3 && /\S/.test(item.nodeValue))) {
          var nodeName = item.nodeName;
          elements.push(generate(item));
        }
      };
      obj['childs'] = elements;
    }

    return obj;
  };


  function processArray (folder) {
    var resultArr = [];
    var files = fs.readdirSync(folder);
    async.each(files, function(file, callback) {
      // console.log('Processing file ' + file);
      resultArr.push(processFile(folder + '/' + file));
      // console.log('File processed');
      callback();
      }
      // , function(err){
      //   if (err) {
      //     console.log('A file failed to process');
      //   } else {
      //     console.log('All files have been processed successfully');
      //   }
      // }
    )
    
    return resultArr;
  }

  function processFile (file) {
    var data = exist(file) ? fs.readFileSync(file, 'utf8') : file;
    if (parse(data)) {
      if (config.svgo) {
        new SVGO({ plugins: config.svgoPlugins }).optimize(data, function(result) {
          r = parse(result.data);
        });  
      } else {
        r = parse(data);
      }
    }
    
    return r ? generate(r) : false;
  }

  if (fs.statSync(input).isDirectory()) {
    return config.json ? JSON.stringify(processArray(input), null, 2) : processArray(input)
  } else {
    return config.json ? JSON.stringify(processFile(input), null, 2) : processFile(input)
  }

};