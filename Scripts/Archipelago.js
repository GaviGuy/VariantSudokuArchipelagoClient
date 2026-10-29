import { Client } from "https://unpkg.com/archipelago.js/dist/archipelago.min.js";

export const client = new Client();
export let localItems = [];
export let slotData, address, username, connected;
export let debugMode = false;
export let totalPuzzleCount = 0;
export let allPuzzleIds = [];
export let solvedIds = [];
let censor = false;

import buildDashboard from "./Dashboard.js";
import * as PL from "./PuzzleList.js";
import * as SL from "./SaveLoad.js";
import { puzzleRerolls } from "./SaveLoad.js";



function initDebugHotkeys() {
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "1") {
            e.preventDefault();
            debugMode = !debugMode;
            //console.log(`${debugMode ? "enabling" : "disabling"} debug mode`);
            PL.updatePuzzleList();
        }
    });
}

function readAllPuzzles() {
    if(!connected) return;

    allPuzzleIds = [];
    for(let i in client.room.allLocations) {
        let locId = client.room.allLocations[i];
        if(locId >= 1000 && locId % 10 == 0)
            allPuzzleIds.push(locId);
    }
    totalPuzzleCount = allPuzzleIds.length;
}

export function getPlayableIds(pillarsOnly) {
    let ret = [];
    for(let i in localItems) {
        if(localItems[i].id >= 1000
                && (!pillarsOnly || slotData.pillarIds.includes(localItems[i].id)))
            ret.push(localItems[i].id);
    }
    if(PL.canAccessBoss())
        ret.push(slotData.bossId);
    return ret;
}

export function getUnsolvedPlayableIds(pillarsOnly) {
    let ret = getPlayableIds(pillarsOnly);
    for(let i in solvedIds) {
        const ind = ret.indexOf(solvedIds[i])
        if(ind > -1) {
            ret.splice(ind, 1);
        }
    }
    return ret;
}

export function getNumberPillarSolved() {
    let ret = 0;
    for(let i in slotData.pillarIds) {
        if(solvedIds.includes(slotData.pillarIds[i]))
            ret++;
    }
    return ret;
}


function initialize() {
    console.log("gmorning");
    initDebugHotkeys();

    //initialize tab controls
    const TABS = document.getElementById("tab-buttons");
    for(let i = 0; i < TABS.children.length; i++) {
        TABS.children[i].addEventListener("click", () => {setTab(i)});
    }
    TABS.children[2].addEventListener("click", () => {
        document.getElementById("chat-input").focus();
    });

    //initialize login controls
    document.getElementById("controls-connect").addEventListener("click",
        () => login());
    document.getElementById("input-address").addEventListener("keyup",
        (e) => {
            if(updateConnectButton() && e.key === "Enter" || e.keyCode === 13)
                login();
    });
    document.getElementById("input-username").addEventListener("keyup",
        (e) => {
            if(updateConnectButton() && e.key === "Enter" || e.keyCode === 13)
                login();
    });
    document.getElementById("controls-censor").addEventListener("click",
        () => toggleCensor(connected, address, username));

    document.getElementById("input-password").addEventListener("keyup",
        (e) => {
            if(updateConnectButton() && e.key === "Enter" || e.keyCode === 13)
                login();
    });
    document.getElementById("password-censor").addEventListener("click",
        () => toggleShowPassword(connected, address, username));

    document.getElementById("top-disconnect").addEventListener("click",
        () => disconnect());
    document.getElementById("controls-disconnect").addEventListener("click",
        () => disconnect());
        
    // initialize chat controls
    document.getElementById("chat-input").addEventListener("keyup",
        (e) => {
            if(e.key === "Enter" || e.keyCode === 13) {
                sendChatMessage();
            }
    });
    document.getElementById("chat-send").addEventListener("click",
        () => sendChatMessage());

    // initialize other controls
    document.getElementById("top-arrow").addEventListener("click",
        () => handleTopArrow());

    // why is this necessary :(
    setTopMenuState(menuStates.open);
    setTopMenuState(menuStates.fixed);
    updateConnectButton();
}
initialize();

function sendChatMessage() {
    let chatBar = document.getElementById("chat-input");
    if(!chatBar.value && chatBar.value != "0") return;
    if(!connected) {
        printChatMessage("Cannot send chat message while disconnected");
        return;
    }
    client.messages.say(chatBar.value);
    chatBar.value = "";
}

export function sendLocations(puzzle) {
    if(!(solvedIds.includes(puzzle.id)))
        solvedIds.push(puzzle.id);
    if(debugMode) console.log(solvedIds);

    if(puzzle.id == (slotData["bossId"])) {
        if(debugMode) console.log("Goaled!");
        client.goal();
    }
    for(let i = 0; i < puzzle.rating; i++) {
        let locId = puzzle.id + i
        if(debugMode)
            console.log("sent location: " + locId);
        client.check(locId);
    }
    checkBonus();
    buildDashboard();
    PL.updatePuzzleList();
    SL.saveGame();
}

export function checkBonus() {

    // get number of puzzles solved (or number of pillars, in pillar mode)
    let solves = solvedIds.length;
    if(slotData.bossUnlock == 2) {
        solves = 0;
        for(let i in slotData.pillarIds) {
            if(solvedIds.includes(slotData.pillarIds[i]))
                solves++;
        }
    }

    let nBonus = 0;
    let mult = 2;
    switch(slotData.bossUnlock) {
        
        // # of bonuses equal to slotData.bossUnlockCount (key pieces)
        // give 2 per solve until they run out, or
        // give enough per solve that they run out before solving all filler
        case 0:
            nBonus = slotData.bossUnlockCount;
            while(totalPuzzleCount * mult < nBonus)
                mult++;
            for(let i = 0; i < solves * mult; i++) {
                client.check(200 + i)
            }
            break;

        // # of bonuses equal to 50% of the filler puzzle count
        // give 2 per solve until they run out
        case 1:
            nBonus = Math.ceil((totalPuzzleCount - 1) / 2);
            for(let i = 0; i < solves * mult; i++) {
                client.check(200 + i)
            }
            break;

        // # of bonuses based on pillar count
        // give 2 per pillar solve, or
        // give 1 per pillar solve if there's 4 or more pillars
        case 2:
            nBonus = slotData.pillarIds.length;
            if(nBonus >= 4) mult = 1;

            for(let i = 0; i < solves * mult; i++) {
                client.check(100 + i)
            }
            break;
    }
}

export function getUnreceivedPuzzles(pillarsOnly, blockHinted) {
    let hints = [];
    if(blockHinted) {
        for(let i in client.items.hints) {
            if(client.items.hints[i].item.receiver == username) {
                hints.push(client.items.hints[i].item.id);
            }
        }
    }

    // make an array of unrecieved puzzles
    // disclude puzzles that've been hinted if blockHinted
    let ret = []
    if(pillarsOnly) {
        const playables = getPlayableIds(pillarsOnly);
        for(let i in slotData.pillarIds) {
            if(playables.includes(slotData.pillarIds[i])) continue;
            if(blockHinted && hints.includes(slotData.pillarIds[i])) continue;
            ret.push(slotData.pillarIds[i]);
        }
    }
    else {
        const playables = getPlayableIds();
        for(let i in allPuzzleIds) {
            if(playables.includes(allPuzzleIds[i])) continue;
            if(allPuzzleIds[i] == slotData.bossId) continue;
            if(blockHinted && hints.includes(allPuzzleIds[i])) continue;
            ret.push(allPuzzleIds[i]);
        }
    }
    ret = ret.filter((a, b) => ret.indexOf(a) === b);

    return ret;
}

export function hintRandomPuzzle(pillarsOnly) {
    if(client.room.hintPoints < client.room.hintCost) {
        let printStr = `You can't afford the hint. `
                + `You have ${client.room.hintPoints} point${client.room.hintPoints == 1 ? "" : "s"} `
                + `and need at least ${client.room.hintCost}.`
        printChatMessage(printStr);
        return;
    }

    let validItems = getUnreceivedPuzzles(pillarsOnly, true);
    if(validItems.length == 0) {
        printChatMessage("There are no more puzzles to hint");
        return;
    }

    let hint = validItems[Math.floor(Math.random() * validItems.length)];
    client.messages.say(`!hint ${hint}`);
}

client.messages.on("message", (content) => {
    printChatMessage(content);
});

// client.messages.on("itemSent", (content) => {
// });

// client.room.on("locationsChecked", () => {
// });

client.items.on("itemsReceived", (h) => {
    if(!connected) return
    console.warn("got a new item: " + h);
    for(let i = localItems.length; i < client.items.received.length; i++) {
        let item = client.items.received[i];
        localItems.push({
            id: item.id,
            name: item.name,
        });
    }
    buildDashboard();
    PL.updatePuzzleList();
    SL.saveGame();
});

client.items.on("hintsInitialized", (h) => {
    buildDashboard();
});

function updateConnectButton() {
    if(document.getElementById("input-address").value && document.getElementById("input-username").value) {
        document.getElementById("controls-connect").removeAttribute("disabled");
        return true;
    }
    document.getElementById("controls-connect").setAttribute("disabled", 1);
}

function disconnect() {
    updateForDisconnect();
    client.socket.off("disconnected", attemptReconnect, 5000);
    client.socket.disconnect();
    updateTopBar(topBarStates.none, "Disconnected");
}

function updateForDisconnect() {
    if(connected) printChatMessage("Disconnected");
    slotData = null;
    username = null;
    connected = false;
    setTopMenuState(menuStates.fixed);
    document.getElementById("controls-disconnect").setAttribute("disabled", 1);
}

function login(isReconnect) {
    let addressIn = document.getElementById("input-address").value;
    let usernameIn = document.getElementById("input-username").value;
    let passwordIn = document.getElementById("input-password").value;

    if(!addressIn || !usernameIn) return;

    disconnect();
    if(isReconnect)
        updateTopBar(topBarStates.connecting, "Reconnecting...")
    else
        updateTopBar(topBarStates.connecting, "Connecting...")

    const options = {};
    if(passwordIn) options.password = passwordIn;

    client.login(addressIn, usernameIn, "Variant Sudoku", options)
        .then((val) => {
            slotData = val;
            address = addressIn;
            username = usernameIn;
            connected = true;
            console.log(slotData);
            document.getElementById("controls-disconnect").removeAttribute("disabled");
            setTopMenuState(menuStates.collapsed);
            
            let subMsg = `${censor ? "" : `to ${addressIn}`} as ${usernameIn}`;
            updateTopBar(topBarStates.connected, `Connected ${subMsg}`);

            // load data
            readLocalItems();
            readAllPuzzles();
            SL.loadGame();

            // update tabs
            PL.updatePuzzleList();
            buildDashboard();

            client.socket.on("disconnected", attemptReconnect, 5000);

        })
        .catch((e) => {
            console.error(e);
            updateForDisconnect();
            if(isReconnect)
                updateTopBar(topBarStates.error, `Connection lost`);
            else if(e.message.includes("InvalidSlot"))
                updateTopBar(topBarStates.error, `Failed to connect: Invalid slot name`);
            else if(e.message.includes("InvalidPassword"))
                updateTopBar(topBarStates.error, `Failed to connect: Incorrect password`);
            else if(e.message.includes("InvalidGame"))
                updateTopBar(topBarStates.error, `Failed to connect: Incorrect game`);
            else
                updateTopBar(topBarStates.error, `Failed to connect to server`);
        });
}

function readLocalItems() {
    localItems = []
    for(let i in client.items.received) {
        const item = client.items.received[i];
        localItems.push({
            id: item.id,
            name: item.name,
        });
    }
}

window.onerror = () => {
    console.log('got an error');
    return false;
}

function attemptReconnect(delay) {
    setTimeout(login, delay, true);
}

function toggleCensor(connected, address, username) {
    censor = !censor;
    document.getElementById("controls-censor").innerText = censor ? "x" : "o";

    let elem = document.getElementById("top-text");
    if(connected) {
        if(censor) 
            elem.innerText = `Connected as ${username}`;
        else 
            elem.innerText = `Connected to ${address} as ${username}`;
    }
    if(censor) {
        document.getElementById("input-address").setAttribute("type", "password");
    }
    else {
        document.getElementById("input-address").setAttribute("type", "text");
    }
}

function toggleShowPassword() {
    let elem = document.getElementById("input-password");
    let btn = document.getElementById("password-censor");
    if(elem.getAttribute("type") == "password") {
        btn.innerText = "o";
        elem.setAttribute("type", "text");
    }
    else {
        btn.innerText = "x";
        elem.setAttribute("type", "password");
    }
}

// helpers for saving and loading
export function setSolvedIds(newIds) {
    solvedIds = newIds;
}