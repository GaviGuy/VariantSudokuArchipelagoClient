import * as AP from "./Archipelago.js";

export function getSaveKey() {
    return `VariantSudokuSave-${AP.client.players.self.team}-${AP.client.players.self.slot}`;
}

export function saveGame() {
    let saveObject = {
        //last acknowledged item index (requires implementing item notifications)
    };

    if(AP.save.solvedIds.length > 0)
        saveObject.solvedIds = AP.save.solvedIds;
    if(AP.save.rerolls.length > 0)
        saveObject.rerolls = AP.save.rerolls;

    AP.client.storage.prepare(getSaveKey(), {}).update(saveObject).commit(false);
}

export function loadGame() {
    AP.client.storage.fetch(getSaveKey()).then((data) => {
        if(!data) return;
        if(data.solvedIds) AP.save.solvedIds = data.solvedIds;
        if(data.rerolls) AP.save.rerolls = data.rerolls;

        AP.updateInterface();
    });
}