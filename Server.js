var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var timer = 30;
var state = -1;
const Game = require('./Game.js');

//called on server startup
http.listen(8080, function(){
	console.log("server running on port 8080");
});

//TODO fix the timer
function timerFunc() {
	var obj = {"cur_time":timer};
	io.sockets.emit('timer', obj);
	timer--;
	if(timer <= 0){
		state++;
		setState();
		timer = 600;
	}
}
function setState(){
	var name = "";
	if(state == 0)
		name = "Pre-Game";
	else
		name = "Day " + state;
	var obj = {"state":name};
	io.sockets.emit('gamestate', obj);
}

app.use(express.static('public')); //serves index.html

var currentID = 1;
let game = new Game([], 1);


//called when player connects, establishes socket between client and server
io.on('connection', function(socket){
	console.log('user connected');
	var userID = currentID;
	game.addPlayer("User"+currentID, currentID);
	var player = game.getPlayerById(userID);
	currentID++;

	socket.on('messageFromClient', function(data){
		var input = data.content;
		input = input.trim();
		//public chat
		if(!input.startsWith("/")){
			var obj = {"player":player.name,"message":input};
			io.sockets.emit('message', obj); //this is sent to all clients
		}
		else{
			//otherwise, it's a command
			switch(input.split(" ")[0]){
				case "/n":
				case "/name":
					//G can do this, only during lobby <newusername>
					player.name = input.split(" ")[1];
					var obj = {"player":"Server","message":"Username set to: "+player.name};
					socket.emit('message', obj); //to sending client
					break;
				case "/start":
				case "/startgame":
					//HOST can do this, only during lobby
					var obj = {"player":"Server","message":"The game is starting!"};
					io.sockets.emit('message', obj); //to everyone
					state++;
					setInterval(timerFunc,1000);
					setState();
					break;
				case "/v":
				case "/vote":
					//G can do this, only during lobby <username>
					var obj = {"player":"Server","message":"You've voted for "+input.split(" ")[1]+"."};
					socket.emit('message', obj); //to sending client
					//Voting could be semi-public, displaying current votes for certain people next to names.
					//Who did the vote wouldn't be shown though.
					break;
				case "/d":
				case "/duke":
					//R can do this, only during pregame <username>
					var obj = {"player":"Server","message":input.split(" ")[1]+" is now a duke."};
					io.sockets.emit('message', obj); //to sending client and everyone
					//Could remove the duke'd person's socket and send one specific to say "You are now a duke."
					break;
				case "/sc":
				case "/sucessor":
					//L & D can do this during the day <username>
					var obj = {"player":"Server","message":input.split(" ")[1]+" is now your sucessor."};
					socket.emit('message', obj); //to sending client
					break;
				case "/t":
				case "/tax":
					//R can do this during the day <role-group>
					var obj = {"player":"Server","message":"You've taxed the "+input.split(" ")[1]+"."};
					socket.emit('message', obj); //to sending client
					//Add something to tell the other players which group got taxed.
					break;
				case "/l":
				case "/lp":
				case "/lookup":
				case "/lookuppresige":
					//L can do this during the day <username>
					var obj = {"player":"Server","message":input.split(" ")[1]+" has X amount of prestige."};
					socket.emit('message', obj); //to sending client
					break;
				case "/b":
				case "/block":
					//D can do this during the day (ONCE PER DAY) <username>
					var obj = {"player":"Server","message":"You've blocked "+input.split(" ")[1]+" for the day."};
					socket.emit('message', obj); //to sending client
					break;
				case "/s":
				case "/spy":
					//K can do this during the day (ONCE PER DAY) <username>
					var obj = {"player":"Server","message":"You're spying on "+input.split(" ")[1]+"."};
					socket.emit('message', obj); //to sending client
					break;
				case "/g":
				case "/give":
					//G can do this during the day <username> <amount>
					var obj = {"player":"Server","message":"You've given "+input.split(" ")[2]+" to "+input.split(" ")[1]+"."};
					socket.emit('message', obj); //to sending client
					//Add a message to the other player to tell them they've recieved money.
					break;
				case "/w":
				case "/m":
				case "/pm":
				case "/whisper":
				case "/message":
				case "/privatemessage":
					//G can do this during the day (COSTS PRESTIGE) <username> <message>
					var obj = {"player":"Server","message":"Sent the whisper."};
					socket.emit('message', obj); //to sending client
					//Add a message to the player they're whispering to.
					break;
				case "/y":
				case "/yell":
					//G can do this during the day (COSTS PRESTIGE) <message>
					var obj = {"player":"PlayerThatYelled","message":input.substring(input.split(" ")[0].length)};
					io.sockets.emit('message', obj); //to everyone
					//Need to change "message" to "yell" or add a tag somehow.
					break;
				case "/a":
				case "/assassinate":
					//E, K, & P can do this during the day (COSTS PRESTIGE) <username>
					var obj = {"player":"Server","message":"You will attempt an assassination on "+input.split(" ")[1]+" tonight."};
					socket.emit('message', obj); //to sending client
					break;
				case "/e":
				case "/execute":
					//R, L, & D can do this during the day (COSTS PRESTIGE) <username>
					var obj = {"player":"Server","message":input.split(" ")[1]+" will be executed tonight."};
					socket.emit('message', obj); //to sending client
					break;
				case "/p":
				case "/protect":
					//G can do this during the day (COSTS PRESTIGE) <username>
					var obj = {"player":"Server","message":"You are protecting "+input.split(" ")[1]+"."};
					socket.emit('message', obj); //this is only sent to the client which sent the message
					break;
				case "/":
				case "/h":
				case "/help":
				default:
					var obj = {"player":"Server","message":"Command not recognized. <br>/help - text here"};
					socket.emit('message', obj); //this is sent to all clients
			}
		}
	});
});
