import {debugMode, client, localItems, slotData, sendLocations, checkBonus, getNumPuzzlesSolved} from "./Archipelago.js";

async function getJson(path) {
    return fetch(path)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => console.error('Failed to load puzzle list:', error));
}

const PUZZLES_DATABASE = await getJson("./Assets/Puzzles.json");
const PUZZLES = PUZZLES_DATABASE.puzzles;

const TAGS_DATABASE = await getJson("./Assets/Tags.json");
const TAGS = TAGS_DATABASE.tags;

export function getPuzzleById(id) {
    for(let i in PUZZLES) {
        if(PUZZLES[i].id == id)
            return PUZZLES[i];
    }
}

function updatePuzzleList() {
    //todo: prevent duplicates
    //todo: clearing the list is horrible for continuity, removing typed fields, etc
    let listElem = document.getElementById("tab1-list");
    listElem.innerHTML = "";
    if(debugMode) {
        let cheatElem = document.createElement("input");
        cheatElem.addEventListener("keyup", (e) => {
            if(e.key === "Enter") {
                console.log("cheated location id: " + cheatElem.value);
                client.check(parseInt(cheatElem.value));
                cheatElem.value = "";
            }
        });
        listElem.appendChild(cheatElem);

        let debugButtonElem = document.createElement("button");
        debugButtonElem.innerText = "debug";
        debugButtonElem.addEventListener("click", (e) => {
            console.log(client.room.checkedLocations);
        });
        listElem.appendChild(debugButtonElem);
    }

    // sort puzzles
    let filler = [], pillar = [];
    for(let i = 0; i < localItems.length; i++) {
        if(localItems[i].id >= 1000) {
            if(slotData["bossUnlock"] == 2 && slotData["pillarIds"].includes(localItems[i].id))
                pillar.push(localItems[i].id);
            else
                filler.push(localItems[i].id);
        }
    }

    for(let i in filler) {
        let solved = client.room.checkedLocations.includes(filler[i]);
        listElem.appendChild(createPuzzleCard(getPuzzleById(filler[i]), 0, solved));
    }

    for(let i in pillar) {
        let solved = client.room.checkedLocations.includes(pillar[i]);
        listElem.appendChild(createPuzzleCard(getPuzzleById(pillar[i]), 1, solved));
    }

    if(canAccessBoss()) {
        let solved = client.room.checkedLocations.includes(slotData.bossId);
        listElem.appendChild(createPuzzleCard(getPuzzleById(slotData.bossId), 2, solved));
    }
}

function canAccessBoss() {
    switch(slotData.bossUnlock) {
        // Access the boss after getting slotData.bossUnlockCount keypieces
        case 0:
            if(localItems.filter(x => x.id == 1).length >= slotData.bossUnlockCount)
                return true;
            return false;

        // Access the boss after solving slotData.bossUnlockCount puzzles
        case 1:
            if(getNumPuzzlesSolved(client.room.checkedLocations, false) >= slotData.bossUnlockCount)
                return true;
            return false;

        // Access the boss after solving all puzzles in slotData.pillarIds
        case 2:
            if(getNumPuzzlesSolved(client.room.checkedLocations, true) >= slotData.pillarIds.length)
                return true;
            return false;
    }
}

function checkSolution(puzzle, solution) {
    if(puzzle.solutionCode == solution) {
        updatePuzzleList();
        return true;
    }
    return false;
}


function createPuzzleCard(puzzle, puzzleType, solved) {
    const PUZZLE_CLASSES = ["filler", "pillar", "boss"];

    let retElem = document.createElement("div");
    retElem.classList.add(PUZZLE_CLASSES[puzzleType])
    if(solved) retElem.classList.add("solved");
    retElem.classList.add("puzzle-container");

    let topElem = document.createElement("div");

    let titleElem = document.createElement("a");
    titleElem.classList.add("puzzle-title");
    titleElem.setAttribute("href", puzzle.link);
    titleElem.innerText = puzzle.title;
    topElem.appendChild(titleElem);

    let authorElem = document.createElement("span");
    authorElem.classList.add("puzzle-author");
    authorElem.innerText = puzzle.author;
    topElem.appendChild(authorElem);

    let bottomElem = document.createElement("div");
    bottomElem.classList.add("puzzle-bottom");

    let solutionElem = document.createElement("div");
    
    if(!solved) {
        let solutionHintElem = document.createElement("div");
        solutionHintElem.innerText = "Solution code: " + puzzle.solutionHint;
        solutionElem.appendChild(solutionHintElem);

        let solutionInput = document.createElement("input");
        solutionInput.addEventListener("keyup", (e) => {
            if(e.key === "Enter") {
                let code = solutionInput.value;
                if(checkSolution(puzzle, code)) {
                    console.warn("correct solution: " + code);
                    sendLocations(puzzle)
                }
                else {
                    console.warn("incorrect solution: " + code);
                }
            }
        });
        solutionElem.appendChild(solutionInput);
    }
    else {
        let solvedElem = document.createElement("span");
        solvedElem.innerText = "Solved!"
        solvedElem.classList.add("solved-indicator");
        solutionElem.appendChild(solvedElem);
    }

    // debug autosolve button
    if(debugMode) {
        let autosolve = document.createElement("button");
        autosolve.textContent = "h";
        autosolve.addEventListener("click", () => {
            sendLocations(puzzle);
            checkBonus();
        });
        solutionElem.appendChild(autosolve);
    }

    bottomElem.appendChild(solutionElem);

    let tagsElem = document.createElement("div");
    tagsElem.classList.add("tab1-tags");

    let lookupTag = (tag) => {
        for(let i in TAGS) {
            if(tag == TAGS[i].id) return TAGS[i];
        }
    };
    for(let i = 0; i < puzzle.tags.length; i++) {
        let elem = document.createElement("img");
        let tag = lookupTag(puzzle.tags[i]);
        if(!tag) {
            elem.innerText = puzzle.tags[i];
            elem.setAttribute("title", "Unknown tag");
        }
        else {
            // elem.innerText = tag.name;
            elem.setAttribute("title", tag.name + "\n" + tag.desc);
            if(tag.img)
                elem.setAttribute("src", `Assets/Tags/${tag.img}`)
            else
                elem.setAttribute("src", "Assets/Tags/unknown.png");
        }
        tagsElem.appendChild(elem);
    }
    bottomElem.appendChild(tagsElem);

    retElem.appendChild(topElem);
    retElem.appendChild(bottomElem);
    return retElem;
}

export default updatePuzzleList;