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
		if(this.hostOnly && !player.isHost){
			player.error("Only the host can do this action.");
			return false;
		}
		return true;
	}
	sendHelp(){
		this.player.sendBack(this.helpText[0]); //this won't work until Game.sendBack() is updated
	}
	static groupArgument(argument){
		argument = argument.toLowerCase();
		argument = argument.slice(0,1).toUpperCase() + argument.substring(1);
		if(argument.endsWith("s"))
			argument = argument.slice(0, argument.length-1);
		return argument;
	}
	static playerArgument(playerName){
		var player = game.getPlayerByName(playerName);
		if(player == false){
			game.error("Player not found.");
			return false;
		}
		else if(playerToGive.role.title == "Spectator"){
			game.error("No interacting with Spectators. Nice try.");
			return false;
		}
		else{
			return player;
		}
	}
	
};

class Name extends Command{
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

class StartGame extends Command{
	constructor(){
		super(["/start", "/startgame"], [0], [-1], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant", "Spectator"], true, ["/startgame - Starts the game. 🙃","The game is already started!","Everyone should be able to do this. Contact admin."]);
	}
	execute(input, player, game){
		console.log("test "+(game == null));
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

class Vote extends Command{
	constructor(){
		super(["/v", "/vote"], [1], [0], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant", "Spectator"], false, ["/vote <playerName> - Sets or changes your vote to the specified player.","The vote is closed","Only Dukes can vote for the new King!"]);
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

class Duke extends Command{
	constructor(){
		super(["/d", "/duke"], [1], [1], ["King"], false, ["/duke <playerName> - Adds a Duke to the King's Council.","Dukes can only be appointed during Pre-Game.","Only the King may choose his Dukes."]);
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
		if(dukeCandidate.role.title == "Duke"){
			player.error("Player has already been appointed as Duke.");
			return;
		}
		if(dukeCandidate == player){
			player.error("You can't duke yourself!");
			return;
		}
		game.setDuke(dukeCandidate);
		game.sendAll(dukeCandidate.name + " has been appointed a Duke!");
		//Could remove the duke'd person's socket and send one specific to say "You are now a duke."
	}
}

class Successor extends Command{
	constructor(){
		super(["/sc", "/successor"], [0,1], [1,2,3,4,5,6,7,8], ["Lord","Duke"], false, ["/successor <playerName> - Sets a Lord's or Duke's successor.","Succesors can only be set once the game has started!","Only Lords and Dukes can set their successor."]);
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
			if(sucessor.role.title != "Duke"){
				player.error("Sucessor must be a Duke.");
				return;
			}
		}
		else if(player.role.title == "Duke"){
			if(sucessor.role.title != "Earl" && sucessor.role.title != "Knight"){
				player.error("Sucessor must either be an Earl or a Knight.");
				return;
			}
		}
		player.sucessor = sucessor;
		player.sendBack(sucessor.name + " is now your sucessor.");
	}
}

class Tax extends Command{
	constructor(){
		super(["/t", "/tax"], [0,1], [2,3,4,5,6,7], ["King"], false, ["/tax [group name] - Selects a group to tax at the beginning of the day, e.g. /tax Lords","Cannot set a tax now.","Only the King can tax the subjects!"]);
	}
	execute(input, player, game){
		if(super.execute(input.split(" ").length-1, player, game) == false)
			return;
		var input = input.split(" ");
		if(input.length == 1){
			player.sendBack("The " + game.roleToTax +"s will be taxed at the beginning of the next day");
		}
		else{
			game.roleToTax = super.groupArgment(input[1]);
			player.sendBack("The " + game.roleToTax + "s will be taxed at the beginning of the next day");
		}
		
	}
}

class Give extends Command{
	constructor(){
		super(["/g", "/give", "/ga", "/giveanon"], [2], [2,3,4,5,6,7,8], ["King", "Lord", "Duke", "Earl", "Knight", "Peasant"], false, ["/give <player name> <amount> - give your prestige to another player. Use /giveanon to give anonymously.","Spectators don't get prestige, how can they give it?"]);
		this.prestigeCost = 5;
	}
	execute(input, player, game){
		if(super.execute(input.split(" ").length-1, player, game) == false)
			return;
		var input = input.split(" ");
		if(input[0] != "/ga" && input[0] != "/giveanon")
			this.prestigeCost = 0;
		var playerToGive = super.playerArgument(input[1]);
		if(playerToGive == false)
			return;
		else if(isNaN(input[2]))
			game.error("Invalid amount.");
		else if(int(input[2]) + this.prestigeCost > player.prestige)
			game.error("You only have " + player.prestige + " prestige. Can't give what you don't have.");
		else{
			var amount = int(input[2]);
			player.prestige = player.prestige - amount - this.prestigeCost;
			playerToGive.prestige = playerToGive.prestige + amount;
			if(input[0] != "/ga" && input[0] != "/giveanon")
				playerToGive.sendBack(player.name + " has sent you " + amount + " prestige!");
			player.sendBack("Sent " + amount + " prestige to " + playerToGive.name);
		}
		
	}
}

module.exports = {Command, Name, StartGame, Vote, Duke, Successor, Tax, Give};
/*case "/t":
					case "/tax":
						//R can do this during the day <role-group>
						var obj = {"player":"Server","message":"You've taxed the "+input.split(" ")[1]+"."};
						socket.emit('message', obj); //to sending client
						//Add something to tell the other players which group got taxed.
						break;
					case "/l":
					case "/lp":
					case "/lookup":
					case "/lookuppresige":
						//L can do this during the day <username>
						var obj = {"player":"Server","message":input.split(" ")[1]+" has X amount of prestige."};
						socket.emit('message', obj); //to sending client
						break;
					case "/b":
					case "/block":
						//D can do this during the day (ONCE PER DAY) <username>
						var obj = {"player":"Server","message":"You've blocked "+input.split(" ")[1]+" for the day."};
						socket.emit('message', obj); //to sending client
						break;
					case "/s":
					case "/spy":
						//K can do this during the day (ONCE PER DAY) <username>
						var obj = {"player":"Server","message":"You're spying on "+input.split(" ")[1]+"."};
						socket.emit('message', obj); //to sending client
						break;
					case "/g":
					case "/give":
						//G can do this during the day <username> <amount>
						var obj = {"player":"Server","message":"You've given "+input.split(" ")[2]+" to "+input.split(" ")[1]+"."};
						socket.emit('message', obj); //to sending client
						//Add a message to the other player to tell them they've recieved money.
						break;
					case "/w":
					case "/m":
					case "/pm":
					case "/whisper":
					case "/message":
					case "/privatemessage":
						//G can do this during the day (COSTS PRESTIGE) <username> <message>
						var obj = {"player":"Server","message":"Sent the whisper."};
						socket.emit('message', obj); //to sending client
						//Add a message to the player they're whispering to.
						break;
					case "/y":
					case "/yell":
						//G can do this during the day (COSTS PRESTIGE) <message>
						var obj = {"player":"PlayerThatYelled","message":input.substring(input.split(" ")[0].length)};
						io.sockets.emit('message', obj); //to everyone
						//Need to change "message" to "yell" or add a tag somehow.
						break;
					case "/a":
					case "/assassinate":
						//E, K, & P can do this during the day (COSTS PRESTIGE) <username>
						var obj = {"player":"Server","message":"You will attempt an assassination on "+input.split(" ")[1]+" tonight."};
						socket.emit('message', obj); //to sending client
						break;
					case "/e":
					case "/execute":
						//R, L, & D can do this during the day (COSTS PRESTIGE) <username>
						var obj = {"player":"Server","message":input.split(" ")[1]+" will be executed tonight."};
						socket.emit('message', obj); //to sending client
						break;
					case "/p":
					case "/protect":
						//G can do this during the day (COSTS PRESTIGE) <username>
						var obj = {"player":"Server","message":"You are protecting "+input.split(" ")[1]+"."};
						socket.emit('message', obj); //this is only sent to the client which sent the message
						break;
					case "/":
					case "/h":
					case "/help":
					*/
