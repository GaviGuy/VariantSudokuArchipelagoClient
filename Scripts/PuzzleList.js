import * as AP from "./Archipelago.js";
import {getSaveKey} from "./SaveLoad.js";
import {makeToast} from "./Toasts.js";

async function getJson(path) {
    return fetch(path)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error(error);
            AP.queueNotification(3, "Fatal error", "Failed to load puzzle list. Check console for details");
        });
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
    let listElem = document.getElementById("tab1-list");
    listElem.innerHTML = "";

    // add debug inputs in debug mode
    if(AP.debugMode) {
        let cheatElem = document.createElement("input");
        cheatElem.addEventListener("keyup", (e) => {
            if(e.key === "Enter") {
                if(!cheatElem.value) return;
                AP.queueNotification(0, "Forced location", "ID: " + cheatElem.value);
                AP.client.check(parseInt(cheatElem.value));
                cheatElem.value = "";
            }
        });
        listElem.appendChild(cheatElem);

        let debugButtonElem = document.createElement("button");
        debugButtonElem.innerText = "debug";
        debugButtonElem.addEventListener("click", () => {
            AP.client.storage.fetch(getSaveKey()).then((e) => {
                console.log(e);
            });
        });
        listElem.appendChild(debugButtonElem);

        let button2 = document.createElement("button");
        button2.innerText = "notif test";
        button2.addEventListener("click", () => {
            for(let i in TAGS)
                AP.queueNotification(0, i, TAGS[i].name);
        });
        listElem.appendChild(button2);

        let buildButton = document.createElement("a");
        buildButton.setAttribute("href", "buildJson.html");
        buildButton.innerText = "Puzzle build page";
        listElem.appendChild(buildButton);
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
        const solved = AP.save.solvedIds.includes(filler[i]);
        listElem.appendChild(createPuzzleCard(getPuzzleById(filler[i]), 0, solved));
    }

    for(let i in pillar) {
        const solved = AP.save.solvedIds.includes(pillar[i]);
        listElem.appendChild(createPuzzleCard(getPuzzleById(pillar[i]), 1, solved));
    }

    if(canAccessBoss()) {
        const solved = AP.save.solvedIds.includes(AP.slotData.bossId);
        listElem.appendChild(createPuzzleCard(getPuzzleById(AP.slotData.bossId), 2, solved));
    }
}

export function canAccessBoss() {
    if(!AP.connected) return false;
    switch(AP.slotData.bossUnlock) {
        // access the boss after getting slotData.bossUnlockCount keypieces
        case 0:
            if(AP.localItems.filter(x => x.id == 1).length >= AP.slotData.bossUnlockCount)
                return true;
            return false;

        // access the boss after solving slotData.bossUnlockCount puzzles
        case 1:
            if(AP.save.solvedIds.length >= AP.slotData.bossUnlockCount)
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
    const solutionHash = AP.cyrb53(puzzle.title + solution)
    if(puzzle.solutionHash == solutionHash)
        return true;
    return false;
}

function createPuzzleCard(puzzle, puzzleType, solved) {
    // handle rerolls
    const originalPuzzle = puzzle;
    while(true) {
        let found = false;
        for(let i in AP.save.rerolls) {
            if(AP.save.rerolls[i].source == puzzle.id) {
                puzzle = getPuzzleById(AP.save.rerolls[i].dest);
                found = true;
                break;
            }
        }
        if(!found) break;
    }

    const PUZZLE_CLASSES = ["filler", "pillar", "boss"];

    let retElem = document.createElement("div");
    retElem.classList.add(PUZZLE_CLASSES[puzzleType])
    if(solved) retElem.classList.add("solved");

    // top layer: name/author/rating and asterisk notification
    let topElem = document.createElement("div");
    topElem.classList.add("card-top");

    let titleElem = document.createElement("a");
    titleElem.setAttribute("href", puzzle.link);
    titleElem.setAttribute("target", "_blank");
    titleElem.innerText = puzzle.title;
    topElem.appendChild(titleElem);

    let authorElem = document.createElement("span");
    authorElem.innerText = puzzle.author;
    topElem.appendChild(authorElem);

    let ratingElem = document.createElement("span");
    let stars = "";
    while(stars.length < puzzle.rating)
        stars += "★";
    while(stars.length < 5)
        stars += "☆";
    ratingElem.innerText = stars;
    topElem.appendChild(ratingElem);

    // middle layer: left side solution hint, right side buttons
    let middleElem = document.createElement("div");
    middleElem.classList.add("card-mid");
    
    if(!solved) {
        let solutionHintElem = document.createElement("div");
        solutionHintElem.innerText = "Solution code: " + puzzle.solutionHint;
        middleElem.appendChild(solutionHintElem);
    }
    else {
        let solvedElem = document.createElement("span");
        solvedElem.innerText = "Solved!"
        middleElem.appendChild(solvedElem);
    }

    let buttonsElem = document.createElement("div");
    buttonsElem.classList.add("card-buttons");

    // debug auto-solve button
    if(AP.debugMode) {
        let autosolve = document.createElement("button");
        autosolve.textContent = "SKIP";
        autosolve.addEventListener("click", () => {
            AP.sendLocations(originalPuzzle);
        });
        buttonsElem.appendChild(autosolve);
    }

    // repeat instance free reroll button
    // this is non-deterministic though, hmmm
    // todo: disable this function in a race environment (?) or via yaml
    if(!solved && getSolveIsInStorage(puzzle.id)) {
        let reroll = document.createElement("button");
        reroll.textContent = "Reroll*";
        reroll.addEventListener("click", () => {
            if(confirm(`It seems you've solved this puzzle already. You may reroll it free of cost.`)) {
                AP.rerollPuzzleFree(puzzle);
            }
        });
        buttonsElem.appendChild(reroll);
    }

    let linkButton = document.createElement("button");
    linkButton.textContent = "Open";
    linkButton.addEventListener("click", () => {
        const link = document.createElement("a");
        link.setAttribute("href", puzzle.link);
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    buttonsElem.appendChild(linkButton);

    middleElem.appendChild(buttonsElem);

    // bottom layer: left side solution input, right side tags
    let bottomElem = document.createElement("div");
    bottomElem.classList.add("card-bottom");

    let bottomLeft = document.createElement("div");
    
    if(!solved) {
        let solutionInput = document.createElement("input");
        solutionInput.addEventListener("keyup", (e) => {
            if(e.key === "Enter") {
                const code = solutionInput.value;
                if(checkSolution(puzzle, code)) {
                    AP.sendLocations(originalPuzzle);
                    saveSolveToStorage(puzzle.id);
                }
                else {
                    if(code.length > 0) {
                        const msg = `${code} is not the solution to ${puzzle.title}`
                        AP.queueNotification(4, "Incorrect code", msg, true);
                    }
                }
            }
        });
        bottomLeft.appendChild(solutionInput);
        
        let submitButton = document.createElement("button");
        submitButton.addEventListener("click", () => {
            const code = solutionInput.value;
            if(checkSolution(puzzle, code)) {
                AP.sendLocations(originalPuzzle);
                saveSolveToStorage(puzzle.id);
            }
            else {
                if(code.length > 0) {
                    const msg = `${code} is not the solution to ${puzzle.title}`
                    AP.queueNotification(4, "Incorrect code", msg, true);
                }
            }
        });
        submitButton.textContent = "Submit";
        bottomLeft.appendChild(submitButton);

        if(AP.getAvailableRerolls() > 0) {
            let rerollButton = document.createElement("button");
            rerollButton.addEventListener("click", () => {
                if(confirm(`Spend a Puzzle Reroll? You have ${AP.getAvailableRerolls()}.`)) {
                    AP.rerollPuzzle(puzzle);
                }
            });
            rerollButton.innerText = "Reroll";
            bottomLeft.appendChild(rerollButton);
        }
    }

    bottomElem.appendChild(bottomLeft);

    let tagsElem = document.createElement("div");
    tagsElem.classList.add("tab1-tags");

    let lookupTag = (tag) => {
        for(let i in TAGS) {
            if(tag == TAGS[i].id) return TAGS[i];
        }
    };
    for(let i = 0; i < puzzle.tags.length; i++) {
        let tabBox = document.createElement("div");
        let img = document.createElement("img");
        let tt = document.createElement("span");

        img.style.pointerEvents = "none";
        tabBox.classList.add("tt");
        tt.classList.add("tt-content");
        
        let tag = lookupTag(puzzle.tags[i]);

        if(!tag) {
            img.setAttribute("src", "Assets/Tags/unknown.png");
            tt.innerText = `Unknown tag: ${puzzle.tags[i]}`
        }
        else {
            if(tag.img)
                img.setAttribute("src", `Assets/Tags/${tag.img}`)
            else
                img.setAttribute("src", "Assets/Tags/unknown.png");
            tt.innerHTML = "<b>" + tag.name + "</b><br>" + tag.desc+ "<br>";
            if(tag.largeImg) {
                let ttImg = document.createElement("img");
                ttImg.setAttribute("src", `Assets/Tags/${tag.largeImg}`);
                tt.appendChild(ttImg);
            }
            else {
                let ttImg = document.createElement("img");
                ttImg.setAttribute("src", "Assets/Tags/large-unknown.png");
                tt.appendChild(ttImg);
            }

        }

        tabBox.appendChild(img);
        tabBox.appendChild(tt);

        tagsElem.appendChild(tabBox);
    }
    bottomElem.appendChild(tagsElem);

    retElem.appendChild(topElem);
    retElem.appendChild(middleElem);
    retElem.appendChild(bottomElem);
    return retElem;
}

function saveSolveToStorage(id) {
    let saved = JSON.parse(localStorage.getItem("solvedIds"));
    if(!saved) saved = [];
    if(!(saved.includes(id)))
        saved.push(id);
    localStorage.setItem("solvedIds", JSON.stringify(saved));
    console.log(saved);
}

function getSolveIsInStorage(id) {
    let saved = localStorage.getItem("solvedIds");
    if(!saved) return false
    if(saved.includes(id)) return true
    return false;
}