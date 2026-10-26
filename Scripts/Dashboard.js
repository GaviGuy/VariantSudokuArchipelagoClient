import * as AP from "./Archipelago.js";
import {canAccessBoss} from "./PuzzleList.js";

export function buildDashboard() {
    let dashElem = document.getElementById("tab0-content");
    dashElem.innerHTML = "";
    if(AP.connected) {

        // Report current status
        let statusElem = document.createElement("div");

        if(canAccessBoss()) {
            statusElem.innerText = "Boss available!";
            statusElem.classList.add("go-mode");
        }

        else if(AP.getUnsolvedPuzzles(true).length > 0) {
            statusElem.innerText = `Pillar${AP.getUnsolvedPuzzles(true).length > 1 ? "s" : ""} available`;
            statusElem.classList.add("pillar-mode");
        }

        else if(AP.getUnsolvedPuzzles().length > 0) {
            statusElem.innerText = `Puzzle${AP.getUnsolvedPuzzles().length > 1 ? "s" : ""} available`;
            statusElem.classList.add("filler-mode");
        }

        else {
            statusElem.innerText = `No puzzles available :c`;
            statusElem.classList.add("bk-mode");
        }

        dashElem.appendChild(statusElem);


        // Report available puzzles
        let aPuzzles = AP.countAvailablePuzzles() - AP.getNumPuzzlesSolved();
        let aElem = document.createElement("div");
        aElem.innerText = `Unsolved puzzles: ${aPuzzles}`;

        dashElem.appendChild(aElem);

        // Report boss unlock progress
        let bElem = document.createElement("div");
        let prog, goal, item;
        switch(AP.slotData.bossUnlock) {
            case 0:
                prog = AP.localItems.filter(x => x.id == 1).length;
                goal = AP.slotData.bossUnlockCount;
                item = "Key Pieces"
                break;

            case 1:
                prog = AP.getNumPuzzlesSolved();
                goal = AP.slotData.bossUnlockCount;
                item = "Puzzles Solved"
                break;

            case 2:
                prog = AP.getNumPuzzlesSolved(null, true);
                goal = AP.slotData.pillarIds.length
                item = "Pillars Solved"
                break;

            default:
                prog = null;
                goal = null;
                item = null;
        }
        bElem.innerText = `Boss unlock: ${prog}/${goal} ${item}`

        dashElem.appendChild(bElem);

        // Report obtained items
        let cElem = document.createElement("div");
        cElem.innerText = "Items:";
        cElem.id = "item-list";

        let fillerCounts = {};

        for(let i in AP.localItems) {
            if( AP.localItems[i].id > 1 && AP.localItems[i].id < 100) {
                if(!fillerCounts[AP.localItems[i].name])
                    fillerCounts[AP.localItems[i].name] = 0;
                fillerCounts[AP.localItems[i].name]++;
            }
        }

        let acted = false;
        for(let i in fillerCounts) {
            if(fillerCounts[i] > 0) {
                let itemElem = document.createElement("div");
                itemElem.innerText = `${i}: ${fillerCounts[i]}`;
                acted = true;
                cElem.appendChild(itemElem);
            }
        }

        if(acted) {
            dashElem.appendChild(cElem);
        }

    }

}

export default buildDashboard;