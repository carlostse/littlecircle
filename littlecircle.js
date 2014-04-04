/**
 * Module dependencies.
 */
var express = require('express')
  , http = require('http')
  , path = require('path')
  , routes = require('./routes');

// web environments
var port = process.env.PORT || 3000;
var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
//app.use(express.favicon());
//app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/main', routes.index);
app.get('/map/:geo', routes.map);

var io = require('socket.io').listen(app.listen(port), {log: false});
routes.log('main', 'Express server listening on port ' + port);

var online = {
    users: [],
    addUser: function(name) {
        for (var i = 0; i < online.users.length; i++) {
            if (online.users[i] === name) {
                return;
            }
        }
        online.users.push(name);
    }
};

io.sockets.on('connection', function (socket) {
    routes.log('io.sockets', 'socket connected');
    //socket.emit('message', {cmd: 1, message: 'welcome to the chat'});

    socket.on('online', function (data) {
        routes.log('io.sockets', 'new online: ' + JSON.stringify(data));
        if (data && data.name){
            var name = data.name;
            online.addUser(name);
            io.sockets.emit('online', name);
            routes.log('io.sockets', 'current online: ' + JSON.stringify(online.users));
        }
    });
    socket.on('chat', function (data) {
        routes.log('io.sockets', 'chat: ' + JSON.stringify(data));
        if (data && data.user && data.message)
            io.sockets.emit('message', JSON.stringify({user: data.user.name, message: data.message}));
    });
    socket.on('disconnect', function() {
        routes.log('io.sockets', 'someone disconnect');
    });
});