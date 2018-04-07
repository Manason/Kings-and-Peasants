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
	error(message){
		var obj = {"player":"Error","message":message};
		this.socket.emit('message', obj);
	}
	sendBack(message){
		var obj = {"player":"Server","message":message};
		this.socket.emit('message', obj);
	}
	sendWhisper(message,player){
		var obj = {"player":player.name,"message":message};
		this.socket.emit('whisper', obj);
	}
};

module.exports = Player;
