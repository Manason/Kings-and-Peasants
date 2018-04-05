class Player{
	constructor(name, id, role){
		this.name = name;
		this.id = id;
		this.role = role;
		this.prestige = 0;
		this.blocked = false;
	}
};

module.exports = Player;