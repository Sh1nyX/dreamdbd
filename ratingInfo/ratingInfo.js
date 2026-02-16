document.addEventListener("DOMContentLoaded", () =>
{

    document.getElementById("playBtn")?.addEventListener("click", () =>
    {
        window.location.href = "rating/rating.html";
    });

    document.getElementById("logoBtn")?.addEventListener("click", () =>
    {
        window.location.href = "/dreamdbd/";
    });

    document.getElementById("survRulesBtn")
        ?.addEventListener("click", () =>
        {
            survivorRulesModal?.classList.add("show");
        });

    document.getElementById("killerRulesBtn")
        ?.addEventListener("click", () =>
        {
            killerRulesModal?.classList.add("show");
        });

    document.getElementById("closeSurvRules")
        ?.addEventListener("click", () =>
        {
            survivorRulesModal?.classList.remove("show");
        });

    document.getElementById("closeKillerRules")
        ?.addEventListener("click", () =>
        {
            killerRulesModal?.classList.remove("show");
        });

    document.querySelectorAll(".rules-modal").forEach(modal =>
    {
        modal.addEventListener("click", (e) =>
        {
            if (e.target === modal)
            {
                modal.classList.remove("show");
            }
        });
    });

});