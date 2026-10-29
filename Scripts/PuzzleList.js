import * as AP from "./Archipelago.js";

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

export const PUZZLES_DATABASE = await getJson("./Assets/Puzzles.json");
export const PUZZLES = PUZZLES_DATABASE.puzzles;

export const TAGS_DATABASE = await getJson("./Assets/Tags.json");
export const TAGS = TAGS_DATABASE.tags;

export function getPuzzleById(id) {
    for(let i in PUZZLES) {
        if(PUZZLES[i].id === id)
            return PUZZLES[i];
    }
}

export function updatePuzzleList() {
    const wawa = (() => {
        let ret = [];
        for(let i in TAGS) {
            ret.push(TAGS[i].id);
        }
        console.log(ret);
    });
    wawa();
    let listElem = document.getElementById("tab1-list");
    listElem.innerHTML = "";

    // add debug inputs in debug mode
    if(AP.debugMode) {
        let cheatElem = document.createElement("input");
        cheatElem.addEventListener("keyup", (e) => {
            if(e.key === "Enter") {
                console.log("cheated location id: " + cheatElem.value);
                AP.client.check(parseInt(cheatElem.value));
                cheatElem.value = "";
            }
        });
        listElem.appendChild(cheatElem);

        let debugButtonElem = document.createElement("button");
        debugButtonElem.innerText = "debug";
        debugButtonElem.addEventListener("click", (e) => {
            console.log(AP.solvedIds);
        });
        listElem.appendChild(debugButtonElem);
    }

    // sort puzzles
    const playables = AP.getPlayableIds();
    let filler = [], pillar = [];
    for(let i in playables) {
        if(AP.slotData["bossUnlock"] == 2 && AP.slotData["pillarIds"].includes(playables[i]))
            pillar.push(playables[i]);
        else if(playables[i] != AP.slotData.bossId)
            filler.push(playables[i]);
    }

    // remove duplicates
    filler = filler.filter((a, b) => filler.indexOf(a) === b);
    pillar = pillar.filter((a, b) => pillar.indexOf(a) === b);

    for(let i in filler) {
        let solved = AP.solvedIds.includes(filler[i]);
        listElem.appendChild(createPuzzleCard(getPuzzleById(filler[i]), 0, solved));
    }

    for(let i in pillar) {
        let solved = AP.solvedIds.includes(pillar[i]);
        listElem.appendChild(createPuzzleCard(getPuzzleById(pillar[i]), 1, solved));
    }

    if(canAccessBoss()) {
        let solved = AP.solvedIds.includes(AP.slotData.bossId);
        listElem.appendChild(createPuzzleCard(getPuzzleById(AP.slotData.bossId), 2, solved));
    }
}

export function canAccessBoss() {
    switch(AP.slotData.bossUnlock) {
        // access the boss after getting slotData.bossUnlockCount keypieces
        case 0:
            if(AP.localItems.filter(x => x.id == 1).length >= AP.slotData.bossUnlockCount)
                return true;
            return false;

        // access the boss after solving slotData.bossUnlockCount puzzles
        case 1:
            if(AP.solvedIds.length >= AP.slotData.bossUnlockCount)
                return true;
            return false;

        // access the boss after solving all puzzles in slotData.pillarIds
        case 2:
            if(AP.getNumberPillarSolved() >= AP.slotData.pillarIds.length)
                return true;
            return false;
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
    if(solved) retElem.classList.add("solved");
    retElem.classList.add("puzzle-container");

    let topElem = document.createElement("div");

    let titleElem = document.createElement("a");
    titleElem.classList.add("puzzle-title");
    titleElem.setAttribute("href", puzzle.link);
    titleElem.setAttribute("target", "_blank");
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
                    AP.sendLocations(puzzle)
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
    if(AP.debugMode) {
        let autosolve = document.createElement("button");
        autosolve.textContent = "h";
        autosolve.addEventListener("click", () => {
            AP.sendLocations(puzzle);
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
            elem.setAttribute("title", `Unknown tag: ${puzzle.tags[i]}`);
            elem.setAttribute("src", "Assets/Tags/unknown.png");
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