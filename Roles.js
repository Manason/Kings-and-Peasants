// Role is the base Object from which all other roles inherit from. Used to keep track of abilities and stats.
function Role(title, rank, wage, defense){
    this.title = title;
    this.rank = rank
    this.wage = wage;
    this.defense = defense; 
    Role.prototype.sendAnonMessage = function(player, message){

    }
    Role.prototype.assassinate     = function(player){

    }
    Role.prototype.execute         = function(player, reason){

    }
    Role.prototype.protect         = function(player){

    }
    Role.prototype.sendPrestige = function(player, amount){

    }

}

function King(){
    Role.call(this, "King", 1, 250, 3);

    King.prototype.setTax = function(rank){ //targets which group to tax for the day

    }
    King.prototype.getTaxList = function(){ //gets a list of each role's prestige totals

    }
    King.prototype.assassinate = function(player){
        alert("Kings cannot assassinate!!!");
    }
}

function Lord(){
    Role.call(this, "Lord", 2, 100, 5);

    Lord.prototype.assassinate = function(player){
        alert("Lords cannot assassinate!!!");
    }

    Lord.prototype.setSuccessor = function(player){ //sets Lords successor from pool of Dukes

    }
    
    Lord.prototype.seePrestige = function(player){ //looks up someones prestige amount, except for King

    }
}

function Duke(){
    Role.call(this, "Duke", 3, 60, 6);

    Duke.prototype.assassinate = function(player){
        alert("Dukes cannot assassinate!!!");
    }

    Duke.prototype.setSuccessor = function(player){ //sets duke's successor from pool of earls and knights

    }

    Duke.prototype.block = function(player){ //chooses a player to block. expires at end of the day. Can't block ranks above. fellow Duke takes effect following day. Players are notified they are blocked.

    }

}

function Earl(){
    Role.call(this, "Earl", 4, 40, 6);

    Earl.prototype.seeTransactions = function(){ //sees transactions with player names removed in real time updates

    }

}

function Knight(){
    Role.call(this, "Knight", 5, 20, 6);

    Knight.prototype.spy = function(player){ //sees all activity of targetted player, except for chat. Expires at end of the day

    }

}

function Peasant(){
    Role.call(this, "Peasant", 6, 10, 6);
    this.discount = 0.20
}