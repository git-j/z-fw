/** \brief Index Controller
    Default Controller for no actions/path provided
  */
  //CODE

function indexController(){
  // Members

    //INIT
    var self = this;
    //CODE
}

/** \brief default action
  */
  indexController.prototype.indexAction = function ( ){
  //INIT
  var self = this;
  //CODE
  self.view.value1 = 'index1';
  self.view.last_activity = Date.now();
  self.view.param1 = self.parameter.param1;
  self.view.param2 = self.parameter.param2;
};

/* only a single action supported for indexController */

exports.controller = new indexController();