var crypto = require('crypto')
  // , crcsum = crypto.createHash('crc')
  ;
/** \brief about Controller
    Delivers a client application with about and license text
  */
  //CODE

function aboutController(){
  // Members


    //INIT
    var self = this;
    //CODE
}

/** \brief default action
  */
  aboutController.prototype.indexAction = function ( ){
  //INIT
  var self = this;
  //CODE
};

/** \brief details action
  */
  aboutController.prototype.detailsAction = function ( ){
  //INIT
  var self = this;
  //CODE
};

exports.controller = new aboutController();