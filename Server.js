var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

const Game = require('./Game.js');

//called on server startup
http.listen(8080, function(){
	console.log("server running on port 8080");
});

function sendAll(message){
	var obj = {"player":"Server","message":message};
	io.sockets.emit('message', obj);
}

app.use(express.static('public')); //serves index.html

var currentID = 1;
var games = [];
//called when player connects, establishes socket between client and server
io.on('connection', function(socket){

	var inGame = false;
	function sendToLobby(message){
		var obj = {"player":"Server","message":message};
		io.to('lobby').emit('message', obj);
	}
	var userID = currentID;
	socket.join('lobby');
	currentID++;
	sendToLobby("User" +userID + " joined the lobby.");


	function error(message){
		var obj = {"player":"Error","message":message};
		socket.emit('message', obj);
	}
	function sendBack(message){
		var obj = {"player":"Server","message":message};
		socket.emit('message', obj);
	}

	socket.on('messageFromClient', function(data){
		if(inGame == true){
			return;
		}
		var input = data.content;
		input = input.trim();
		if(!input.startsWith("/")){
			var obj = {"player":"User"+userID,"message":input};
			io.to('lobby').emit('message', obj);
		}
		else{
			switch(input.split(" ")[0]){
				case "/host":
					if(input == "/host"){
						error("/host [name]");
						return;
					}
					var name = input.split(" ")[1];
					for(var i = 0; i < games.length; i++){
						if(games[i].name == name){
							error("Game name already exists.");
							return;
						}
					}
					if(name == "lobby"){
						error("Can't name the game that. Try again.");
						break;
					}
					games.push(new Game(name, io, [], 1));
					sendBack("Game hosted.");
				case "/join":
					var name = input.split(" ")[1];
					for(var i = 0; i < games.length; i++){
						if (name == games[i].name){
							socket.leave('lobby');
							socket.join(name);
							sendBack("Joined game.");
							inGame = true;
							games[i].addPlayer("User"+userID, socket);
							return;
						}
					}
					error("Game doesn't exist.");
					break;
				case "/help":
					//TODO THIS SHIT
					sendBack("the help commands should go here");
					break;
				default:
					error("Command not recognized.");
			}
		}
	});

});
