var sys = require("sys")
  , http = require("http")
  , path = require("path")
  , url = require("url")
  , qs = require("querystring")
  , filesys = require("fs")
  , crypto = require('crypto')
  , shasum = crypto.createHash('sha1')
  , $ = require('jquery')
  ;


function zfwService(){
  // Members

  /** \brief port
      port that the server will listen to, use http://localhost:port to connect to this instance
    */
  this.port = 2727;

  /** \brief view root
      path that contains viewscripts (should not be in static_root)
    */
  this.view_root = 'views';

  /** \brief controller root
      path that contains controller-scripts (should not be in static_root)
    */
  this.controller_root = 'controller';

  /** \brief static root
      path that contains viewscripts (should be a path that only contains public information)
    */
  this.static_root = 'htdocs';

  /** more service variables: suggestion **/

    //INIT
    var self = this;
    //CODE
}

/** \brief default action
    takes two parameters (user,password)
    both parameters have to be set
  */
zfwService.prototype.main = function ( ){
  //INIT
  var self = this;
  //CODE
  http.createServer(function(request,response){
    var body = '';
    request.on('data', function (data) {
      body += data;
      if (body.length > self.max_data_item_size ) {
        request.connection.destroy();
      }
    });
    request.on('end', function () {
      // extract data, only when not POST
      var data = qs.parse(url.parse(request.url).query);
      if ( body.length ){
        // use POST DATA (rejects all request.url.query parameters)
        var keypos = body.indexOf('key=') + 4;
        var keyendpos = body.indexOf('&',keypos);
        if ( keyendpos === -1 )
          data.key = body.substr(keypos,body.length-keypos);
        else
        data.key = body.substr(keypos,keyendpos-keypos);
        var bodypos = body.indexOf('body=') + 5;
        if ( bodypos >= 0 ){
          bdata = body.substr(bodypos,body.length - bodypos);
          data.body = bdata;
        }
      }
      self.route(request,response,data);
    });
  }).listen(self.port);
};

/** \brief error
   create a error-message
  */
zfwService.prototype.error = function (/*JSObject*/ response, /*STRING*/ code, /*STRING*/ message){
  //INIT
  var self = this;
  //CODE
  response.writeHeader(code, {"Content-Type": "text/plain"});
  response.write(message + "\n");
  response.end();
  console.error(message);
  // throw message;
}
/** \brief processTemplate
    load template by name, process template values, return (by promise) a processed view
  */
zfwService.prototype.processTemplate = function ( /*STRING*/ view_file, /*JSObject*/ js_data){
  //INIT
  var self = this;
  var template_regexp = new RegExp("{(.*?)}",'g');
  var template_code = view_file.match(template_regexp);
  var template_dfd = $.Deferred();
  var include_dfd = $.Deferred();
  var include_count = 0;
  var dfds = [];  // JQueryDeferred
  var index;
  //CODE
  // simple template values {name} - not
  /*
  for ( index in template_code ){
    // scrope: this only trusted code ?
    var template = template_code[index];
    template = template.replace(/^{/,'controller.view.');
    template = template.replace(/}/,';');
    try {
      result = eval(template);
      console.log(template_code[index], result);
      view_file = view_file.replace(template_code[index], result);
    } catch ( e ){
      console.warn('undefined view script variable:' + template);
    }
  }
  */

  // complex viewscripts with include
  template_regexp = new RegExp("<\\?js (.*?)\\?>",'g');
  template_code = view_file.match(template_regexp);
  // console.log(template_code);
  for ( index in template_code ){
    // scrope: this only trusted code ?
    var template = template_code[index];
    var template_result;
    if ( template.indexOf('include(') >= 0 ) {
      include_count = include_count + 1;
      continue; //  deferred later
    }
    template = template.replace(/^<\?js/,'{ var self = js_data; ');
    template = template.replace(/return/g,'template_result =');
    template = template.replace(/\?>$/,'}');
    var my_self = self;
    eval(template);
    self = my_self;
    // console.log(template,template_result,self);
    if ( typeof template_result === 'undefined' )
      template_result = '';
    view_file = view_file.replace(template_code[index], template_result);
  }
  include_dfd.promise();
  if ( include_count === 0 ){
    include_dfd.resolve();
  }else{
    for ( var index in template_code ){
      // scrope: this only trusted code ?
      var template = template_code[index];
      var template_result;
      if ( template.indexOf('include') === -1) continue;
      var include_file = template.replace(/.*include\('/,'').replace(/'\).*/,'');
      // console.log('include: ' + include_file);
      var dfd = $.Deferred();
      var included_count = 0;
      var update_fn = function(include_file_name,replacement_pattern){
        //console.log(include_file_name);
        self.readIncludeFile(include_file_name).done(function(include_file_data){
          // console.log(include_file_data);
          // console.log('---------- read include: ' + include_file_name + include_file_data.length);
          self.processTemplate(include_file_data,js_data).done(function(transformed_include_file_data){
            view_file = view_file.replace(replacement_pattern,transformed_include_file_data);
            // console.log('---------- resolved include: ' + include_file_name + transformed_include_file_data.length);
            included_count = included_count + 1;
            if ( included_count == include_count ){
              // console.log(view_file + '\n\n');
              include_dfd.resolve(view_file);
            }
          }).fail(include_dfd.reject);
        }).fail(include_dfd.reject);
      };
      update_fn(include_file,template_code[index]);
    }
  }
  include_dfd.done(function(){
     // console.log('---------- finish template ',arguments);
     template_dfd.resolve(view_file);
   })
  .fail(template_dfd.reject);
  return template_dfd.promise();
};
/** \brief route
    extract parameters, load sub-scripts, execute view data
  */
zfwService.prototype.route = function ( /*JSObject*/ request, /*JSObject*/ response, /*STRING*/ data){
  //INIT
  var self = this;
  var request_path = url.parse(request.url).pathname;
  var remote_ip = 'localhost';
  var server_name = 'http://localhost:' + self.port + '/';
  var iso_date = '22/Jun/2013:22:12:50 +0000'; // TODO: use (new Date()).formatString('as iso like apache');
  var client_id = 'Mozilla/5.0 (X11; Linux x86_64; rv:21.0) Gecko/20100101 Firefox/21.0'; // TODO: extract from request
  var method = 'POST'; // TODO: extract from request
  //CODE
  try {
    // try to return a file from the htdocs directory
    self.routeFile(response,request_path).done(function(){
      console.log( remote_ip + ' - - [' + iso_date + '] "' + method + ' ' + request.url + ' HTTP/1.1" 200 '
                 + response.length + ' "'  + server_name + '" "' + client_id + '"'
                 );
    }).fail(function(){
      self.routeController(request,response,data);
    });
  } catch ( e ){
    response.end();
  }
};
/** \brief routeController
    extract parameters, load sub-scripts, execute view data
  */
zfwService.prototype.routeController = function ( /*JSObject*/ request, /*JSObject*/ response, /*STRING*/ data){
  //INIT
  var self = this;
  var request_path = url.parse(request.url).pathname;
  var control, action;
  var request_path_elements = request_path.split(/\//);
  //CODE
  if ( request_path === '/' )
    control = 'index';
  else
    control = request_path_elements[1];

  if ( !control.indexOf(/[a-z0-9]*/) ){
    return self.error(response,500,'invalid control');
  }
  // console.log(request_path_elements);
  if ( request_path === '/'
    || request_path_elements.length < 3
    || request_path_elements[2] === '' // '/search/'
     )
    action = 'index';
  else
    action = request_path_elements[2];

  if ( !action.indexOf(/[a-z0-9]*/) ){
    return self.error(response,500,'invalid action');
  }

  var controller_script = self.controller_root + '/' + control + 'Controller.js';
  var full_controller_path = process.cwd() + '/' + controller_script;

  var view_script = self.view_root + '/scripts/' + control + '/' + action + '.html';
  var full_view_path = process.cwd() + '/' + view_script;

  filesys.exists(full_view_path,function(exists){
    if ( ! exists )
      return self.error(response,404,'view does not exist:' + control + ':' + full_view_path);
    filesys.exists(full_controller_path,function(exists){
      if ( ! exists )
        return self.error(response,404,'controller does not exist:' + control + ':' + full_controller_path);
      filesys.readFile(full_view_path, "binary", function(error, view_file) {
        if ( error ) {
          self.error(response,500,error);
        } else {
          // response.write(view_file, "binary");
          // console.log(view_file, typeof view_file);
          // TODO: force node.js to reload the file
          var name = require.resolve('./' + controller_script);
          delete require.cache[name];
          var controller = require('./' + controller_script).controller;
          controller.parameter = data;
          controller.response = response;
          if ( typeof controller.response.error === 'undefined' )
            controller.response.error = function(code, message){
              return self.error(response,code,message);
            };
          controller.view = {};
          controller.model = { simple_store: self.simple_store }; // really: self.getModel()
          controller[action + 'Action']();
          // TODO: better view code
          self.processTemplate(view_file,controller.view).done(function(transformed_file){
            response.writeHeader(200, {"Content-Type": "text/html"});
            response.write(transformed_file, "binary");
            response.end();
          }).fail(function(){
            response.end();
          });
        }
      });
    });
  });
};
/** \brief route file
    return a static file to the client
  */
zfwService.prototype.routeFile = function (/*JSObject*/ response, /*STRING*/ filename){
  //INIT
  var self = this;
  var dfd = $.Deferred();
  //CODE
  if ( filename.indexOf('..') !== -1 ){
    return dfd.promise().reject();
  }
  var full_path = process.cwd() + '/' + self.static_root + '/' + filename;
  dfd.promise();
  if ( filename === '/' )
    return dfd.reject();
  filesys.exists(full_path,function(exists){
    if ( ! exists ){
      // console.log('static file does not exist', full_path);
      return dfd.reject();
    }
    // console.log(full_path);
    filesys.readFile(full_path, 'binary', function(error, data_file) {
      if ( error ) {
        response.writeHeader(500, {'Content-Type': 'text/plain'});
        response.write(error + "\n");
        response.end();
        dfd.reject(error);
        return;
      }
      var content_type = 'text/plain';
      if ( full_path.match(/\.js$/) || full_path.match(/\.js?.*/) )
        content_type = 'text/javascript';
      if ( full_path.match(/\.css$/) )
        content_type = 'text/css';
      if ( full_path.match(/\.png$/) )
        content_type = 'image/png';
      // console.log(content_type);
      response.writeHeader(200, {'Content-Type': content_type});
      response.write(data_file, "binary");
      response.end();
      delete data_file;
      // console.log('static', full_path);
      dfd.resolve();
    });
  });
  return dfd.promise();
};
/** \brief read Include File
    deferred reading of include-files required for template processing
  */
zfwService.prototype.readIncludeFile = function (/*STRING*/ filename){
  //INIT
  var self = this;
  var dfd = $.Deferred();
  //CODE
  var full_path = process.cwd() + '/' + self.view_root + '/' + filename;
  // console.log(full_path);
  filesys.exists(full_path,function(exists){
    if ( ! exists ){
      console.error(full_path + ' does not exist for include');
      return dfd.reject();
    }
    filesys.readFile(full_path, "binary", function(error, data_file) {
      if ( error ) {
        console.error(error);
        return dfd.reject(error);
      }
      return dfd.resolve(data_file);
    });
  });
  return dfd.promise();
};

var service = new zfwService();
service.main();
