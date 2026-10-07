activeTab = 0;

function setTab(index) {
    if(activeTab == index) return;
    document.getElementById("tab-buttons").children[activeTab].classList.remove("active");
    document.getElementById("tab-buttons").children[index].classList.add("active");
    document.getElementById("tab-contents").children[activeTab].classList.remove("active");
    document.getElementById("tab-contents").children[index].classList.add("active");
    activeTab = index;
}