const Player = require('./Player.js');
const Role = require('./Roles.js');

class Game{
	constructor(playerList, minPlayers){
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
	}
    addPlayer(name, id){
        this.playerList.push(new Player(name, id, null));
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