/**
 * Module dependencies.
 */
var express = require('express')
  , http = require('http')
  , path = require('path')
  , routes = require('./routes')
  , event = require('./object/event');

// init database
require('./object/database').init();

// web environments
var port = process.env.PORT || 3000;
var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/event/create', event.actionCreate);
app.get('/event/query', event.actionQuery);


var io = require('socket.io').listen(app.listen(port));
console.log('Express server listening on port ' + port);

io.sockets.on('connection', function (socket) {
    console.log('socket connected');
    //socket.emit('message', {cmd: 1, message: 'welcome to the chat'});

    socket.on('online', function (data) {
        console.log('online: ' + data);
        if (data && data.name)
            io.sockets.emit('message', data.name + ' is online');
    });
    socket.on('chat', function (data) {
        console.log('chat: ' + JSON.stringify(data));
        if (data && data.user && data.message)
            io.sockets.emit('message', data.user.name + ': ' + data.message);
    });
});