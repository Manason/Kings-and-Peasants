class Command{
	constructor(names, allowedNumArgs, allowedStates, allowedRoles, hostOnly, helpText){
		this.names = names;
		this.allowedNumArgs = allowedNumArgs;
		this.allowedStates = allowedStates;
		this.allowedRoles = allowedRoles;
		this.hostOnly = hostOnly;
		this.helpText = helpText;
	}
	execute(numArgs, player, game){
		this.player = player;
		this.game = game;
		if(!this.allowedNumArgs.includes(numArgs)){
			this.sendHelp();
			return false;
		}
		if(!this.allowedStates.includes(game.state)){
			player.error(this.helpText[1]);
			return false;
		}
		if(!this.allowedRoles.includes(player.role.title)){
			player.error(this.helpText[2]);
			return false;
		}
		if(hostOnly && !player.isHost){
			player.error("Only the host can do this action.");
			return false;
		}
		return true;
	}
	sendHelp(){
		this.player.sendBack(this.helpText[0]); //this won't work until Game.sendBack() is updated
	}
	//TODO do the allowedStates, allowedRoles, and hostOnly error messages
};

class Name{
	constructor(){
		super(["/n", "/name"], [1], [-1], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant", "Spectator"], false, ["/name <playerName> - Sets your player name.","You can't change your name once the game has started!","Everyone should be able to do this. Contact admin."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(" ").length-1,player, game) == false) //this might be wrong
			return;
		input = input.split(" ");
		if(game.getPlayerByName(input[1]) != false){
			if(player.name == input[1]){
				player.sendBack("Your name is already "+ player.name);
			} else {
				player.sendBack("Username already taken.");
			}
			return;
		}
		player.name = input[1];
		player.sendBack("Username set to " + player.name);
	}
}

class StartGame{
	constructor(){
		super(["/start", "/startgame"], [0], [-1], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant", "Spectator"], true, ["/startgame - Starts the game. 🙃","The game is already started!","Everyone should be able to do this. Contact admin."]);
	}
	execute(input, numArgs, player, game){
		if(super.execute(input.split(" ").length-1,player, game) == false) //this might be wrong
			return;
		game.sendAll("The game is starting!");
		game.state = 0; //Voting
		game.setState();
		game.timerFunc();
		game.timerInterval = setInterval(function(){
			game.timerFunc();
		}, 1000);
	}
}

class Vote{
	constructor(){
		super(["/v", "/vote"], [1], [-1], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant", "Spectator"], true, ["/vote <playerName> - Sets or changes your vote to the specified player.","The vote is closed","Only Dukes can vote for the new King!"]);
	}
	execute(input, player, game){
		if(super.execute(input.split(" ").length-1,player, game) == false) //this might be wrong
			return;
		input = input.split(" ");
		var votingFor = game.getPlayerByName(input[1]);
		if(votingFor == false){
			player.error("Cannot find player");
			return;
		}
		if(player.votedFor != null)
			player.votedFor.votes--;

		player.votedFor = votingFor;
		votingFor.votes++;
		player.sendBack("You've voted for "+player.votedFor.name);
	}
}

class Duke{
	constructor(){
		super(["/d", "/duke"], [1], [0], ["King"], true, ["/duke <playerName> - Adds a Duke to the King's Council.","Dukes can only be appointed during Pre-Game.","Only the King may choose his Dukes."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(" ").length-1,player, game) == false) //this might be wrong
			return;
		input = input.split(" ");
		if(game.numDukes >= game.maxDukes + game.maxLords){
			player.error("Maximum number of Dukes already appointed");
			return;
		}
		var dukeCandidate = game.getPlayerByName(input[1]);
		if(dukeCandidate == false){
			player.error("Cannot find player.");
			return;
		}
		if(dukeCandidate.role != null){
			player.error("Player has already been appointed as Duke.");
			return;
		}
		game.setDuke(dukeCandidate);
		game.sendAll(dukeCandidate.name + " has been appointed a Duke!");
		//Could remove the duke'd person's socket and send one specific to say "You are now a duke."
	}
}

class Successor{
	constructor(){
		super(["/sc", "/successor"], [0,1], [1,2,3,4,5,6,7,8], ["Lord"], true, ["/successor <playerName> - Sets a Lord's or Duke's successor.","Succesors can only be set once the game has started!","Only Lords and Dukes can set their successor."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(" ").length-1,player, game) == false) //this might be wrong
			return;
		input = input.split(" ");
		if(input.length == 1){
			if(player.sucessor == null)
				sendBack("You don't have a sucessor.");
			else
				sendBack("Your sucessor is currently " + player.sucessor.name);
			return;
		}
		var sucessorName = input[1];
		var sucessor = game.getPlayerByName(sucessorName);
		if(sucessor == false){
			player.error("cannot find player");
			return;
		}
		if(player.role.title == "Lord"){
			if(sucessor.role == null || sucessor.role.title != "Duke"){
				player.error("Sucessor must be a Duke.");
				return;
			}
		}
		else if(player.role.title == "Duke"){
			if(sucessor.role == null || (sucessor.role.title != "Earl" && sucessor.role.title != "Knight")){
				player.error("Sucessor must either be an Earl or a Knight.");
				return;
			}
		}
		player.sucessor = sucessor;
		player.sendBack(sucessor.name + " is now your sucessor.");
	}
}

module.exports = {Command, Name, StartGame, Vote, Duke, Successor};
