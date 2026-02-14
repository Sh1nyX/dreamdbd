import { scoreKillerEvent } from "../scoring/killerScoring.js";
import { scoreSurvivorEvent } from "../scoring/survivorScoring.js";


export function renderActionLog(events)
{
    const list = document.getElementById("logList");
    if (!list) return;

    list.innerHTML = "";

    events.forEach((e, i) =>
    {
        const row = document.createElement("div");
        row.className = "log-item";
        const killer = scoreKillerEvent(e);
        const surv = scoreSurvivorEvent?.(e);

        let pts = [];
        if (killer?.killer) pts.push(`+${killer.killer} killer`);
        if (surv) pts.push(`+${surv.value} ${surv.role}`);

        row.innerHTML = `
            <span class="log-time">[${i}]</span>
            ${describeEvent(e)}
            ${pts.length ? `<span class="log-points">(${pts.join(", ")})</span>` : ""}
        `;

        list.appendChild(row);
    });
}

function cssClassForEvent(type)
{
    if (type.includes("HIT")) return "log-hit";
    if (type.includes("DOWN")) return "log-down";
    if (type.includes("HOOK")) return "log-hook";
    if (type.includes("GEN")) return "log-gen";
    if (type.includes("HEAL")) return "log-heal";
    if (type.includes("ESCAPE")) return "log-escape";
    return "";
}

function describeEvent(e)
{
    switch (e.type) {
        case "CHASE_START":
            return `Chase started on ${e.target}`;

        case "CHASE_END":
            return `Chase ended on ${e.target} (${e.duration} actions)`;

        case "HIT":
            return `Hit on ${e.target}`;

        case "DOWN":
            return `${e.target} was downed`;

        case "HOOK":
            return `${e.target} was hooked`;

        case "UNHOOK":
            return `${e.by} unhooked ${e.target}`;

        case "HEAL_25":
            return `${e.healer} healed ${e.target} (25%)`;

        case "GEN_25":
            return `${e.by} repaired Generator #${e.genId} (${e.progress}%)`;

        case "GEN_COMPLETE":
            return `Generator #${e.genId} completed`;

        case "GATES_POWERED":
            return `Exit gates powered`;

        case "ESCAPE_GATE":
            return `${e.who} escaped through gate`;

        case "ESCAPE_HATCH":
            return `${e.who} escaped through hatch`;

        case "SACRIFICE":
            return `${e.target} was sacrificed`;

        case "KILLED_ENDGAME":
            return `${e.target} died during endgame`;

        default:
            return e.type;
    }
}