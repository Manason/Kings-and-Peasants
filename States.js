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
		super("Voting","Voting",2);
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
		super("PreGame","Pre-Game",2);
	}

	endState(){
		super.endState();
		this.game.assignRoles();
		for(var i = 0; i < this.game.playerList.length; i++)
			this.game.playerList[i].sendRole();
		this.game.state = new Day(1);
		this.game.state.startTimer(this.game);
	}
}

class Day extends State{
	constructor(dayNumber){
		super("Day","Day "+dayNumber,20);
		this.dayNumber = dayNumber;
	}
	startTimer(game){
		super.startTimer(game);
		this.game.sendPlayerList();
		//handle income
		var orderedPlayerList = this.game.getPlayersInOrder(6);
		while(orderedPlayerList.length > 0){
			var currentPlayer = orderedPlayerList.pop();
			currentPlayer.setPrestige(currentPlayer.prestige + currentPlayer.role.wage);
			currentPlayer.sendBack("A new day. You receive your daily wage of " + currentPlayer.role.wage + " prestige from the Kingdom.");
		}
	}
	endState(){
		super.endState();
		//process assassinations
		var orderedPlayerList = this.game.getPlayersInOrder(6);
		for(var i = 0; i < orderedPlayerList.length; i++){
			//notify watchers of visit
			if(orderedPlayerList[i].target != null){
				orderedPlayerList[i].notifyWatchers(orderedPlayerList[i].name + " visited " + orderedPlayerList[i].target.name);
				orderedPlayerList[i].target.notifyWatchers(orderedPlayerList[i].name + " visited " + orderedPlayerList[i].target.name);
			}
			else if(orderedPlayerList[i].protectTarget != null){
				orderedPlayerList[i].notifyWatchers(orderedPlayerList[i].name + " visited " + orderedPlayerList[i].protectTarget.name);
				orderedPlayerList[i].protectTarget.notifyWatchers(orderedPlayerList[i].name + " visited " + orderedPlayerList[i].protectTarget.name);
			}
			//if their attack - protectors >= defense
			if((orderedPlayerList[i].assassins.length - orderedPlayerList[i].protectors.length) >= Math.floor(orderedPlayerList.length/orderedPlayerList[i].role.defense)){
				orderedPlayerList[i].kill(this.game);
				this.game.sendAll(orderedPlayerList[i].name + " has been assassinated!");
			}
			//attack didn't go through
			else if(orderedPlayerList[i].assassins.length > 0){
				orderedPlayerList[i].sendBack("There was an unsuccessful attempt on your life. The would be assassins managed to escape.");
				for(var j = 0; j < orderedPlayerList[i].assassins.length; j++)
					orderedPlayerList[i].assassins[j].sendBack("Your assassination attempt on " + orderedPlayerList[i].name + " was unsuccessful.");
			}

		}
		//handle promotions
		this.game.promotePlayers();
		//print list of players
		var orderedPlayerList2 = this.game.getPlayersInOrder(6);

		//if king dies, new election()
		if(this.game.getPlayersByRole("King").length == 0){
			this.game.state = new EmergencyElection(this.dayNumber);
			this.game.state.startTimer(this.game);
		}
		//otherwise go directly to night
		else{
			this.game.state = new Night(this.dayNumber);
			this.game.state.startTimer(this.game);
		}
	}
}

class Night extends State{
	constructor(dayNumber){
		super("Night","Night"+dayNumber,5);
		this.dayNumber = dayNumber;
	}
	startTimer(game){
		super.startTimer(game);
		var orderedPlayerList2 = this.game.getPlayersInOrder(6);

		//collect tax
		if(this.game.roleToTax == null || this.game.roleToTax == "Random"){
			var rolesList = this.game.rolesList.slice(1,6);
			this.game.shuffle(rolesList);
			this.game.roleToTax = rolesList[0];
		}
		var playersToTax = this.game.getPlayersByRole(this.game.roleToTax);
		var amount = 0;

		for(var i = 0; i < playersToTax.length; i++){
			var taxPrestige = Math.floor(playersToTax[i].prestige * 0.15);
			playersToTax[i].setPrestige(playersToTax[i].prestige - taxPrestige);
			this.game.getPlayersByRole("King")[0].setPrestige(this.game.getPlayersByRole("King")[0].prestige + taxPrestige);
			amount += taxPrestige;
			playersToTax[i].sendBack("The King has taken " + taxPrestige + " prestige from you as a daily tax.");
		}
		this.game.getPlayersByRole("King")[0].sendBack("You've gained " + amount + " prestige from tax.");
		this.game.sendAll("The King has collected tax from the " + this.game.roleToTax + "s.");

		//print player list
		orderedPlayerList2 = this.game.getPlayersInOrder(6);

		//executions
		var orderedPlayerList = this.game.getPlayersInOrder(3);
		for(var i = 0; i < orderedPlayerList.length; i++){
			//if we should execute the player
			if(orderedPlayerList[i].role.executeTarget != null && orderedPlayerList[i].role.title != orderedPlayerList[i].role.executeTarget.title){
				this.game.sendAll(orderedPlayerList[i].role.executeTarget.name + " was executed on order of " + orderedPlayerList[i].role.title + " " + orderedPlayerList[i].name + ".");
				orderedPlayerList[i].role.executeTarget.kill(this.game);

			}
		}

		//handle promotions
		this.game.promotePlayers();

		//handle blocks
		orderedPlayerList = this.game.getPlayersInOrder(6);
		for(var i = 0; i < orderedPlayerList.length; i++){
			var currentPlayer = orderedPlayerList[i];
			currentPlayer.blocked = false; //remove the block of every player
			//handle dukes
			if(currentPlayer.role.title == "Duke"){
				//duke blocks another duke
				if(currentPlayer.role.blocking != null && currentPlayer.role.blocking.role.title == "Duke")
					currentPlayer.role.blocking.blocked = true;
				currentPlayer.role.blocking = null;
			}
		}

		//handle daily reset
		for (var i = 0; i < this.game.playerList.length; i++){
			var currentPlayer = this.game.playerList[i];
			currentPlayer.spies = [];
			currentPlayer.assassins = [];
			currentPlayer.protectors = [];
			currentPlayer.role.target = null;
			currentPlayer.role.protectTarget = null;
			currentPlayer.role.executeTarget = null;
			if(currentPlayer.role.title == "Duke"){
				currentPlayer.role.blocking = null;
			}
			if(currentPlayer.role.title == "Knight"){
				currentPlayer.role.spying = null;
			}
			this.game.roleToTax = "Random";
		}
	}

	endState(){
		super.endState();
		if(this.dayNumber == this.game.numDays){
			this.game.state = new Scoreboard();
			this.game.state.startTimer(this.game);
			console.log("END THE GAME!");
			return;
		}


		this.game.state = new Day(this.dayNumber+1);
		this.game.state.startTimer(this.game);
	}
}

class EmergencyElection extends State{
	constructor(dayNumber){
		super("Election","Emergency Election", 10);
		this.dayNumber = dayNumber;
	}
	startTimer(game){
		super.startTimer(game);
		this.game.sendAll("An Emergency Election has begun. Dukes may now vote one of the Lords as the new King!");
	}

	endState(){
		super.endState();
		var newKing = this.game.setKingByVotes();
		this.game.promotePlayers();
		this.game.state = new Night(this.dayNumber);
		this.game.state.startTimer(this.game);
	}
}

class Scoreboard extends State{
	constructor(){
		super("Scoreboard", "Scoreboard", 30);
	}
	startTimer(game){
		super.startTimer(game);
		this.game.sendScoreboard();
	}
	endState(){
		super.endState();
		//TODO: handle sending the players somewhere after the game is over
	}
}

module.exports = {State, GameLobby, Voting, PreGame, Day, Night, EmergencyElection, Scoreboard};
