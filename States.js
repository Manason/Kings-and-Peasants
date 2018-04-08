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
	constructor(game){
		super("PreGame","Pre-Game",30,game);
	}

	endState(){
		this.game.assignRoles();
		this.game.state = new Day(this.game,1);
		this.game.state.startTimer(this.game);
	}
}

class Day extends State{
	constructor(game,dayNumber){
		this.dayNumber = dayNumber;
		super("Day","Day"+dayNumber,600,game);
	}

	endState(){
		this.game.state = new NightPt1(this.game,this.dayNumber);
		this.game.state.startTimer(this.game);
	}
}

class NightPt1 extends State{
	constructor(game,dayNumber){
		this.dayNumber = dayNumber;
		super("Night","Night"+dayNumber,10,game);
	}

	endState(){
		if(EE needed)
			game.state = new EmergencyElection(this.game,this.dayNumber);
		else
			game.state = new NightPt2(this.game,this.dayNumber);
		this.game.state.startTimer(this.game);
	}
}

class NightPt2 extends State{
	constructor(game,dayNumber){
		this.dayNumber = dayNumber;
		super("Night","Night"+dayNumber,10,game);
	}

	endState(){
		if(this.dayNumber == game.numDays)
			console.log("END THE GAME!");
		this.game.state = new Day(this.game,this.dayNumber+1);
	}
}

class EmergencyElection extends State{
	constructor(game,dayNumber){
		super("Election","Emergency Election");
	}

	endState(){
		this.game.state = new NightPt2(this.game,this.dayNumber);
		this.game.state.startTimer(this.game);
	}
}

module.exports = {State, GameLobby, Voting, PreGame, Day, NightPt1, NightPt2, EmergencyElection};
