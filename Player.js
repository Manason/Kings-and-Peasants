const Role = require('./Roles.js');

class Player{
	constructor(name, role, socket){
		this.name = name;
		this.role = role;
		this.prestige = 0;
		this.blocked = false;
		this.votedFor = null;
		this.votes = 0;
		this.isHost = false;
		this.socket = socket;
		this.spies = [];
		this.assassins = [];
		this.protectors = [];
	}
	//sends an error message to the player
	error(message){
		var obj = {"player":"Error","message":message};
		this.socket.emit('message', obj);
	}
	//sends a server message to the player
	sendBack(message){
		var obj = {"player":"Server","message":message};
		this.socket.emit('message', obj);
	}
	//sends the message to the player
	sendWhisper(message,player){
		var obj = {"player":player.name,"message":message};
		this.socket.emit('whisper', obj);
	}
	sendBlocked(){
		var obj = {"blocked":this.blocked,"player":player.name};
		this.socket.emit('block', obj);
	}
	notifyWatchers(message){
		var obj = {"player":"Game","message":message};
		for(var i = 0; i < this.spies.length; i++){
			this.spies[i].socket.emit('secret', obj);
		}
	}
	kill(game){
		this.prestige = 0;
		this.blocked = false;
		this.votedFor = null;
		this.votes = 0;
		if(this.role.title == "Lord" || this.role.title == "Duke")
			game.promoteSuccessor(this);
		this.successor = null;
		this.spies = [];
		this.assasssins = [];
		this.protectors = [];
		if(this.role.target != null)
			this.role.target.assassins.splice(this.role.target.assassins.indexOf(this), 1);
		if(this.role.protectTarget != null)
			this.role.protectTarget.protectors.splice(this.role.protectTarget.protectors.indexOf(this), 1);
		this.role = new Role.Peasant();
	}
	givePrestige(amount){
		this.prestige += amount;
		sendBack("Received " + amount + " prestige");
	}
};

module.exports = Player;
