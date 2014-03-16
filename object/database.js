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
        db.run('CREATE TABLE IF NOT EXISTS event (fb_id TEXT, title TEXT, location TEXT)');
        db.run('CREATE TABLE IF NOT EXISTS user (' +
                'fb_id TEXT, first_name TEXT, last_name TEXT, gender TEXT, email TEXT, birthday TEXT)');
    });
};

exports.db = function(){
    assert.notEqual(db, null);
    return db;
}