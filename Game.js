const Player = require('./Player.js');

class Game{
	constructor(playerList, minPlayers){
		this.playerList = playerList;
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
    assignRoles(){
        var playerPool = playerList;
        var player;

        var numKnights = playerList.length/3;
        var numEarls = numKnights/3;
        var numDukes = 2*numEarls+2;
        
        shuffle(playerPool);
       
        //King is chosen by vote (for now it's just the last player)
        player = playerPool.pop();
        player.role = new King();

        //King chooses Dukes (for now its just the last players)
        var dukes = [];
        for(x = 0; x < numDukes; x++){
           
            player = playerPool.pop();
            player.role = new Duke();
            dukes.push(player);
         
        }
        shuffle(dukes);
        
        //assign 2 random Dukes as Lords
        for(x = 0; x < 2; x++){
            player = dukes.pop();
            player.role = new Lord();
            
        }

        //assign knights
        for(x = 0; x < numKnights; x++){
            
            player = playerPool.pop();
            player.role = new Knight();
        }

        //assign earls
        for(x = 0; x < numEarls; x++){
           
            player = playerPool.pop();
            player.role = new Earl();
            
        }

       
        
        //assign remaining players as peasants
        for(x = 0; x < playerPool.length; x++){
            player = playerPool.pop();
            player.role = new Peasant();
        }

    }
		// shuffle unbiasedly shuffles the passed array
	static shuffle(array) {
		var currenstIndex = array.length, temporaryValue, randomIndex;

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
};

module.exports = Game;