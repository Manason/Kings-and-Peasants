const Player = require('./Player.js');
const Role = require('./Roles.js');
const Command = require('./Commands.js');

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
		var player = new Player(name, id, null, socket);
        this.playerList.push(player);
		var game = this;
		
		socket.on('messageFromClient', function(data){
			
			//TODO move these to Game class
			
			var input = data.content;
			input = input.trim();
			//public chat
			if(!input.startsWith("/")){
				var obj = {"player":player.name,"message":input};
				game.io.to(game.name).emit('message', obj); //this is sent to all clients
			}
			else{
				for(var i = 1; true; i++){
					var objName = Object.keys(Command)[i];
					if(objName == null)
						return;
					var commandObj = new Command[objName];
					if(commandObj.names.includes(input.trim(" ")[0])){
						command.Obj.execute(input, player, game);
						return;
					}
				}
				player.sendBack("Command not found. Use /help for help");
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