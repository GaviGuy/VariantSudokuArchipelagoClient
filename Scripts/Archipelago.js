import { Client } from "https://unpkg.com/archipelago.js/dist/archipelago.min.js";

export const client = new Client();
export let localItems = [];
export let slotData, address, username, connected;
export let debugMode = false;
export let numPuzzles = 0;

import updatePuzzleList from "./PuzzleList.js";



function initDebugHotkeys() {
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "1") {
            e.preventDefault();
            debugMode = !debugMode;
            //console.log(`${debugMode ? "enabling" : "disabling"} debug mode`);
            updatePuzzleList();
        }
    });
}

function countLocations() {
    if(!connected) return;

    numPuzzles = 0;
    for(let i = 0; i < client.room.allLocations.length; i++) {
        let locId = client.room.allLocations[i];
        if(locId >= 1000 && locId % 10 == 0)
            numPuzzles++;
    }
}

function initialize() {
    console.log("gmorning");
    initDebugHotkeys();

    //initialize tab controls
    const TABS = document.getElementById("tab-buttons");
    for(let i = 0; i < TABS.children.length; i++) {
        TABS.children[i].addEventListener("click", () => {setTab(i)});
    }

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
    document.getElementById("input-password").addEventListener("keyup",
        (e) => {
            if(updateConnectButton() && e.key === "Enter" || e.keyCode === 13)
                login();
    });
    document.getElementById("top-disconnect").addEventListener("click",
        () => disconnect());
    document.getElementById("controls-disconnect").addEventListener("click",
        () => disconnect());
    document.getElementById("controls-censor").addEventListener("click",
        () => toggleCensor(connected, address, username));
        
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


    document.addEventListener("keyup",
        (e) => {
            if(e.key === "p") {
                console.log(client.authenticated);
            }
    });
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
    if(puzzle.id == (slotData["bossId"] - 1000) / 10) {
        console.warn("goaled!");
        client.goal();
    }
    else {
        for(let i = 0; i < puzzle.rating; i++) {
            let locId = 1000 + puzzle.id * 10 + i
            if(debugMode)
                console.log("attempted to send location id: " + locId);
            client.check(locId);
        }
        checkBonus();
    }
}

export function getNumPuzzlesSolved(checkedIds, pillarsOnly) {
    let ret = 0;
    for(let i = 0; i < checkedIds.length; i++) {
        if(checkedIds[i] < 1000) continue;
        if(checkedIds[i] % 10 != 0) continue;
        if(pillarsOnly && !slotData.pillarIds.includes(checkedIds[i])) continue;
        ret++;
    }
    return ret;
}

function checkBonus(newId) {
    let checkedIds = client.room.checkedLocations;
    checkedIds.push(newId);

    //no duplicates
    checkedIds = checkedIds.filter((item, index) => checkedIds.indexOf(item) === index);

    let solves = getNumPuzzlesSolved(checkedIds, false);
    if(slotData.bossUnlock == 2)
        solves = getNumPuzzlesSolved(checkedIds, true);

    let nBonus = 0;
    let mult = 2;
    switch(slotData.bossUnlock) {
        
        // # of bonuses equal to slotData.bossUnlockCount (key pieces)
        // give 2 per solve until they run out, or
        // give enough per solve that they run out before solving all filler
        case 0:
            nBonus = slotData.bossUnlockCount;
            while(numPuzzles * mult < nBonus)
                mult++;
            for(let i = 0; i < solves * mult; i++) {
                client.check(200 + i)
            }
            break;

        // # of bonuses equal to 50% of the filler puzzle count
        // give 2 per solve until they run out
        case 1:
            nBonus = Math.ceil(numPuzzles / 2);
            // TODO: does this value include the boss? it shouldn't
            // should be trivial to subtract 1 if so
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

client.messages.on("message", (content) => {
    printChatMessage(content);
});

client.messages.on("itemSent", (content) => {
    //printChatMessage("sent: " + content);
});

client.room.on("locationsChecked", () => {
    if(!connected) return;
    updatePuzzleList();
});

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
    updatePuzzleList()
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
    client.login().catch(()=>{});
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

function login() {
    let addressIn = document.getElementById("input-address").value;
    let usernameIn = document.getElementById("input-username").value;
    let passwordIn = document.getElementById("input-password").value;

    if(!addressIn || !usernameIn) return;

    disconnect();
    updateTopBar(topBarStates.connecting, "Connecting...")
    console.log("logging in...");

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
            updateTopBar(topBarStates.connected, `Connected to ${addressIn} as ${usernameIn}`);

            localItems = []
            for(let i = 0; i < client.items.received.length; i++) {
                let item = client.items.received[i];
                localItems.push({
                    id: item.id,
                    name: item.name,
                });
            }
            console.warn(localItems);
            countLocations();
            updatePuzzleList();

        })
        .catch((e) => {
            console.error(e);
            updateForDisconnect();
            if(e.message.includes("InvalidSlot"))
                updateTopBar(topBarStates.error, `Failed to connect: Invalid slot name`);
            else if(e.message.includes("InvalidPassword"))
                updateTopBar(topBarStates.error, `Failed to connect: Incorrect password`);
            else if(e.message.includes("InvalidGame"))
                updateTopBar(topBarStates.error, `Failed to connect: Incorrect game for slot`);
            else
                updateTopBar(topBarStates.error, `Failed to connect to server`);
        });
}

function syncItems() {

}

window.onerror = () => {
    console.log('got an error');
    return false;
}

