

function loadPuzzles() {
    fetchJSONData().then(data => {
        console.log(data);
        //todo: clearing the list is horrible for continuity, removing typed fields, etc
        let listElem = document.getElementById("tab1-list");
        listElem.innerHTML = "";
        for(let i = 0; i < data.puzzles.length; i++) {
            listElem.appendChild(createPuzzleCard(data.puzzles[i]));
        }
    });
}

function createPuzzleCard(puzzle) {
    let retElem = document.createElement("div");
    retElem.classList.add("puzzle-container");

    let topElem = document.createElement("div");

    let titleElem = document.createElement("span");
    titleElem.classList.add("puzzle-title");
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
    for(let i = 0; i < puzzle.tags.length; i++) {
        let elem = document.createElement("span");
        elem.innerText= puzzle.tags[i];
        tagsElem.appendChild(elem);
    }
    bottomElem.appendChild(tagsElem);

    retElem.appendChild(topElem);
    retElem.appendChild(bottomElem);
    return retElem;
}

// lifted from geeksforgeeks
function fetchJSONData() {
    return fetch('./Assets/Puzzles.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();  
        })
        .catch(error => console.error('Failed to fetch data:', error)); 
}