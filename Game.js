const Player = require('./Player.js');
const Role = require('./Roles.js');
const Command = require('./Commands.js');
const State = require('./States.js');

class Game{
	constructor(name, io,playerList, minPlayers){
		this.name = name;
		this.io = io;
		this.playerList = playerList;
		this.state = null;
		this.numDays = 7;
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
		this.roleToTax = "Random";
		this.minPlayers = minPlayers;
		this.rolesList = ["King", "Lord", "Duke", "Earl", "Knight", "Peasant", "Spectator"];
	}
	promotePlayers(){
		var numberToPromote =  this.maxEarls - this.getPlayersByRole("Earl").length;
		for(var i = 0; i < numberToPromote; i++){
			//find a knight
			var knightList = getPlayersByRole("Knight");
			if(knightList.length == 0)
				knightList = getPlayersByRole("Peasant");
				
			//promote knight with highest prestige
			var highestKnight = [knightList[0]];
			for(var j = 1; j < knightList.length; j++){
				if(knightList[j].prestige == highestKnight[0].prestige)
					highestKnight.push(knightList[j]);
				else if(knightList[j].prestige > highestKnight[0].prestige)
					highestKnight = [knightList[j]];
			}
			highestKnight = this.shuffle(highestKnight)[0];
			var target = player.role.target;
			var protectTarget = player.role.protectTarget;
			highestKnight.role = new Role.Earl();
			highestKnight.target = target;
			highestKnight.protectTarget = target;
			this.sendAll(highestKnight.name + " is appointed the rank of Earl.");
		
		}
		numberToPromote =  this.maxKnights - this.getPlayersByRole("Knight").length;
		for(var i = 0; i < numberToPromote; i++){
			//find a Peasant
			var peasantList = getPlayersByRole("Peasant");
		
			//promote peasant with highest prestige
			var highestPeasant = [peasantList[0]];
			for(var j = 1; j < peasantList.length; j++){
				if(peasantList[j].prestige == highestPeasant[0].prestige)
					highestPeasant.push(peasantList[j]);
				else if(peasantList[j].prestige > highestPeasant[0].prestige)
					highestPeasant = [peasantList[j]];
			}
			highestPeasant = this.shuffle(highestPeasant)[0];
			var target = player.role.target;
			var protectTarget = player.role.protectTarget;
			highestPeasant.role = new Role.Earl();
			highestPeasant.target = target;
			highestPeasant.protectTarget = target;
			this.sendAll(highestPeasant.name + " is appointed the rank of Knight.");
		}
	}
	promoteSuccessor(player){
		
		if(player.role.successor != null && player.role.successor.role.title == "Peasant")
			return;
		else{
			if(player.role.title == "Lord")
				player.role.successor = this.shuffle(getPlayersByRole("Duke"))[0];
			else
				player.role.successor = this.shuffle(getPlayersByRole("Earl").concat(getPlayersByRole("Knight")))[0];	
		}
		
		var executeTarget = player.role.successor.executeTarget;
		var target = player.role.successor.target;
		var protectTarget = player.role.successor.protectTarget;
		
		if(player.role.title == "Lord"){
			promoteSuccessor(player.role.successor);
			player.role.successor.role = new Role.Lord();
			this.sendAll(player.role.successor.name + " has been appointed Lord!");
		}
		else{
			player.role.successor.role = new Role.Duke();
			this.sendAll(player.role.successor.name + " has been appointed Duke!");
		}
		
		player.role.successor.role.executeTarget = executeTarget;
		player.role.successor.role.protectTarget = protectTarget;
		player.role.successor.role.target = target;
			
	}
	getPlayersInOrder(limit){
		if(limit > this.rolesList)
		var array = [];
		for(var i = 0; i < limit; i++){
			array.concat(this.getPlayersByRole(this.rolesList[i]));
		}
		return array;
	}
	//sends a Game message to everyone in the game
	sendAll(message){
		var obj = {"player":"Game","message":message};
		this.io.to(this.name).emit('message', obj);
	}
	//sends a yell message to everyone in the game
	sendYell(message,player){
		var obj = {"player":player.name,"message":message};
		this.io.to(this.name).emit('yell', obj);
	}

	//returns an array of commands as objects
	getCommandsList(){
		var cList = [];
		for(var i = 1; true; i++){
			var objName = Object.keys(Command)[i];
			//check to see if we have finished looking through all the commands
			if(objName == null)
				return cList;
			var commandObj = new Command[objName];
			cList.push(commandObj);
		}
	}

	//counts timer down and changes state when it reaches 0
	timerFunc() {
		//Send out final message once game is over
		if(this.timer == -10){
			var obj = {"cur_time":"Game Finished"};
			this.io.to(this.name).emit('timer', obj);
			return;
		}
		//change state when timer reaches 0
		else if(this.timer <= 0){
			this.state++;
			this.setState();
			var obj = {"cur_time":this.timer};
			this.io.to(this.name).emit('timer', obj);
			return;
		}
		//send current time to client
		this.timer--;
		var obj = {"cur_time":this.timer};
		this.io.to(this.name).emit('timer', obj);
	}
	//changes the state depending on game.state
	setState(state){
		var state_name = "";
		this.state = state;
		switch(this.state){
			case -5:
				state_name = "Emergency Election";
				this.timer = 30;
				break;
			case 0:
				state_name = "Voting";
				this.timer = 3;
				break;
			case 1:
				var king = this.setKingByVotes();
				this.sendAll(king.name + " has been elected King with " + king.votes + " votes!");
				state_name = "Pre-Game";
				this.timer = 3;
				break;
			case 2:
				state_name = "Day 1";
				this.timer = 600;
				this.assignRoles();
				//temporary: console log a list of all players and their role
				for(var i = 0; i < this.playerList.length; i++)
					console.log(this.playerList[i].name + " is a " + this.playerList[i].role.title);
				break;
			case 8:
				state_name = "Fin";
				this.timer = -10;
				this.clearInterval(this.timerInterval);
				this.timerFunc();
				break;
			default:
				state_name = "Day " + (this.state-1);
				this.timer = 600;
		}

		var obj = {"state":state_name};
		this.io.to(this.name).emit('gamestate', obj);
	}

	//adds a player to this game
    addPlayer(name, socket){

		var player = new Player(name, new Role.Spectator(), socket); //create player object

		//set first player as host
		if(this.playerList.length == 0){
			this.state = new State.GameLobby(this.name);
			this.state.startTimer(this);
			player.isHost = true;
		}
        this.playerList.push(player);
		var game = this;
		game.sendAll(player.name + " has joined the game.");

		//handle messages from client
		socket.on('messageFromClient', function(data){
			var input = data.content;
			input = input.trim();

			//chat
			if(!input.startsWith("/")){
				var obj = {"player":player.name,"message":input};
				game.io.to(game.name).emit('message', obj); //this is sent to all clients
			}
			//commands
			else{
				var cList = game.getCommandsList();
				for(var i = 1; i < cList.length; i++){
					if (cList[i].names.includes(input.split(" ")[0])){
						cList[i].execute(input, player, game);
						return;
					}
				}
				player.sendBack("Command not found. Use /help for help");
			}
		});
    }
	//returns the player object with the given name, or false if unable to be found
	getPlayerByName(name){
		for(var i = 0; i < this.playerList.length; i++)
			if(this.playerList[i].name == name)
				return this.playerList[i];
		return false;
	}

	//returns an array of all players who have the given role
	getPlayersByRole(roleName){
		var players = [];
		for(var i = 0; i < this.playerList.length; i++)
			if(this.playerList[i].role.title == roleName)
				players.push(this.playerList[i]);
		return players;
	}

	//set king by votes. player with most votes is king, returns player object who is set as king. Clears votes of players.
	setKingByVotes(){
		var highestVotes = this.playerList[0].votes;
		var highestPlayers = [this.playerList[0]];
		for(var i = 1; i < this.playerList.length; i++){
			if(this.playerList[i].votes == highestVotes)
				highestPlayers.push(this.playerList[i]);
			else if(this.playerList[i].votes > highestVotes){
				highestPlayers = [this.playerList[i]];
				highestVotes = highestPlayers[i].votes;
			}
			//clear the vote
			this.playerList[i].votes = 0;
			this.playerList[i].votedFor = null;
		}
		this.shuffle(highestPlayers);
		if(highestPlayers[0].role.title != "Spectator")
			this.promoteSuccessor(highestPlayers[0]);
		highestPlayers[0].role = new Role.King();
		return highestPlayers[0];
	}
	//sets the player
	setDuke(player){
		player.role = new Role.Duke();
		this.numDukes++;
		this.dukes.push(player);
		return player;
	}
	//calculates the number of players that should be at each role
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

	//assigns all roles
    assignRoles(){
		console.log("assigning roles");
		var playerPool = [];
        var player;
		this.calculateRoles();

		//put all spectators in a player pool for assignment
        for(var i = 0; i < this.playerList.length; i++)
			if(this.playerList[i].role.title == "Spectator")
				playerPool.push(this.playerList[i]);

		playerPool = this.shuffle(playerPool);
		var initDukes = this.maxDukes+ this.maxLords - this.dukes.length; //number of initial dukes
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
			this.numLords++;
			this.numDukes--;
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
