class Command{
	constructor(names, allowedStates, allowedRoles, hostOnly, helpText){
		this.names = names;
		this.allowedStates = allowedStates;
		this.allowedRoles = allowedRoles;
		this.hostOnly = hostOnly;
		this.helpText = helpText;
	}
	execute(player, game){
		this.player = player;
		this.game = game;
		if(!this.allowedStates.includes(game.state)){
			game.error("You cannot do this action at this time.");
			return false;
		}
		if(!this.allowedRoles.includes(player.role.title)){
			game.error("You don't have permission to do this action.");
			return false;
		}
		if(hostOnly && !player.isHost){
			game.error("Only the host can do this action.");
			return false;
		}
		return true;
	}
	sendHelp(){
		this.game.sendBack(this.helpText); //this won't work until Game.sendBack() is updated
	}
	//TODO do the allowedStates, allowedRoles, and hostOnly error messages
};

class Name{
	constructor(){
		super(["/n", "/name"], [-1], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant"], false, "/name <player name> - sets your player name.");
	}
	execute(input, player, game){
		if(super.execute(player, game) == false) //this might be wrong
			return;
		input = input.split(" ");
		if(input.length == 1){
			sendHelp();
			return;
		}
		
		if(game.getPlayerByName(input[1]) != false){
			if(player.name == input[1]){
				game.sendBack("Your name is already "+ player.name);
			} else {
				game.sendBack("Username already taken.");
			}
			return;
		}
		player.name = input[1];
		game.sendBack("Username set to " + player.name);
	}
}

module.exports = {Command, Name};
