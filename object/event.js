/*
 * Event
 */
var assert = require('assert')
  , database = require('./database')
  , url = require('url');

function create(db, obj){
    assert.notEqual(db, null);
    var stmt = db.prepare('INSERT INTO event VALUES (?, ?)');
    stmt.run(obj.title, obj.location);
    stmt.finalize();
}

function query(db, ftn){
    assert.notEqual(db, null);
    var arr = [];
    db.all('SELECT title, location FROM event', ftn);
}

exports.actionCreate = function(req, res){
    console.log('actionCreate');
    res.contentType('application/json');

    var event = url.parse(req.url, true).query;
    console.log('insert ' + JSON.stringify(event));
    create(database.db(), event);
    res.send('{}');
};

exports.actionQuery = function(req, res){
    console.log('actionQuery');
    res.contentType('application/json');

    query(database.db(), function(err, rows) {
        if (err) console.log(err);
        assert.equal(err, null);

        console.log('array size: ' + rows.length);
        res.send(rows);
    });
};
