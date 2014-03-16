/*
 * GET home page.
 */
var database = require('../object/database')
  , event = require('../object/event');

exports.index = function(req, res){
    res.render('main', { title: 'Express' });
};