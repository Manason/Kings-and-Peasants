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
	doNight(){



		//process assassinations
		var orderedPlayerList = this.getPlayersInOrder(6);
		for(var i = 0; i < this.playerList.length; i++){
			//if their attack - protectors >= defense
			if((orderedPlayerList[i].assassins.length - orderedPlayerList[i].protectors.length) >= Math.floor(orderedPlayerList.length/orderedPlayerList[i].role.defense)){
				orderedPlayerList[i].kill();
				this.sendAll(orderedPlayerList[i].name + " has been assassinated!");
			}
			//attack didn't go through
			else{
				orderedPlayerList[i].sendBack("There was an unsuccessful attempt on your life. The would be assassins managed to escape.");
				for(var j = 0; j < orderedPlayerList[i].assassins.length; j++)
					orderedPlayerList[i].assassins[j].sendBack("Your assassination attempt on " + orderedPlayerList[i].name + " was unsuccessful.");
			}

		}

		//if king dies, new election()
		if(this.getPlayersByRole("King").length == 0){

		}

		//executions
		orderedPlayerList = this.getPlayersInOrder(3);
		for(var i = 0; i < orderedPlayerList.length; i++){
			if(orderedPlayerList[i].role.executeTarget != null){
				orderedPlayerList[i].role.executeTarget.kill();
				this.sendAll(orderedPlayerList[i].executeTarget.name + " was executed on order of " + orderedPlayerList[i].role.title + " " + orderedPlayerList[i].name + ".");
			}

		}
		//collect tax
		if(this.getPlayersByRole("King").length != 0){ //king is not dead
			if(this.roleToTax == "Random"){
				var rolesList = this.rolesList;
				this.shuffle(rolesList);
				this.roleToTax = rolesList[0];
			}
			var playersToTax = this.getPlayersByRole(this.roleToTax);
			var amount = 0;
			for(var i = 0; i < playersToTax.length; i++){
				var taxPrestige = Math.floor(playersToTax[i].prestige * 15);
				playersToTax[i].prestige -= taxPrestige;
				this.getPlayersByRole("King")[0].prestige += taxPrestige;
				amount += taxPrestige;
				playersToTax[i].sendBack("The King has taken " + amount + " prestige from you as a daily tax.");
			}
			this.sendAll("The King has collected tax from the " + this.roleToTax + "s.");
		}
		//remove spies
		//remove blocks
		//set duke blocks
		//remove assassins and protectors
				//orderedPlayerList[i].assassins = [];
				//orderedPlayerList[i].protectors = [];

		//promotions/demotions
		//income


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

	//set king by votes. player with most votes is king, returns player object who is set as king
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
		}
		this.shuffle(highestPlayers);
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
