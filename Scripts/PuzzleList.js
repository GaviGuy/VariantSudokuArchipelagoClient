import {debugMode, client, localItems, slotData, sendLocations} from "./Archipelago.js";

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
    for(let i = 0; i < localItems.length; i++) {
        if(localItems[i].id >= 1000) {
            let type = 0;
            if(slotData["bossUnlock"] == 2 && slotData["pillarIds"].includes(localItems[i].id)) {
                type = 1;
            }

            listElem.appendChild(createPuzzleCard(PUZZLES[(localItems[i].id - 1000) / 10], type));
        }
    }

    // boss unlock must be shown manually, it's not a received item
    //todo: implement boss unlock conditions
    if("boss unlocked" == true) {
        // console.warn("displaying boss puzzle");
        listElem.appendChild(createPuzzleCard(PUZZLES[slotData["bossId"]-1000], 2));
    }
}

function checkSolution(puzzle, solution) {
    if(puzzle.solutionCode == solution)
        return true;
    return false;
}


function createPuzzleCard(puzzle, puzzleType, solved) {
    const PUZZLE_CLASSES = ["filler", "pillar", "boss"];

    let retElem = document.createElement("div");
    retElem.classList.add(PUZZLE_CLASSES[puzzleType])
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

    // debug autosolve button
    if(debugMode) {
        let autosolve = document.createElement("button");
        autosolve.textContent = "h";
        autosolve.addEventListener("click", () => {
            sendLocations(puzzle);
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
        let elem = document.createElement("span");
        let tag = lookupTag(puzzle.tags[i]);
        if(!tag) {
            elem.innerText = puzzle.tags[i];
            elem.setAttribute("title", "Unknown tag");
        }
        else {
            elem.innerText = tag.name;
            elem.setAttribute("title", tag.name + "\n" + tag.desc);
        }
        tagsElem.appendChild(elem);
    }
    bottomElem.appendChild(tagsElem);

    retElem.appendChild(topElem);
    retElem.appendChild(bottomElem);
    return retElem;
}

export default updatePuzzleList;