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

let TAGS = [];
getJson("./Assets/Tags.json").then((h) => {
    TAGS = h;
    TAGS = TAGS.tags;
});

function saveJson(file) {
    let filename = "Puzzles.json";
    let link = document.createElement("a"); 
    link.setAttribute("href", `data:text/plain; charset=utf-8, ${encodeURIComponent(file)}`);
    link.setAttribute("download", filename);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function doThingy() {
    getJson("./Assets/Puzzles.json").then((PUZZLES_DATABASE) => {

        // convert solution codes to solution hashes
        for(let i in PUZZLES_DATABASE.puzzles) {
            const p = PUZZLES_DATABASE.puzzles[i];
            if(p.solutionCode) {
                let prehash = p.title + p.solutionCode;
                PUZZLES_DATABASE.puzzles[i].solutionHash = cyrb53(prehash);
                delete PUZZLES_DATABASE.puzzles[i].solutionCode;
            }
        }

        // convert tags, report unrecognized ones
        let tagNames = [];
        for(let i in TAGS) {
            tagNames.push(TAGS[i].id);
        }
        for(let i in PUZZLES_DATABASE.puzzles) {
            const p = PUZZLES_DATABASE.puzzles[i];
            if(!p.tags) p.tags = [];

            // convert sheetTags to tags, report unrecognized sheetTags
            let sheetTags = p.sheetTags[0].split(",");
            for(let j in sheetTags) {
                const convTag = sheetTags[j].trim();
                let found = false;
                for(let k in TAGS) {
                    if(convTag == TAGS[k].sheet) {
                        p.tags.push(TAGS[k].id);
                        found = true;
                        break;
                    }
                }
                if(!found) console.error(`${p.id}: unknown sheet tag: ${convTag}`);
            }
            delete p.sheetTags;

            // report unrecognized tags
            for(let j in p.tags) {
                if(!(tagNames.includes(p.tags[j]))) {
                    console.error(`${p.id}: unknown tag: ${p.tags[j]}`);
                }
            }
        }

        // check that all required ids exist
        for(let i in PUZZLES_DATABASE.puzzles) {
            const p = PUZZLES_DATABASE.puzzles[i];
            if(!p.id) console.error(`index ${i}: missing id`);
            if(!p.link) console.error(`${p.id}: missing link`);
            if(!p.title) console.error(`${p.id}: missing title`);
            if(!p.author) console.error(`${p.id}: missing author`);
            if(!p.rating) console.error(`${p.id}: missing rating`);
            if(!p.solutionHint) console.error(`${p.id}: missing solution hint`);
            if(!p.solutionHash) console.error(`${p.id}: missing solution hash`);
        }

        // check that all ids are unique and are valid (1000 + 10x)
        let ids = [];
        for(let i in PUZZLES_DATABASE.puzzles) {
            ids.push(PUZZLES_DATABASE.puzzles[i].id);
        }
        for(let i in ids) {
            if(ids.indexOf(ids[i]) != i)
                console.error(`${ids[i]}: duplicate id`);
            if(ids[i] < 1000 || ids[i] % 10 != 0)
                console.error(`${ids[i]}: invalid id`);
        }

        saveJson(JSON.stringify(PUZZLES_DATABASE));
    });
}

// string hashing function taken from
// https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
const cyrb53 = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for(let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};