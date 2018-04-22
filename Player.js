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
		var obj = {"player":"Error","role":"error","message":message};
		this.socket.emit('message', obj);
	}
	//sends a server message to the player
	sendBack(message){
		var obj = {"player":"Game","role":"game","message":message};
		this.socket.emit('message', obj);
	}
	//sends the message to the player
	sendWhisper(message,player){
		var obj;
		if(player != "anonymous")
			obj = {"player":player.name,"role":"whisper","message":message};
		else
			obj = {"player":"Anonymous","role":"anon","message":message};
		this.socket.emit('whisper', obj);
	}
	sendBlocked(){
		var obj = {"blocked":this.blocked,"player":this.name};
		this.socket.emit('block', obj);
	}
	sendRole(){
		var obj = {"name":this.name, "role":this.role.title};
		this.socket.emit('updateRole',obj);
	}
	setIcons(type,name){
		var obj = {"type":type,"name":name};
		this.socket.emit('setIcons',obj);
	}
	notifyWatchers(message){
		var obj = {"player":"Game","message":message};
		for(var i = 0; i < this.spies.length; i++){
			this.spies[i].socket.emit('secret', obj);
		}
	}
	kill(game){
		this.setPrestige(0);
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
		this.sendRole();
		this.sendPrestige();
	}
	setPrestige(amount){
		this.prestige = amount;
		var obj = {"amount":this.prestige};
		this.socket.emit('updatePrestige', obj);
	}
};

module.exports = Player;
