import { Client } from "https://unpkg.com/archipelago.js/dist/archipelago.min.js";

export const client = new Client();
export let localItems = [];
export let slotData, address, username, connected;
export let debugMode = false;
export let allPuzzleIds = [];
export let save = {
    solvedIds: [],
    rerolls: [],
    itemIndex: 2
};
let toastQueue = [];
let notifTimer;
let censor = false;
export const TOAST_LENGTH = 3500;

import buildDashboard from "./Dashboard.js";
import * as PL from "./PuzzleList.js";
import * as SL from "./SaveLoad.js";
import { makeToast } from "./Toasts.js";

export function getAvailableRerolls() {
    let ret = 0;
    for(let i in localItems) {
        if(localItems[i].name == "Puzzle Reroll") {
            ret++;
        }
    }
    return ret - save.rerolls.length;
}

export function updateInterface() {
    buildDashboard();
    PL.updatePuzzleList();
}

export function getValidRerollTarget(puzzle, minDiff, maxDiff) {
    if(minDiff < 1) minDiff = 1;
    if(maxDiff > 5) maxDiff = 5;
    
    let valid = [];
    for(let i in PL.PUZZLES) {
        // skip puzzles not in range
        if(PL.PUZZLES[i].rating < minDiff) continue;
        if(PL.PUZZLES[i].rating > maxDiff) continue;

        // skip puzzles in the generation
        if(allPuzzleIds.includes(PL.PUZZLES[i].id)) continue;

        // skip puzzles previously rolled
        let found = false;
        for(let j in save.rerolls) {
            if(save.rerolls[j].dest == PL.PUZZLES[i].id) {
                found = true;
                break;
            }
        }
        if(found) continue;

        valid.push(PL.PUZZLES[i]);
    }
    if(valid.length == 0) return;
    
    // only the best random seeds on the market
    const rand = cyrb53(puzzle.id + "wawa" + save.rerolls.length, client.room.seed) % valid.length;
    return valid[rand];
}

export function rerollPuzzle(puzzle) {
    if(getAvailableRerolls() < 1) return;
    const newPuzzle = getValidRerollTarget(puzzle, puzzle.rating-1, puzzle.rating);
    if(!newPuzzle) {
        printChatMessage("No valid puzzles to reroll to");
        return;
    }
    save.rerolls.push({
        source: puzzle.id,
        dest: newPuzzle.id
    });
    PL.updatePuzzleList();
    SL.saveGame();
}

function initDebugHotkeys() {
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "1") {
            e.preventDefault();
            debugMode = !debugMode;
            PL.updatePuzzleList();
        }
    });
}

function readAllPuzzles() {
    if(!connected) return;

    allPuzzleIds = [];
    for(let i in client.room.allLocations) {
        const locId = client.room.allLocations[i];
        if(locId >= 1000 && locId % 10 == 0)
            allPuzzleIds.push(locId);
    }
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
    for(let i in save.solvedIds) {
        const ind = ret.indexOf(save.solvedIds[i])
        if(ind > -1) {
            ret.splice(ind, 1);
        }
    }
    return ret;
}

export function getNumberPillarSolved() {
    let ret = 0;
    for(let i in slotData.pillarIds) {
        if(save.solvedIds.includes(slotData.pillarIds[i]))
            ret++;
    }
    return ret;
}


function initialize() {
    console.log("gmorning");
    initDebugHotkeys();
    window.scrollTo(0, 0);

    // read localStorage for settings
    if(localStorage.getItem("hideAddress") != censor.toString())
        toggleCensor();
    if(!censor) {
        if(localStorage.getItem("savedSlotName"))
            document.getElementById("input-username").value = localStorage.getItem("savedSlotName");
        if(localStorage.getItem("savedAddress"))
            document.getElementById("input-address").value = localStorage.getItem("savedAddress");
    }

    // initialize tab controls
    const TABS = document.getElementById("tab-buttons");
    for(let i = 0; i < TABS.children.length; i++) {
        TABS.children[i].addEventListener("click", () => {setTab(i)});
    }
    TABS.children[2].addEventListener("click", () => {
        document.getElementById("chat-input").focus();
    });

    // initialize login controls
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

export function getPuzzleById(id) {
    for(let i in PL.PUZZLES) {
        if(PL.PUZZLES[i].id == id)
            return PL.PUZZLES[i];
    }
}

export function sendLocations(puzzle) {
    console.log(puzzle);
    if(!(save.solvedIds.includes(puzzle.id)))
        save.solvedIds.push(puzzle.id);
    if(debugMode) console.log(save.solvedIds);

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
    let solves = save.solvedIds.length;
    if(slotData.bossUnlock == 2) {
        solves = 0;
        for(let i in slotData.pillarIds) {
            if(save.solvedIds.includes(slotData.pillarIds[i]))
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
            while(allPuzzleIds.length * mult < nBonus)
                mult++;
            for(let i = 0; i < solves * mult; i++) {
                client.check(200 + i)
            }
            break;

        // # of bonuses equal to 50% of the filler puzzle count
        // give 2 per solve until they run out
        case 1:
            nBonus = Math.ceil((allPuzzleIds.length - 1) / 2);
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
        queueNotification(0, "Can't Afford Hint", printStr, true);
        return;
    }

    let validItems = getUnreceivedPuzzles(pillarsOnly, true);
    if(validItems.length == 0) {
        const str = pillarsOnly ? "pillars" : "puzzles";
        queueNotification(0, "", `There are no more ${str} left to hint`, true);
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

client.items.on("itemsReceived", () => {
    processNewItems();
});

client.items.on("hintReceived", () => {
    const hint = client.items.hints[client.items.hints.length-1].item;
    const self = client.players.self;
    let str = hint.receiver.slot == self.slot ? "Your " : `${hint.receiver.name}'s `;
    str += hint.name;
    str += " is at "
    str += hint.receiver.slot == self.slot ? "your " : `${hint.sender.name}'s `;
    str += hint.locationName;
    queueNotification(0, "Hint Received", str);
});

function processNewItems() {
    if(!connected) return

    for(let i = save.itemIndex; i < client.items.received.length; i++) {
        let item = client.items.received[i];
        localItems.push({
            id: item.id,
            name: item.name,
        });

        if(client.items.received[i].sender.slot == client.players.self.slot) {
            const msg = `You found your ${item.name}`;
            queueNotification(0, "Item found", msg);
        }
        if(client.items.received[i].sender.slot != client.players.self.slot) {
            const msg = `${client.items.received[i].sender.name} sent you ${item.name}`;
            queueNotification(0, "Item received", msg);
        }
    }

    //todo: don't rebuild ui for filler (?)
    save.itemIndex = client.items.received.length;
    buildDashboard();
    PL.updatePuzzleList();
    SL.saveGame();

}

client.items.on("hintsInitialized", (h) => {
    buildDashboard();
});

function updateConnectButton() {
    if(document.getElementById("input-address").value && document.getElementById("input-username").value) {
        if(!connected)
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
    resetSave();
    updateInterface();
    setTopMenuState(menuStates.fixed);
    document.getElementById("controls-disconnect").setAttribute("disabled", 1);
    document.getElementById("controls-connect").removeAttribute("disabled");
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

            // update top bar
            document.getElementById("controls-disconnect").removeAttribute("disabled");
            document.getElementById("controls-connect").setAttribute("disabled", true);
            setTopMenuState(menuStates.collapsed);
            
            let subMsg = `${censor ? "" : `to ${addressIn}`} as ${usernameIn}`;
            updateTopBar(topBarStates.connected, `Connected ${subMsg}`);

            // load data
            SL.loadGame().then(() => {
                // toast new items
                readLocalItems();
                readAllPuzzles();
                processNewItems();
            });

            // save localStorage
            if(!censor) {
                localStorage.setItem("savedAddress", address);
                localStorage.setItem("savedSlotName", username);
            }
            else {
                document.getElementById("input-address").value = "";
                document.getElementById("input-username").value = "";
            }

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

window.onerror = (e) => {
    console.error(e);
    return false;
}

function attemptReconnect(delay) {
    setTimeout(login, delay, true);
}

function toggleCensor(connected, address, username) {
    censor = !censor;
    document.getElementById("controls-censor").innerText = censor ? "x" : "o";

    if(connected) {
        let subMsg = `${censor ? "" : `to ${address}`} as ${username}`;
        updateTopBar(topBarStates.connected, `Connected ${subMsg}`);
    }
    if(censor)
        document.getElementById("input-address").setAttribute("type", "password");
    else
        document.getElementById("input-address").setAttribute("type", "text");

    localStorage.setItem("hideAddress", censor);
    if(censor) {
        localStorage.removeItem("savedAddress");
        localStorage.removeItem("savedSlotName");
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

export function queueNotification(type, title, message, force) {
    if(!message && message != 0) message = "";
    const notif = {
        type: type,
        title: title,
        message: message
    }

    if(force) toastQueue.unshift(notif);
    else toastQueue.push(notif);

    if(force && notifTimer) {
        triggerNotifications();
        clearInterval(notifTimer);
        notifTimer = setInterval(triggerNotifications, TOAST_LENGTH);
    }

    if(!notifTimer) {
        triggerNotifications();
        notifTimer = setInterval(triggerNotifications, TOAST_LENGTH);
    }
}

export function queueNotifications(notifs, force) {
    if(!notifs) return;
    if(rush) {
        notifs.push(...toastQueue);
        toastQueue = notifs;
    }
    else toastQueue.push(...notifs)

    if(force && notifTimer) {
        triggerNotifications();
        clearInterval(notifTimer);
        notifTimer = setInterval(triggerNotifications, TOAST_LENGTH);
    }

    if(!notifTimer) {
        triggerNotifications();
        notifTimer = setInterval(triggerNotifications, TOAST_LENGTH);
    }
}

function triggerNotifications() {
    if(toastQueue.length == 0) {
        clearInterval(notifTimer);
        notifTimer = undefined;
        return;
    }

    const notif = toastQueue.shift();
    makeToast(notif.type, notif.title, notif.message);
}

export function skipNotification() {
    triggerNotifications();
    if(notifTimer) {
        clearInterval(notifTimer);
        notifTimer = setInterval(triggerNotifications, TOAST_LENGTH);
    }
}

// string hashing function taken from
// https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
export const cyrb53 = (str, seed = 0) => {
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

function resetSave() {
    localItems = [];
    save.solvedIds = [];
    save.rerolls = [];
    save.itemIndex = 2;
}