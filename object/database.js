/*
 * Database
 */
var sqlite3 = require('sqlite3')
  , assert = require('assert')
  , db = null;

exports.init = function(){
    console.log('init database...');
    assert.equal(db, null);
    db = new sqlite3.Database('db.sqlite');
    db.serialize(function() {
        db.run('CREATE TABLE IF NOT EXISTS event (title TEXT, location TEXT)');
    });
};

exports.db = function(){
    assert.notEqual(db, null);
    return db;
}