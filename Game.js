const Player = require('./Player.js');
const Role = require('./Roles.js');

class Game{
	constructor(name, io,playerList, minPlayers){
		this.name = name;
		this.io = io;
		this.socketList = [];
		this.playerList = playerList;
		this.numLords = 0;
		this.maxLords;
		this.numDukes = 0;
		this.maxDukes;
		this.numEarls = 0;
		this.maxEarls;
		this.numKnights = 0;
		this.maxKnights;
		this.numPeasants = 0;
		this.dukes = [];
		this.timerInterval = null;
		this.timer = 30;
		this.state = -1;
	}
	sendAll(message){
		var obj = {"player":"Game","message":message};
		this.io.to(this.name).emit('message', obj);
	}
	
	timerFunc() {
		//Send out final message once game is over
		if(this.timer == -10){
			var obj = {"cur_time":"Game Finished"};
			this.io.to(this.name).emit('timer', obj);
			return;
		}
		if(this.timer <= 0){
			this.state++;
			this.setState();
			var obj = {"cur_time":this.timer};
			this.io.to(this.name).emit('timer', obj);
			return;
		}
		this.timer--;
		var obj = {"cur_time":this.timer};
		this.io.to(this.name).emit('timer', obj);
	}
	setState(){
		var name = "";
		if(this.state == 0){
			name = "Voting";
			this.timer = 2;
		}
		else if(this.state == 1){
			var king = this.setKingByVotes();
			this.sendAll(king.name + " has been elected King with " + king.votes + " votes!");
			name = "Pre-Game";
			this.timer = 2;
		}
		else if(this.state == 2){
			name = "Day 1";
			this.timer = 600;
			this.assignRoles();
			for(var i = 0; i < this.playerList.length; i++){
				console.log(this.playerList[i].name + " is a " + this.playerList[i].role.title);
			}
		}
		else if(this.state == 8){
			name = "Fin";
			this.timer = -10;
			this.clearInterval(this.timerInterval);
			this.timerFunc();
		}
		else{
			name = "Day " + (state-1);
			this.timer = 600;
		}
		var obj = {"state":name};
		this.io.to(this.name).emit('gamestate', obj);
	}

    addPlayer(name, id, socket){
		this.socketList.push(socket);
		var player = new Player(name, id, null);
        this.playerList.push(player);
		var game = this;
		
		socket.on('messageFromClient', function(data){
			
			
			function error(message){
				var obj = {"player":"Error","message":message};
				socket.emit('message', obj);
			}
			function sendBack(message){
				var obj = {"player":"Game","message":message};
				socket.emit('message', obj);
			}
			
			var input = data.content;
			input = input.trim();
			//public chat
			if(!input.startsWith("/")){
				var obj = {"player":player.name,"message":input};
				game.io.to(game.name).emit('message', obj); //this is sent to all clients
			}
			else{
			//otherwise, it's a command
				switch(input.split(" ")[0]){
					case "/n":
					case "/name":
						//G can do this, only during lobby <newusername>
						if(game.state != -1){
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
						if(game.state != -1){
							error("The game is already started!");
							break;
						}
						//HOST can do this, only during lobby
						game.sendAll("The game is starting!");
						game.state = 0; //Voting
						game.setState();
						game.timerFunc();
						setInterval(function(){
							game.timerFunc();
						}, 1000);
		//game.timerInterval = setInterval(game.timerFunc,1000);
						break;
					case "/v":
					case "/vote":
						if(game.state != 0){
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
						if(game.state != 1){
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
						if(game.state < 2 || game.state > 8){
							error("Cannot set a sucessor right now");
							break;
						}
						if(player.role == null || (player.role.title != "Lord" && player.role.title != "Duke")){
							error("You cannot set a sucessor");
							console.log(player.role.title);
							break;
						}
						if(input.split(" ").length == 1){
							if(player.sucessor == null)
								sendBack("You don't have a sucessor.");
							else
								sendBack("Your sucessor is currently " + player.sucessor.name);
							break;
						}
						var sucessorName = input.split(" ")[1];
						var sucessor = game.getPlayerByName(sucessorName);
						if(sucessor == false){
							error("cannot find player");
							break;
						}
						if(player.role.title == "Lord"){
							if(sucessor.role == null || sucessor.role.title != "Duke"){
								error("Sucessor must be a Duke.");
								break;
							}
						}
						else if(player.role.title == "Duke"){
							if(sucessor.role == null || (sucessor.role.title != "Earl" && sucessor.role.title != "Knight")){
								error("Sucessor must either be an Earl or a Knight.");
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
		
    }
	getPlayerById(id){
		for(var i = 0; i < this.playerList.length; i++){
			if(this.playerList[i].id == id){
				return this.playerList[i];
			}
		}
	}
	getPlayerByName(name){
		for(var i = 0; i < this.playerList.length; i++){
			if(this.playerList[i].name == name)
				return this.playerList[i];
		}
		return false;
	}
	setKingByVotes(){
		var highestVotes = 0;
		var highestPlayer = this.playerList[0];
		for(var i = 1; i < this.playerList.length; i++){
			if(this.playerList[i].votes > highestVotes){
				highestPlayer = this.playerList[i];
				highestVotes = highestPlayer.votes;
			}
		}
		highestPlayer.role = new Role.King();
		return highestPlayer;
	}
	setDuke(player){
		player.role = new Role.Duke();
		this.numDukes++;
		this.dukes.push(player);
		return player;
	}
	calculateRoles(){
		var numPlayers = this.playerList.length;
		
			this.maxKnights = Math.floor(numPlayers/3);
			this.maxEarls = Math.floor(numPlayers/9);
			this.maxDukes = 2*this.maxEarls;
			this.maxLords = 2;
		
	}
	// shuffle unbiasedly shuffles the passed array
	shuffle(array) {
		var currentIndex = array.length, temporaryValue, randomIndex;

		// While there remain elements to shuffle...
		while (0 !== currentIndex) {

			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	}
    assignRoles(){
		console.log("assigning roles");
		var playerPool = [];
        var player;
		this.calculateRoles();
       
        for(var i = 0; i < this.playerList.length; i++){
			if(this.playerList[i].role == null)
				playerPool.push(this.playerList[i]);
		}
		playerPool = this.shuffle(playerPool);
		var initDukes = this.maxDukes+ this.maxLords - this.dukes.length;
		//randomly assign dukes if king hasn't done it already
		for(var x = 0; x < initDukes; x++){
			player = playerPool.pop();
			this.setDuke(player);
		}
        //assign dukes randomly to lord
		this.dukes = this.shuffle(this.dukes);
        for(var x = 0; x < this.maxLords; x++){
            player = this.dukes.pop();
            player.role = new Role.Lord();
        }
		
        //assign knights
        for(var x = 0; x < this.maxKnights; x++){
            player = playerPool.pop();
            player.role = new Role.Knight();
			this.numKnights++;
        }

        //assign earls
        for(x = 0; x < this.maxEarls; x++){
            player = playerPool.pop();
            player.role = new Role.Earl();
			this.numEarls++;
        }

        //assign remaining players as peasants
		while(playerPool.length > 0){
			player = playerPool.pop();
			player.role = new Role.Peasant();
			this.numPeasants++;
		}

    }
		
};

module.exports = Game;