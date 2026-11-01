import * as AP from "./Archipelago.js";

let toastTimeout;

function fadeToast() {
    document.getElementById("toaster").classList.remove("active");
}

document.addEventListener("keyup", (e) => {
    if(e.key === "9") {
        makeToast(0, "title", "message awawa wefa sd fa sdf asd f");
    }
});

export function makeToast(type, title, message) {
    let toastElem = document.createElement("div");
    toastElem.classList.add("toast");

    switch(type) {
        case 0:
            // item sent toast
            break;
        case 1:
            // item recieved toast
            break;
        case 2:
            // hint toast
            break;
        case 3:
            // generic toast
            break;
        case 4:
            // error toast
            toastElem.classList.add("error");
            break;
    }

    let titleElem = document.createElement("div");
    titleElem.classList.add("title");
    titleElem.innerText = title;

    let bodyElem = document.createElement("div");
    bodyElem.innerText = message;

    toastElem.appendChild(titleElem);
    toastElem.appendChild(bodyElem);

    let toaster = document.getElementById("toaster");
    toaster.innerHTML = "";
    toaster.appendChild(toastElem);
    toaster.classList.add("active");

    toastElem.addEventListener("click", () => {
        fadeToast();
        AP.skipNotification();
    });
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(fadeToast, AP.TOAST_LENGTH - 350);
}