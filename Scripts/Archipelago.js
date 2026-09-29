import { Client } from "https://unpkg.com/archipelago.js/dist/archipelago.min.js";

const client = new Client();
let slotData, address, username, connected;



function initDebugHotkeys() {
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "1") {
            e.preventDefault();
            setTopMenuState(0);
        }
        else if (e.ctrlKey && e.key === "2") {
            e.preventDefault();
            setTopMenuState(1);
        }
        else if (e.ctrlKey && e.key === "3") {
            e.preventDefault();
            setTopMenuState(2);
        }
        else if (e.ctrlKey && e.key === "4") {
            e.preventDefault();
            const packet = {
                cmd: "Get",
                keys: ["_read_slot_data_0"],
            };
            fetch("https://localhost:38281/GetPacket", packet)
                .then((e) => {
                    console.log(e.status);
                    console.log(e);
                });
        }
    });
}

function initialize() {
    console.log("gmorning");
    initDebugHotkeys();

    //initialize login controls
    document.getElementById("controls-connect").addEventListener("click",
        () => handleLogin());
    document.getElementById("input-address").addEventListener("keyup",
        (e) => {
            if(updateConnectButton() && e.key === "Enter" || e.keyCode === 13)
                handleLogin();
        });
    document.getElementById("input-username").addEventListener("keyup",
        (e) => {
            if(updateConnectButton() && e.key === "Enter" || e.keyCode === 13)
                handleLogin();
        });
    document.getElementById("input-password").addEventListener("keyup",
        (e) => {
            if(updateConnectButton() && e.key === "Enter" || e.keyCode === 13)
                handleLogin();
        });
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

client.messages.on("message", (content) => {
    printChatMessage(content);
});

function updateConnectButton() {
    if(document.getElementById("input-address").value && document.getElementById("input-username").value) {
        document.getElementById("controls-connect").removeAttribute("disabled");
        return true;
    }
    document.getElementById("controls-connect").setAttribute("disabled", 1);
}

function handleLogin() {
    let address = document.getElementById("input-address").value;
    let username = document.getElementById("input-username").value;
    let password = document.getElementById("input-password").value;

    if(!address || !username) return;

    login(address, username, password);
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
    // changeContentWindow(contentWindows.blank);
    document.getElementById("controls-disconnect").setAttribute("disabled", 1);
}

function login(adr, usrnm, password) {
    disconnect();
    updateTopBar(topBarStates.connecting, "Connecting...")
    console.log("logging in...");

    const options = {};
    if(password) options.password = password;

    client.login(adr, usrnm, "Noita", options)
        .then((val) => {
            slotData = val;
            address = adr;
            username = usrnm;
            connected = true;
            console.log(slotData);
            document.getElementById("controls-disconnect").removeAttribute("disabled");
            setTopMenuState(menuStates.collapsed);
            updateTopBar(topBarStates.connected, `Connected to ${adr} as ${usrnm}`);
            // generateCourseSelect();
            // changeContentWindow(contentWindows.courseSelect);

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

window.onerror = () => {
    console.log('got an error');
    return false;
}

