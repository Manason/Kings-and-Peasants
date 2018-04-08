class Player{
	constructor(name, role, socket){
		this.name = name;
		this.role = role;
		this.prestige = 0;
		this.blocked = false;
		this.votedFor = null;
		this.votes = 0;
		this.sucessor = null;
		this.isHost = false;
		this.socket = socket;
		this.spies = [];
		this.assasssins = [];
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
	notifyWatchers(message){
		var obj = {"player":"Game","message":message};
		for(var i = 0; i < spies.length; i++){
			spies[i].socket.emit('secret', obj);
		}
	}
};

module.exports = Player;
