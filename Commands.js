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

class Name extends Command{
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
