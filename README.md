z-fw
====

php-zend inspired node "framework" for serving webpages in MVC style.

start a zend-like enviroment that serves webpages

  npm install (installs jquery)
  npm start (runs the server)

reloads controlle&view-files when a request is made. new controllers and views can be added easily without updating the server code
can be customized and extended



controller
  indexController.js
  otherController.js
  - always implement
    indexAction()
  - may implement
    createAction() / removeAction()

htdocs
  - static files like css, 3rdparty js or images

views
  index
    index.html
  other
    index.html
  - a html-file named like the implemented action from the controller
    eg otherController::createAction loads views/other/create.html
  - html-files contain static content and define application-code with &lt;?js expression  ?&gt; (similar to <?php ?> statements
    the expression is eval'd and can access a 'self' object that can be filled in the controller