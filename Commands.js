class Command{
	constructor(names, cost, allowedNumArgs, allowedStates, allowedRoles, hostOnly, helpText){
		this.names = names;
		this.cost = cost;
		this.allowedNumArgs = allowedNumArgs;
		this.allowedStates = allowedStates;
		this.allowedRoles = allowedRoles;
		this.hostOnly = hostOnly;
		this.helpText = helpText;
	}
	execute(numArgs, player, game){
		this.player = player;
		this.game = game;
		//checks number of arguments valid
		if(!this.allowedNumArgs.includes(numArgs)){
			this.sendHelp();
			return false;
		}
		//check command executed in valid state
		if(!this.allowedStates.includes(game.state)){
			player.error(this.helpText[1]);
			return false;
		}
		//check that command is only executed by an allowed role
		if(!this.allowedRoles.includes(player.role.title)){
			player.error(this.helpText[2]);
			return false;
		}
		//check that command is only executed by host if host only
		if(this.hostOnly && !player.isHost){
			player.error("Only the host can do this action.");
			return false;
		}
		return true;
	}
	sendHelp(){
		this.player.sendBack(this.helpText[0]);
	}
	//returns group argument, transforming argument to remove trailing s, and capitalize first letter. Checks for valid group, returns group name if valid, false otherwise
	groupArgument(argument){
		argument = argument.toLowerCase();
		argument = argument.slice(0,1).toUpperCase() + argument.substring(1);
		if(argument.endsWith("s"))
			argument = argument.slice(0, argument.length-1);

		if(["Lord", "Duke", "Earl", "Knight", "Peasant"].includes(argument))
			return argument;
		else{
			this.player.error("Invalid group.");
			return false;
		}

	}
	//checks playername for existence and spectator, returns player if found, otherwise false
	playerArgument(playerName){
		var player = this.game.getPlayerByName(playerName);
		if(player == false){
			this.player.error("Player not found.");
			return false;
		}/*
		else if(player.role.title == "Spectator"){
			this.player.error("No interacting with Spectators. Nice try.");
			return false;
		}*/
		else
			return player;
	}
	//checks that the player can pay the cost of the command + amount, returns totalCost if transaction is valid, false if not
	checkCost(amount){
		var totalCost = (Math.floor(this.cost * this.player.role.discount) + amount);
		if(totalCost < this.player.prestige){
			player.error("You don't have enough prestige. This command costs " + (totalCost-amount) + " prestige.");
			return false;
		}
		return totalCost;
	}

};

class Name extends Command{
	constructor(){
		super(["/n", "/name"], 0, [1], [-1], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant", "Spectator"], false, ["/name <player_name> - Sets your player name.","You can't change your name once the game has started!","Everyone should be able to do this. Contact admin."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(/\s+/).length-1,player, game) == false)
			return;
		input = input.split(/\s+/);

		//make sure no player already has that name
		if(!game.playerArgument(input[1])){
			if(player.name == input[1]){
				player.sendBack("Your name is already "+ player.name);
			}
			else
				player.sendBack("Username already taken.");
		}
		//set the player name
		else{
			player.name = input[1];
			player.sendBack("Username set to " + player.name);
		}
	}
}

class StartGame extends Command{
	constructor(){
		super(["/start", "/startgame"], 0, [0], [-1], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant", "Spectator"], true, ["/startgame - Starts the game.","The game is already started!","Everyone should be able to do this. Contact admin."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(/\s+/).length-1,player, game) == false)
			return;
		if(game.playerList.length < game.minPlayers){
			player.error(game.minPlayers + " players required to start.");
			return;
		}
		game.sendAll("Voting is now open. Vote for your Ruler with /vote");
		game.state = 0; //Voting
		game.setState();
		game.timerFunc();
		game.timerInterval = setInterval(function(){
			game.timerFunc();
		}, 1000);
	}
}

class Vote extends Command{
	constructor(){
		super(["/v", "/vote"], 0, [0, 1], [0, -5], ["Duke", "Spectator"], false, ["/vote [player_name] - Sets or changes your vote to the specified player.","The vote is closed","Only Dukes can vote for the new King!"]);
	}
	execute(input, player, game){
		if(super.execute(input.split(/\s+/).length-1,player, game) == false)
			return;
		input = input.split(/\s+/);
		if(game.state == -5 && player.role.title == "Spectator"){
			player.error("You can not vote in this election!");
			return;
		}
		if(input.length == 1){
			if(player.votedFor == null)
				player.sendBack("You have not yet cast a vote");
			else
				player.sendBack("You voted for " + player.votedFor.name + ". You can change your vote with /vote");
			return;
		}

		var votingFor = super.playerArgument(input[1]);
		if(votingFor == false)
			return;
		//if an emergency election make sure they only vote for Lords
		else if(game.state == -5 && votingFor.role.title != "Lord")
			player.error("You can only vote for a Lord in the election for the new King!");
		else{
			if(player.votedFor != null)
				player.votedFor.votes--;

			player.votedFor = votingFor;
			votingFor.votes++;
			player.sendBack("You've voted for "+player.votedFor.name);
			player.notifyWatchers(player.name + " voted for "+player.votedFor.name);
		}
	}
}

class Duke extends Command{
	constructor(){
		super(["/d", "/duke"], 0, [1], [1], ["King"], false, ["/duke <player_name> - Adds a Duke to the King's Council.","Dukes can only be appointed during Pre-Game.","Only the King may choose his Dukes."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(/\s+/).length-1,player, game) == false)
			return;
		input = input.split(/\s+/);
		if(game.numDukes >= game.maxDukes + game.maxLords){
			player.error("Maximum number of Dukes already appointed");
			return;
		}
		var dukeCandidate = super.playerArgument(input[1]);
		if(dukeCandidate == false)
			return;
		else if(dukeCandidate.role.title == "Duke")
			player.error("Player has already been appointed as Duke.");
		else if(dukeCandidate == player)
			player.error("You can't duke yourself!");
		else{
			game.setDuke(dukeCandidate);
			game.sendAll(dukeCandidate.name + " has been appointed a Duke!");
		}
	}
}

class Successor extends Command{
	constructor(){
		super(["/sc", "/successor"], 0, [0,1], [1,2,3,4,5,6,7,8], ["Lord","Duke"], false, ["/successor [player_name] - Sets a Lord's or Duke's successor.","Succesors can only be set once the game has started!","Only Lords and Dukes can set their successor."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(/\s+/).length-1,player, game) == false)
			return;
		input = input.split(/\s+/);
		if(input.length == 1){
			if(player.sucessor == null)
				sendBack("You don't have a successor.");
			else
				sendBack("Your successor is currently " + player.sucessor.name);
			return;
		}
		var sucessor = super.playerArgument(input[1]);
		if(sucessor == false)
			return;
		if(player.role.title == "Lord" && sucessor.role.title != "Duke")
			player.error("Successor must be a Duke.");
		else if(player.role.title == "Duke" && sucessor.role.title != "Earl" && sucessor.role.title != "Knight")
				player.error("Successor must either be an Earl or a Knight.");
		else{
			player.sucessor = sucessor;
			player.sendBack(sucessor.name + " is now your successor.");
			player.notifyWatchers(player.name + " appointed "+successor.name+" as their successor.");
		}
	}
}

class Tax extends Command{
	constructor(){
		super(["/t", "/tax"], 0, [0,1], [2,3,4,5,6,7,8], ["King"], false, ["/tax [role_group] - Selects a group to tax at the beginning of the day, e.g. /tax Lords","Cannot set a tax now.","Only the King can tax the subjects!"]);
	}
	execute(input, player, game){
		if(super.execute(input.split(/\s+/).length-1, player, game) == false)
			return;
		var input = input.split(/\s+/);

		if(input.length == 2)
			game.roleToTax = super.groupArgument(input[1]);

		player.sendBack("The " + game.roleToTax + "s will be taxed at the beginning of the next day");
	}
}

class Lookup extends Command{
	constructor(){
		super(["/l", "/look", "/lookup"], 5, [1], [2,3,4,5,6,7,8], ["King","Lord"], false, ["/lookup <player_name/role_group> - Allows a King to lookup a group's prestige and a Lord to look up an individual's.","Lookup can only be used during the day.","Only Kings and Lords can use this command."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(/\s+/).length-1,player, game) == false)
			return;
		input = input.split(/\s+/);

		//handle /lookup for the King
		if(player.role.title == "King"){
			var roleToLookup = super.groupArgument(input[1]);
			if(roleToLookup == false)
				return;

			var playerList = game.getPlayersByRole(roleToLookup);
			var totalPrestige = 0;
			for(var i = 0; i < playerList.length; i++)
				totalPrestige += playerList[i].prestige;

			player.sendBack("The " + roleToLookup + "s have " + totalPrestige + " total prestige.");
		}

		//hande /lookup for Lords
		else if(player.role.title == "Lord"){
			var checkedPlayer = super.playerArgument(input[1]);
			if(checkedPlayer == false)
				return;
			if(checkedPlayer.role.title == "King")
				player.error("You are forbidden to access the King's treasury.");
			else if(super.checkCost(0) != false){
				player.prestige -= super.checkCost(0);
				player.sendBack(checkedPlayer.name+" currently has "+checkedPlayer.prestige+" prestige.");
				player.notifyWatchers(player.name + " looked up "+checkedPlayer.name+"'s prestige.");
			}
		}
	}
}

class Block extends Command{
	constructor(){
		super(["/b", "/block"], 0, [0,1], [2,3,4,5,6,7,8], ["Duke"], false, ["/block [player_name] - Allows a Duke to block a player of equal or lower rank.","Block can only be used during the day.","Only Dukes can use this command."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(/\s+/).length-1,player, game) == false)
			return;
		input = input.split(/\s+/);
		if(player.blocked){
			player.error("You can't do this while blocked.");
			return;
		}
		if(input.length == 1){
			if(player.role.blocking == null)
				player.sendBack("You aren't blocking anyone yet.");
			else
				player.sendBack("You are blocking " + player.role.blocking.name);
			return;
		}
		//already blocking player and player isn't a duke
		if(player.role.blocking != null && player.role.blocking.role.title != "Duke"){
			player.error("You are already blocking "+player.role.blocking.name);
			return;
		}
		var blockedPlayer = super.playerArgument(input[1]);
		if(blockedPlayer == false)
			return;
		if(blockedPlayer.role.title == "King" || blockedPlayer.role.title == "Lord")
			player.error("You can't block a "+blockedPlayer.role.title+"!");

		//undoes the block on the duke you previously wanted to block
		if(player.role.blocking != null && player.role.blocking.title == "Duke" && player.role.blocking == blockedPlayer){
			player.role.blocking == null;
			player.notifyWatchers(player.name+" has decided not to block Duke "+blockedPlayer.name+" tomorrow.");
			return;
		}
		player.role.blocking = blockedPlayer;
		//sets up a duke to be blocked the next day
		if(blockedPlayer.role.title == "Duke"){
			player.sendBack("You are set to block " +blockedPLayer.name+" first thing in the morning!");
			player.notifyWatchers(player.name+" has decided to block Duke "+blockedPlayer.name+" tomorrow.");
			return;
		}
		else if(blockedPLayer.role.title == "Knight")
			if(blockedPlayer.role.spying != null){
				blockedPlayer.role.spying.spies.splice(blockedPlayer.role.spying.spies.indexOf(blockedPlayer),1);
				blockedPLayer.role.spying = null;
			}
		blockedPlayer.blocked = true;
		player.sendBack("You are now blocking "+blockedPlayer.name+".");
		player.notifyWatchers(player.name+" is now blocking "+blockedPlayer.name+".");
	}
}

class Watch extends Command{
	constructor(){
		super(["/spy","/watch"], 0, [0,1], [2,3,4,5,6,7,8], ["Knight"], false, ["/watch [player_name] - Allows a Knight to watch any player besides King.","You can only watch someone during the day and cannot change your selection.","Only Knights can use this command."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(/\s+/).length-1,player, game) == false)
			return;
		input = input.split(/\s+/);
		if(player.blocked){
			player.error("You can't do this while blocked.");
			return;
		}
		if(input.length == 1){
			if(player.role.spying == null)
				player.sendBack("You aren't watching anyone yet.");
			else
				player.sendBack("You are watching " + player.role.spying.name);
			return;
		}
		if(player.role.spying != null){
			player.error("You are already watching "+player.role.spying.name);
			return;
		}
		var spiedPlayer = super.playerArgument(input[1]);
		if(spiedPlayer == false)
			return;
		if(spiedPlayer.role.title == "King"){
			player.error("You don't want to get caught spying on the king! 🕱");
			return;
		}
		spiedPlayer.spies.push(player);
		player.role.spying = spiedPlayer;
		player.sendBack("You are now watching on "+spiedPlayer.name+".");
		player.notifyWatchers(player.name+" is now watching "+spiedPlayer.name+".");
	}
}

class Give extends Command{
	constructor(){
		super(["/g", "/give", "/ga", "/giveanon"], 5, [2], [2,3,4,5,6,7,8], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant"], false, ["/give <player_name> <amount> - Give your prestige to another player. Use /giveanon to give anonymously.","You can only give prestige once the game is started.","Spectators don't get prestige, how can they give it?"]);
	}
	execute(input, player, game){
		if(super.execute(input.split(/\s+/).length-1, player, game) == false)
			return;
		input = input.split(/\s+/);

		var playerToGive = super.playerArgument(input[1]);
		if(playerToGive == false)
			return;
		else if(isNaN(input[2]))
			player.error("Invalid amount.");
		else{
			var amount = parseInt(input[2]);

			if((input[0] == "/ga" || input[0] == "/giveanon") && !super.checkCost(amount))
				return;
			else if(input[0] == "/ga" || input[0] == "/giveanon"){
				player.prestige -= super.checkCost(amount);
				playerToGive.prestige += amount;
			}
			playerToGive.sendBack(player.name + " has sent you " + amount + " prestige!");
			playerToGive.notifyWatchers(playerToGive.name+" recieved "+amount+" prestige from "+player.name+".");
			player.sendBack("Sent " + amount + " prestige to " + playerToGive.name);
			player.notifyWatchers(player.name+" gave "+amount+" prestige to "+playerToGive.name+".");
		}
	}
}

class Assassinate extends Command{
	constructor(){
		super(["/a", "/assassinate"], 10, [0,1], [2,3,4,5,6,7,8], ["Earl", "Knight", "Peasant"], false, ["/assassinate [player name] - set your assassination target.","Can only set a target during the day!","Only Earls, Knights, and Peasants can attempt an assassination."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(" ").length-1, player, game) == false)
			return;
		input = input.split(" +");
		if(input.length == 1)
			if(player.role.target != null)
				player.sendBack("your assassination target is " + player.role.target.name);
			else
				player.sendBack("no assassination target has been set.");
		else{
			var target = super.playerArgument(input[1]);
			if(target == false)
				return;
			if(player.role.target == target){
				player.sendBack(target.name + " is no longer your assassination target.");
				player.role.target = null;
				target.assassins.splice(target.assassins.indexOf(player), 1);
			}
			else{
				player.sendBack("assassination target set to " + target.name);
				player.role.target.assassins.splice(player.role.target.assassins.indexOf(player), 1);
				player.role.target = target;
			}

		}

	}
}

class Protect extends Command{
	constructor(){
		super(["/p", "/protect"], [0,1], [2,3,4,5,6,7,8], ["King", "Lord", "Duke","Earl", "Knight", "Peasant"], false, ["/protect [player name] - set your protection target.","Can only set a protection target during the day!","I know its hard to watch as a Spectator, but you will just have to let the game run its course."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(" ").length-1, player, game) == false)
			return;
		input = input.split(" +");
		if(input.length == 1)
			if(player.role.protectTarget != null)
				player.sendBack("You will protect " + player.role.protectTarget.name + " tonight.");
			else
				player.sendBack("no protection target has been set.");
		else{
			var target = super.playerArgument(input[1]);
			if(target == false)
				return;
			if(player.role.protectTarget == protectTarget){
				player.sendBack("You will no longer protect " + target.name + " tonight.");
				player.role.protectTarget = null;
				target.protectors.splice(target.protectors.indexOf(player), 1);
			}
			else{
				player.sendBack("You will protect "+ target.name + " tonight.");
				player.role.protectTarget.protectors.splice(player.role.protectTarget.protectors.indexOf(player), 1);
				player.role.protectTarget = target;
			}

		}

	}
}

class Execute extends Command{
	constructor(){
		super(["/e", "/execute"], [0,1], [2,3,4,5,6,7,8], ["King", "Lord", "Duke"], false, ["/execute [player name] - marks a player for execution. Execution takes place at night. Only one player can be executed by you a night.","Can decree an execution during the day!","Only Kings, Lords, and Dukes may order executions!"]);
	}
	execute(input, player, game){
		if(super.execute(input.split(" ").length-1, player, game) == false)
			return;
		input = input.split(" +");
		if(player.blocked){
			player.error("You can't do this while blocked.");
			return;
		}
		//tell player who they have currently selected
		if(input.length == 1){
			if(player.role.executeTarget == null)
				player.sendBack("You have not marked anyone for execution.");
			else
				player.sendBack("You have marked " + player.role.executeTarget + " for execution.");
		}
		else{
			var target = super.playerArgument(input[1]);
			if(target == false)
				return;
			//check that players are only executing one rank below you
			if((player.role.title == "King" && target.role.title != "Lord") || (player.role.title == "Lord" && target.role.title != "Duke") || player.role.title == "Duke" && target.role.title != "Earl"){
				player.error("Can only order the execution of one rank below you.");
				return;
			}
			//order execution
			if(player.role.executeTarget == null){
				player.role.executeTarget = target;
				game.sendAll(player.name + " has ordered " + target.name + " executed tonight!");
			}
			//take back an execution
			else if(player.role.executeTarget == target){
				game.sendAll(player.name + " has rescinded their order to execute " + target.name);
				player.role.executeTarget = null;
			}
			//order a different execution
			else{
				game.sendAll(player.name + " has rescinded their order to execute " + player.role.executeTarget+ ", and has instead ordered " + target.name + " assassinated tonight!");
				player.role.executeTarget = target;
			}
		}

	}
}

class Prestige extends Command{
	constructor(){
		super(["/prestige"], [0], [2,3,4,5,6,7,8], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant"], false, ["/prestige - tells you your current prestige","Can not look up your prestige right now","You do not have prestige. You are a spectator. Now go away."]);
	}
	execute(input, player, game){
		if(super.execute(input.split(" ").length-1, player, game) == false)
			return;
		player.sendBack("You currently have " + player.prestige + " prestige.");
	}
}

//lists all players in order of their rank
class PlayerList extends Command{
	constructor(){
		super(["/list"], [0], [-1,0,1,2,3,4,5,6,7,8], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant", "Spectator"], false, ["/list - lists all players and their role","Cannot do /list right now","You do not have permission to do /list"]);
	}
	execute(input, player, game){
		if(super.execute(input.split(" ").length-1, player, game) == false)
			return;

		var list = "";
		//prints players of the role in the form of "Role Name"
		function printPlayersByRole(roleName){
			var players = game.getPlayersByRole(roleName);
			for(var i = 0; i < players.length; i++)
				list += (players[i].role.title + " " + players[i].name + "<br>");
		}
		var roleList = ["King", "Lord", "Duke", "Earl", "Knight", "Peasant", "Spectator"];
		for(int i = 0; i < roleList.length; i++)
			printPlayersByRole(roleList[i]);
		player.sendBack(list.substring(0,list.length-4));
	}
}


class Whisper extends Command{
	constructor(){
		super(["/w", "/pm", "/whisper", "/privatemessage"], [1], [2,3,4,5,6,7,8], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant"], false, ["/whisper <player_name> <message> - Send a private message to another player.","You can only whisper during the game.","Silly Spectator, private messages are for players!"]);
		this.prestigeCost = 2;
	}
	execute(input, player, game){
		if(super.execute(input.split(/\s+/).length>2 ? 1 : input.split(" ").length, player, game) == false)
			return;
		var inputList = input.split(/\s+/);
		var toPlayer = super.playerArgument(inputList[1]);
		if(toPlayer == false)
			return;
		toPlayer.sendWhisper((input.substring(input.indexOf(inputList[2],inputList[0].length+inputList[1].length+2))),player);
	}
}

class Yell extends Command{
	constructor(){
		super(["/y", "/yell", "/shout"], [0], [2,3,4,5,6,7,8], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant"], false, ["/yell <message> - Shout something into general chat.","You can only yell at people during the game.","You can try yelling, but they can't hear you!"]);
		this.prestigeCost = 5;
	}
	execute(input, player, game){
		if(super.execute(input.split(/\s+/).length>1 ? 0 : input.split(" ").length, player, game) == false)
			return;
		var inputList = input.split(/\s+/);
		game.sendYell((input.substring(input.indexOf(inputList[1],inputList[0].length+1))),player);
	}
}

class Help extends Command{
	constructor(){
		super(["/h", "/help"], [0], [-1,0,1,2,3,4,5,6,7,8], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant","Spectator"], false, ["/help [command_name] - Send a private message to another player.","The game is broken somewhere, help should work for all states.","The game is broken somewhere, help should work for all roles."]);
		this.prestigeCost = 0;
	}
	execute(input, player, game){
		input = input.split(/\s+/);
		//if /help is called send them all the commands available to them at that time.
		//if /help [command_name] is called send them the help for that command.
		//if /help all is called send them all commands in the game.
		//else send them the same thing as /help

		//3 help types
		//1. help all - sends every helptext for every command
		//2. help command - sends help for one specific command
					//work on normal help and if one ends up matching then just send that one and return;
		//3. normal help - sends help for accessible commands and /help all at the end
		if(input.length == 1)
			input[1] = "normal";
		if(input[1].startsWith("/"))
			input[1] = input[1].substring(1);

		var commandsList = game.getCommandsList();
		var helpCommands = [];
		for(var i = 0; i < commandsList.length; i++){
			var commandObj = commandsList[i];
			console.log(commandObj.names);
			console.log(input[1]);
			if(commandObj.names.includes("/"+input[1])){
				player.sendBack(commandObj.helpText[0]);
				return;
			}
			//ho  ih  r
			//f   t   t
			//t   t   t
			//f   f   f
			//t   f   t
			if(input[1] == "all" || (commandObj.allowedStates.includes(game.state) && commandObj.allowedRoles.includes(player.role.title) && !(commandObj.hostOnly && !player.isHost))) {
				helpCommands.push(commandObj.helpText[0]+"<br>");
			}
		}
		helpCommands.sort();
		if(input[1] != "all")
			helpCommands.push("/help all - for more commands<br>");
		var allCommands = "";
		for(var i = 0; i < helpCommands.length; i++){
			allCommands += helpCommands[i];
		}
		player.sendBack(allCommands.substring(0,allCommands.length-4));
	}
}

// Blockable Commands : block, watch, execute, block earls and peasants passive abilities
// Spyable Commands : vote, successor, lookup, block, watch, give, assassinate, protect
module.exports = {Command, Name, StartGame, Vote, Duke, Successor, Tax, Lookup, Block, Watch, Give, Assassinate, Protect, Execute, Prestige, PlayerList, Whisper, Yell, Help};
