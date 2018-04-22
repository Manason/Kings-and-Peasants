var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var https = require('http').Server(app);
var privateKey = fs.readFile
var io = require('socket.io')(http);

const Game = require('./Game.js');

//called on server startup
http.listen(process.env.PORT || 8080, function(){
	console.log("server running on port " + this.address().port);
});
app.get('/', function(req, res){
	res.sendFile(__dirname + '/public/index.html');
});
app.use(express.static('public')); //serves index.html

function sendAll(message){
	var obj = {"player":"Server","message":message};
	io.sockets.emit('message', obj);
}

var currentID = 1;
var games = [];
//called when player connects, establishes socket between client and server
io.on('connection', function(socket){

	var inGame = false;
	
	//sends a message from server to all players in the lobby
	function sendToLobby(message){
		var obj = {"player":"Server","message":message};
		io.to('lobby').emit('message', obj);
	}
	
	var userID = currentID; //used to initially name each user something unique
	socket.join('lobby');
	currentID++;
	sendToLobby("User" +userID + " joined the lobby.");

	//sends an error message to the user
	function error(message){
		var obj = {"player":"Error","message":message};
		socket.emit('message', obj);
	}
	
	//sends a server message to the user
	function sendBack(message){
		var obj = {"player":"Server","message":message};
		socket.emit('message', obj);
	}

	//handle messages from clients who not in a game
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
					
					//check that game name isn't already taken
					for(var i = 0; i < games.length; i++)
						if(games[i].name == name){
							error("Game name already exists.");
							return;
						}
					
					//check that game is not called lobby
					if(name == "lobby"){
						error("Can't name the game that. Try again.");
						break;
					}
				
					//create the game then have host join it
					games.push(new Game(name, io, [], 10));
				case "/join":
					var name = input.split(" ")[1];
					//look for game matching name user supplied, and have them join it if found
					for(var i = 0; i < games.length; i++)
						if (name == games[i].name){
							socket.leave('lobby');
							socket.join(name);
							sendBack("Joined " + name);
							inGame = true;
							games[i].addPlayer("User"+userID, socket);
							return;
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
