var moment = require('moment');

function log(ftn, msg){
    console.log(moment().format('YYYY-MM-DD HH:mm:ss SSS') + ' [' + ftn + '] ' + msg);
}

exports.log = function(ftn, msg){
    log(ftn, msg);
}

/*
 * GET map page.
 */
exports.map = function(req, res){
    var geo = req.params.geo;
    log('map', 'geo: ' + geo);
    res.render('map', { geo: geo });
};