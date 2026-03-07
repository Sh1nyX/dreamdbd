document.addEventListener("DOMContentLoaded", () => {
    const ratingBtn = document.getElementById("ratingShowcaseBtn");
    const killerListBtn = document.getElementById("killerListBtn");

    ratingBtn.addEventListener("click", () => {
        window.location.href = "ratingInfo/ratingInfo.html";
    });

    /*killerListBtn.addEventListener("click", () => {
        window.location.href = "killerlist/killerlist.html";
    });*/
});