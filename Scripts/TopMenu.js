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
    const COLORS = ["#DDD", "#DC0", "#2E2", "#B44"]
    document.body.style.setProperty("--color-connection", COLORS[index]);
    document.getElementById("top-text").innerText = message;
    
    if(index == 2)
        document.getElementById("top-disconnect").setAttribute("show", true);
    else 
        document.getElementById("top-disconnect").removeAttribute("show");
}