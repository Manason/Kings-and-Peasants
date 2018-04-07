// Role is the base Object from which all other roles inherit from. Used to keep track of abilities and stats.
class Role{
	constructor(title, rank, wage, defense){
		this.title = title;
		this.rank = rank
		this.wage = wage;
		this.defense = defense;
		this.discount = 1;
		this.target = null;
		this.protectTarget = null;
	}
    sendAnonMessage(player, message){

    }
    assassinate(player){

    }
    execute(player, reason){

    }
    protect(player){

    }
    sendPrestige(player, amount){

    }

};

class Spectator extends Role{
	constructor(){
		super("Spectator", 0, 0, 0);
	}
};

class King extends Role{
	constructor(){
		super("King", 1, 250, 3);
	}
    setTax(rank){ //targets which group to tax for the day
    }
    getTaxList(){ //gets a list of each role's prestige totals

    }
    assassinate(player){

    }
};

class Lord extends Role{
	constructor(){
		super("Lord", 2, 100, 5);
	}
    assassinate(player){

    }
	setSuccessor(player){

	}
	lookupPrestige(player){

	}
};

class Duke extends Role{
	constructor(){
		super("Duke", 3, 60, 6);
		this.blocking = null;
		this.dukeBlocked = false;
	}
    assassinate(player){

    }
	setSuccessor(player){

	}
	block(player){

	}
};

class Earl extends Role{
	constructor(){
		super("Earl", 4, 40, 6);
	}

};

class Knight extends Role{
	constructor(){
		super("Knight", 5, 20, 6);
		this.spying = null;
	}
    spy(player){

	}
};

class Peasant extends Role{
	constructor(){
		super("Peasant", 6, 10, 6);
		this.discount = 0.80;
	}
};
module.exports = {Role, Spectator, King, Lord, Duke, Earl, Knight, Peasant};
