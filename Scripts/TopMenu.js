const menuStates = {
    fixed: 0,
    collapsed: 1,
    open: 2
}

function setTopMenuState(index) {
    let elem = document.getElementById("top-menu");
    elem.setAttribute("state", index);
}

function handleTopArrow() {
    let elem = document.getElementById("top-arrow");
    let topMenuState = document.getElementById("top-menu").getAttribute("state");
    if(topMenuState != menuStates.collapsed) {
        elem.setAttribute("state", menuStates.fixed);
        setTopMenuState(menuStates.collapsed);
    }
    else {
        elem.setAttribute("state", menuStates.collapsed);
        setTopMenuState(menuStates.open);
    }
}

function printChatMessage(message) {
    let elem = document.getElementById("chat-log");
    let newElem = document.createElement("div");
    newElem.textContent = message;
    elem.appendChild(newElem);
    console.log(message);

    let chatLog = document.getElementById("chat-log");
    chatLog.scrollTop += newElem.clientHeight + 1;
}

const topBarStates = {
    none: 0,
    connecting: 1,
    connected: 2,
    error: 3
}

function updateTopBar(index, message) {
    document.getElementById("connection-info").setAttribute("state", index);
    document.getElementById("top-text").innerText = message;
}