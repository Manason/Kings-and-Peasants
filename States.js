class State{
	constructor(name, displayName, duration){
		this.name = name;
		this.displayName = displayName;
		this.duration = duration;
		this.timerInterval = null;
	}

	startTimer(game){
		this.game = game;
		var obj = {"state": this.displayName};
		this.game.io.to(this.game.name).emit('gamestate', obj);
		var timer = this.duration;
		var state = this;
		this.timerInterval = setInterval(function(){
			if(state.duration != -1)
				timer--;
			else
				timer = "Waiting...";
			obj = {"cur_time": timer};
			game.io.to(game.name).emit('timer', obj);
			if(timer != "Waiting..." && timer <= 0)
				state.endState();
		},1000);
	}

	endState(){
		console.log((this.timerInterval == null));
		if(this.timerInterval != null)
			clearInterval(this.timerInterval);
	}
}

class GameLobby extends State{
	constructor(gameName){
		super("GameLobby",gameName,-1);
	}

	endState(){
		super.endState();
		this.game.state = new Voting(this.game);
		this.game.state.startTimer(this.game);
	}
}

class Voting extends State{
	constructor(){
		super("Voting","Voting",5);
	}

	endState(){
		super.endState();
		this.game.setKingByVotes();
		this.game.state = new PreGame(this.game);
		this.game.state.startTimer(this.game);
	}
}

class PreGame extends State{
	constructor(){
		super("PreGame","Pre-Game",30);
	}

	endState(){
		super.endState();
		this.game.assignRoles();
		this.game.state = new Day(1);
		this.game.state.startTimer(this.game);
	}
}

class Day extends State{
	constructor(dayNumber){
		this.dayNumber = dayNumber;
		super("Day","Day"+dayNumber,600);
	}

	endState(){
		super.endState();
		
		//process assassinations
		var orderedPlayerList = this.game.getPlayersInOrder(6);
		for(var i = 0; i < orderedPlayerList.length; i++){
			//notify watchers of visit
			if(orderedPlayerList[i].target != null)
				orderedPlayerList[i].notifyWatchers(orderedPlayerList[i].name + " visited " + orderedPlayerList[i].target.name);
				orderedPlayerList[i].target.notifyWatchers(orderedPlayerList[i].name + " visited " + orderedPlayerList[i].target.name);
			else if(orderedPlayerList[i].protectTarget != null){
				orderedPlayerList[i].notifyWatchers(orderedPlayerList[i].name + " visited " + orderedPlayerList[i].protectTarget.name);
				orderedPlayerList[i].protectTarget.notifyWatchers(orderedPlayerList[i].name + " visited " + orderedPlayerList[i].protectTarget.name);
			}
			//if their attack - protectors >= defense
			if((orderedPlayerList[i].assassins.length - orderedPlayerList[i].protectors.length) >= Math.floor(orderedPlayerList.length/orderedPlayerList[i].role.defense)){
				orderedPlayerList[i].kill();
				this.game.sendAll(orderedPlayerList[i].name + " has been assassinated!");
			}
			//attack didn't go through
			else{
				orderedPlayerList[i].sendBack("There was an unsuccessful attempt on your life. The would be assassins managed to escape.");
				for(var j = 0; j < orderedPlayerList[i].assassins.length; j++)
					orderedPlayerList[i].assassins[j].sendBack("Your assassination attempt on " + orderedPlayerList[i].name + " was unsuccessful.");
			}
			

		}
		//if king dies, new election()
		if(this.game.getPlayersByRole("King").length == 0){
			game.state = new EmergencyElection(this.game,this.dayNumber);	
			this.game.state.startTimer(this.game);
		}
		//otherwise go directly to night
		else{
			this.game.state = new Night(this.game,this.dayNumber);
			this.game.state.startTimer(this.game);
		}
	}
}

class Night extends State{
	constructor(dayNumber){
		this.dayNumber = dayNumber;
		super("Night","Night"+dayNumber,10);
	}
	startTimer(game){
		super.startTimer(game);
		
		//executions
		var orderedPlayerList = this.game.getPlayersInOrder(3);
		for(var i = 0; i < orderedPlayerList.length; i++){
			if(orderedPlayerList[i].role.executeTarget != null){
				orderedPlayerList[i].role.executeTarget.kill();
				this.game.sendAll(orderedPlayerList[i].executeTarget.name + " was executed on order of " + orderedPlayerList[i].role.title + " " + orderedPlayerList[i].name + ".");
			}
		}
	}

	endState(){
		super.endState();
		if(this.dayNumber == this.game.numDays)
			console.log("END THE GAME!");
	
		this.game.state = new Day(this.game,this.dayNumber+1);
		this.game.state.startTimer(this.game);
	}
}

class EmergencyElection extends State{
	constructor(game,dayNumber){
		super("Election","Emergency Election", 30);
	}
	startTimer(game){
		super.startTimer(game);
		this.game.sendAll("An Emergency Election has begun. Dukes may now vote one of the Lords as the new King!");
	}

	endState(){
		
		this.game.state = new Night(this.game,this.dayNumber);
		this.game.state.startTimer(this.game);
	}
}

module.exports = {State, GameLobby, Voting, PreGame, Day, Night, EmergencyElection};
