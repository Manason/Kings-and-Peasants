class Player{
	constructor(name, id, role){
		this.name = name;
		this.id = id;
		this.role = role;
		this.prestige = 0;
		this.blocked = false;
		this.votedFor = null;
		this.votes = 0;
	}
};

module.exports = Player;