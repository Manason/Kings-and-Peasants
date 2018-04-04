var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//called on server startup
http.listen(8080, function(){
	console.log("server running on port 8080");
});

app.use(express.static('public')); //serves index.html

//called when player connects, establishes socket between client and server
io.on('connection', function(socket){
	console.log('user connected');
	socket.on('messageFromClient', function(data){
		var input = data.content;
		switch(input){
			case "/":
				var obj = {"player":"Error","message":"/ is not a valid command"};
				socket.emit('message', obj); //this is only sent to the client which sent the message
				break;
			default:
				var obj = {"player":"John","message":input};
				io.sockets.emit('message', obj); //this is sent to all clients
		}
	});
});




