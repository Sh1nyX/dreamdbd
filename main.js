document.addEventListener("DOMContentLoaded", () => {
    const ratingBtn = document.getElementById("ratingShowcaseBtn");
    const killerlistBtn = document.getElementById("killerListBtn");

    ratingBtn.addEventListener("click", () => {
        window.location.href = "ratingInfo/ratingInfo.html";
    });

    killerlistBtn.addEventListener("click", () => {
        window.location.href = "killerlist/killerlist.html";
    });
});