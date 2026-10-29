import * as AP from "./Archipelago.js";

export let checkedLocations, puzzleHints, puzzleRerolls;

function getGameHash() {
    // game hash is based on player name, multiworld seed,
    //   3 letters from up to 32 slot names, and the # of slots
    let prehash = AP.client.name;
    prehash += AP.client.room.seedName;
    for(let i in AP.client.players) {
        if(i >= 32) break;
        prehash += AP.client.players[i].name.slice(0, 3);
    }
    prehash += AP.client.players.length;
    return AP.cyrb53(prehash);
}

export function saveGame() {
    let saveObject = {
        //last acknowledged item index (requires implementing item notifications)
        //# of rerolls (require implementing rerolls)
        //rerolled puzzles (require implementing rerolls)
        //hinted puzzles (require implementing hints)
    };

    if(AP.solvedIds.length > 0)
        saveObject.solvedIds = AP.solvedIds;
    
    //only make a save if there's any data to save
    if(Object.keys(saveObject).length > 0) {
        localStorage.setItem(`save-${getGameHash()}`, JSON.stringify(saveObject));
    }
}

export function loadGame() {
    //todo: will have to graciously handle if the loaded savedata is incompatible for some reason
    //eg. if the save says some puzzle has been solved that doesn't exist
    // with the introduction of saves, I can have hints and puzzle rerolls :D

    let saveObject = JSON.parse(localStorage.getItem(`save-${getGameHash()}`));
    if(!saveObject) return;

    if(saveObject.solvedIds) AP.setSolvedIds(saveObject.solvedIds);
}


