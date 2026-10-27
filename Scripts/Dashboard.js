import * as AP from "./Archipelago.js";
import {canAccessBoss} from "./PuzzleList.js";

export function buildDashboard() {
    let dashElem = document.getElementById("tab0-content");
    dashElem.innerHTML = "";
    if(AP.connected) {

        // Report current status
        let statusElem = document.createElement("div");

        if(AP.solvedIds.includes(AP.slotData.bossId)) {
            if(canAccessBoss()) {
                statusElem.innerText = "Game cleared!";
                statusElem.classList.add("go-mode");
            }
            else {
                statusElem.innerText = "Boss inaccessible but beaten ??";
                statusElem.classList.add("bk-mode");
            }
        }

        else if(canAccessBoss()) {
            statusElem.innerText = "Boss available!";
            statusElem.classList.add("go-mode");
        }

        else if(AP.slotData.bossUnlock == 2 && AP.getUnsolvedPlayableIds(true).length > 0) {
            statusElem.innerText = `Pillar${AP.getUnsolvedPlayableIds(true).length > 1 ? "s" : ""} available`;
            statusElem.classList.add("pillar-mode");
        }

        else if(AP.getUnsolvedPlayableIds().length > 0) {
            statusElem.innerText = `Puzzle${AP.getUnsolvedPlayableIds().length > 1 ? "s" : ""} available`;
            statusElem.classList.add("filler-mode");
        }

        else {
            statusElem.innerText = `burger king :c`;
            statusElem.classList.add("bk-mode");
        }

        dashElem.appendChild(statusElem);


        // Report available puzzles
        let aPuzzles = AP.getUnsolvedPlayableIds().length;
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
                prog = AP.solvedIds.length;
                goal = AP.slotData.bossUnlockCount;
                item = "Puzzles Solved"
                break;

            case 2:
                prog = AP.getNumberPillarSolved();
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

        // button to hint a random filler puzzle (if possible)
        let hintElem = document.createElement("div");
        let fillerButton = document.createElement("button");
        fillerButton.innerText = "Hint a random puzzle";
        fillerButton.addEventListener("click", () => {
            AP.hintRandomPuzzle();
            buildDashboard();
        });
        if(AP.getUnreceivedPuzzles(false, true).length == 0) {
            fillerButton.setAttribute("disabled", true);
        }
        hintElem.appendChild(fillerButton);

        // button to hint a random pillar puzzle (if possible)
        if(AP.slotData.bossUnlock == 2) {
            let pillarButton = document.createElement("button");
            pillarButton.innerText = "Hint a random pillar";
            pillarButton.addEventListener("click", () => {
                AP.hintRandomPuzzle(true);
                buildDashboard();
            });
            if(AP.getUnreceivedPuzzles(true, true).length == 0) {
                pillarButton.setAttribute("disabled", true);
            }
            hintElem.appendChild(pillarButton);
        }
        dashElem.appendChild(hintElem);
    }
}

export default buildDashboard;