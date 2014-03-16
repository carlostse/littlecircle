/*
 * Event
 */
var assert = require('assert')
  , database = require('./database')
  , url = require('url');

function create(db, user, obj){
    assert.notEqual(db, null);
    var stmt = db.prepare('INSERT INTO event VALUES (?, ?, ?)');
    stmt.run(user, obj.title, obj.location);
    stmt.finalize();
}

function query(db, user, ftn){
    assert.notEqual(db, null);
    var arr = []
      , sql = 'SELECT title, location FROM event WHERE fb_id = "' + user + '"';
    console.log(sql);
    db.all(sql, ftn);
}

exports.actionCreate = function(req, res){
    res.contentType('application/json');
    console.log('[actionCreate] ' + req.query.event);
    create(database.db(), req.query.user_id, req.query.event);
    res.send('{}');
};

exports.actionQuery = function(req, res){
    console.log('actionQuery');
    res.contentType('application/json');
    query(database.db(), req.query.user_id, function(err, rows) {
        if (err) console.log(err);
        assert.equal(err, null);
        console.log('array size: ' + rows.length);
        res.send(rows);
    });
};
