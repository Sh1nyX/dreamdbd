export function renderReport(report) {
    //SCREENS
    document.getElementById("mapScreen").classList.add("hidden");
    document.getElementById("resultScreen").classList.remove("hidden");

    const table = document.getElementById("reportTable");
    table.innerHTML = "";

    // KILLER ACTION SECTIONS

    report.sections.forEach(section => {
        const block = document.createElement("div");
        block.className = "report-section";

        //MAIN

        const main = document.createElement("div");
        main.className = "report-main";
        main.textContent = `${section.title} → ${section.count}`;
        block.appendChild(main);

        //DETAILS

        section.details.forEach(d => {
            const sub = document.createElement("div");
            sub.className = "report-sub";
            sub.textContent = `↳ ${d.label} → ${d.value}`;
            block.appendChild(sub);
        });

        // TOTAL SECTION

        const total = document.createElement("div");
        total.className = "report-total";
        total.textContent = `Total: +${section.score}`;
        block.appendChild(total);

        table.appendChild(block);
    });

    // SURVIVOR SCORES + TOTAL

    const survBlock = document.createElement("div");
    survBlock.className = "report-section";

    const survTitle = document.createElement("div");
    survTitle.className = "report-main";
    survTitle.textContent = "Survivor ratings";
    survBlock.appendChild(survTitle);

    report.survivors.forEach(s => {
        const row = document.createElement("div");
        row.className = "report-sub";
        row.textContent = `${s.role} → ${s.score}`;
        survBlock.appendChild(row);
    });

    const avg = document.createElement("div");
    avg.className = "report-total";
    avg.textContent = `Average survivor rating: ${report.avgSurvivor.toFixed(1)}`;
    survBlock.appendChild(avg);

    table.appendChild(survBlock);

    //KILLER TOTAL

    const killerTotal = document.createElement("div");
    killerTotal.className = "report-section report-total";
    killerTotal.textContent = `Killer total rating: ${report.killerTotal}`;
    table.appendChild(killerTotal);


    //FINAL COMPARISON

    const final = document.createElement("div");
    final.className = "report-section report-total";

    final.textContent =
        `Final rating change: ${report.finalDelta > 0 ? "+" : ""}${report.finalDelta} for killer`;

    table.appendChild(final);
}