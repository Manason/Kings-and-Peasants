var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var timerInterval = null;
var timer = 30;
var state = -1;
const Game = require('./Game.js');

//called on server startup
http.listen(8080, function(){
	console.log("server running on port 8080");
});

function sendAll(message){
	var obj = {"player":"Server","message":message};
	io.sockets.emit('message', obj);
}

function timerFunc() {
	//Send out final message once game is over
	if(timer == -10){
		var obj = {"cur_time":"Game Finished"};
		io.sockets.emit('timer', obj);
		return;
	}
	if(timer <= 0){
		state++;
		setState();
		var obj = {"cur_time":timer};
		io.sockets.emit('timer', obj);
		return;
	}
	timer--;
	var obj = {"cur_time":timer};
	io.sockets.emit('timer', obj);


}
function setState(){
	var name = "";
	if(state == 0){
		name = "Voting";
		timer = 30;
	}
	else if(state == 1){
		var king = game.setKingByVotes();
		sendAll(king.name + " has been elected King with " + king.votes + " votes!");
		name = "Pre-Game";
		timer = 30;
	}
	else if(state == 2){
		name = "Day 1";
		timer = 600;
		game.assignRoles();
		
	}
	else if(state == 8){
		name = "Fin";
		timer = -10;
		clearInterval(timerInterval);
		timerFunc();
	}
	else{
		name = "Day " + (state-1);
		timer = 600;
	}
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

	function error(message){
		var obj = {"player":"Error","message":message};
		socket.emit('message', obj);
	}
	function sendBack(message){
		var obj = {"player":"Server","message":message};
		socket.emit('message', obj);
	}


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
					if(state != -1){
						error("You cannot change your name outside the lobby");
						break;
					}
					if(game.getPlayerByName(input.split(" ")[1]) != false){
						if(player.name == input.split(" ")[1]){
							sendBack("Your name is already "+input.split(" ")[1]);
						} else {
							sendBack("Username already taken.");
						}
						break;
					}
					player.name = input.split(" ")[1];
					sendBack("Username set to: " + player.name);
					break;
				case "/start":
				case "/startgame":
					if(state != -1){
						error("The game is already started!");
						break;
					}
					//HOST can do this, only during lobby
					sendAll("The game is starting!");
					state = 0; //Voting
					setState();
					timerFunc();
					timerInterval = setInterval(timerFunc,1000);
					break;
				case "/v":
				case "/vote":
					if(state != 0){
						error("The vote is closed");
						break;
					}
					//G can do this, only during pre-game <username>
					var votingFor = game.getPlayerByName(input.split(" ")[1]);
					if(votingFor == false){
						error("Cannot find player");
						break;
					}
					if(player.votedFor != null)
						player.votedFor.votes--;

					player.votedFor = votingFor;
					votingFor.votes++;
					sendBack("You've voted for "+player.votedFor.name);
					//Voting could be semi-public, displaying current votes for certain people next to names.
					//Who did the vote wouldn't be shown though.
					break;
				case "/d":
				case "/duke":
					//R can do this, only during pre-game <username>
					if(player.role == null || player.role.title != "King"){
						error("Only the king can appoint Dukes!");
						break;
					}
					if(state != 1){
						error("You can only select dukes during the pre-game");
						break;
					}
					if(game.numDukes >= game.maxDukes + game.maxLords){
						error("Maximum number of Dukes already appointed");
						break;
					}
					var dukeCandidate = game.getPlayerByName(input.split(" ")[1]);
					
					if(dukeCandidate == false){
						error("Cannot find player");
						break;
					}
					if(dukeCandidate.role != null){
						error("Player already has a role");
					}
					
					game.setDuke(dukeCandidate);
					sendAll(dukeCandidate.name + " has been appointed a Duke!");
					
					//Could remove the duke'd person's socket and send one specific to say "You are now a duke."
					break;
				case "/sc":
				case "/sucessor":
					if(state < 2 || state > 8){
						error("Cannot set a sucessor right now");
						break;
					}
					if(player.role == null || player.role.name != "Lord" || player.role.name != "Duke"){
						error("You cannot set a sucessor");
						break;
					}
					var sucessorName = input.split(" ")[1];
					var sucessor = getPlayerByName(sucessorName);
					if(sucessor == false){
						error("cannot find player");
						break;
					}
					if(player.role.name == "Lord"){
						if(sucessor.role == null || sucessor.role.title != "Duke"){
							error("Cannot appoint that player as sucessor");
							break;
						}
					}
					else if(player.role.name == "Duke"){
						if(sucessor.role == null || (sucessor.role.title != "Earl" && sucessor.role.title != "Knight"){
							error("Cannot appoint that player as sucessor");
							break;
						}
					}
					player.sucessor = sucessor;
					sendBack(sucessor.name + " is now your sucessor.");
					
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
