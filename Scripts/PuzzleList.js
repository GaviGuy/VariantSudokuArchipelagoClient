import {client, localItems, slotData} from "./Archipelago.js";

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
    console.log(TAGS);
    let nItems = 0;
    for(let i = 0; i < localItems.length; i++) {
        if(localItems[i].name === "Extra Max HP") nItems++;
    }

    //todo: clearing the list is horrible for continuity, removing typed fields, etc
    let listElem = document.getElementById("tab1-list");
    listElem.innerHTML = "";
    for(let i = 0; i < Math.min(PUZZLES.length, nItems); i++) {
        listElem.appendChild(createPuzzleCard(PUZZLES[i]));
    }
}

function createPuzzleCard(puzzle) {
    let retElem = document.createElement("div");
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
    solutionElem.appendChild(solutionInput);

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