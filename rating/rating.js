import { simulateMatch } from "./match/simulator.js";
import { scoreKiller } from "./scoring/killerScoring.js";
import { scoreSurvivors } from "./scoring/survivorScoring.js";
import { buildKillerReport } from "./scoring/aggregators.js";
import { renderReport } from "./ui/renderReport.js";
import { renderActionLog } from "./ui/renderLog.js";
import { scoreKillerEvent } from "./scoring/killerScoring.js";

let currentMatch = null;
let survivorBuildLocks = null;
let activeMapMode = "KILLER";

const SURV_COLORS = ["#ffd93b", "#ff6b6b", "#4dabf7", "#63e6be"];

let survivorPerkBan =
    {
    user: {
        hex: null,
        gen: null,
        block: null
    },
    allies: [],
    resolved: {
        hex: null,
        gen: null,
        block: null
    }
};

class Countdown
{
    constructor(onFinish)
    {
        this.value = 3;
        this.el = document.getElementById("countdownNumber");
        this.onFinish = onFinish;
        this.start();
    }

    start()
    {
        const interval = setInterval(() =>
        {
            this.value--;
            this.el.textContent = this.value;

            if (this.value === 0)
            {
                clearInterval(interval);
                document.getElementById("countdownScreen").classList.add("hidden");
                this.onFinish();
            }
        }, 1000);
    }
}

class PerkService {

    static async loadSurvivorPerksForBan()
    {
        const data = await fetch("data/perks.json").then(r => r.json());

        const allowedTypes = ["exaust", "secondchance", "boon"];

        return data.filter(perk =>
            perk.role === "Survivor" &&
            allowedTypes.includes(perk.type)
        );
    }

    static async loadKillerPerksForPick()
    {
        const data = await fetch("data/perks.json").then(r => r.json());

        return data.filter(perk =>
            perk.role === "Killer"
        );
    }
}

class PerkGrid
{
    constructor(containerId)
    {
        this.container = document.getElementById(containerId);
        this.perks = [];
        this.page = 0;
        this.perPage = 28;
        this.selectedByType = {};
    }

    setPerks(perks)
    {
        this.perks = perks;
        this.render();
    }

    render()
    {
        this.container.innerHTML = "";

        const start = this.page * this.perPage;
        const current = this.perks.slice(start, start + this.perPage);

        current.forEach(perk =>
        {
            const perkDiv = document.createElement("div");
            perkDiv.className = "perk";
            perkDiv.dataset.type = perk.type;
            perkDiv.dataset.name = perk.name;

            const img = document.createElement("img");
            img.src = perk.icon;
            img.alt = perk.name;

            perkDiv.appendChild(img);

            this.applyVisualState(perkDiv, perk);

            perkDiv.addEventListener("click", () =>
            {
                this.togglePerk(perk);
            });

            this.container.appendChild(perkDiv);
        });

        this.applySoftLock();
    }

    applySoftLock()
    {
        const limitReached = Object.keys(this.selectedByType).length >= 3;

        this.container.querySelectorAll(".perk").forEach(div =>
        {
            const type = div.dataset.type;
            const name = div.dataset.name;

            if (!limitReached) return;

            if (this.selectedByType[type] !== name)
            {
                div.classList.add("locked-soft");
            }
        });
    }

    togglePerk(perk)
    {
        const type = perk.type;
        const slot = document.querySelector(`.selected-slot[data-type="${type}"]`);

        if (!slot) return;

        if (this.selectedByType[type] === perk.name)
        {
            slot.innerHTML = "";
            delete this.selectedByType[type];
            this.updateGrid();
            return;
        }

        if (this.selectedByType[type]) return;

        slot.innerHTML = "";

        const img = document.createElement("img");
        img.src = perk.icon;
        img.alt = perk.name;

        slot.appendChild(img);
        this.selectedByType[type] = perk.name;

        this.updateGrid();
    }

    updateGrid()
    {
        this.container.querySelectorAll(".perk").forEach(div =>
        {
            const type = div.dataset.type;
            const name = div.dataset.name;

            div.classList.remove("locked", "selected");

            if (this.selectedByType[type])
            {
                if (this.selectedByType[type] === name)
                {
                    div.classList.add("selected");
                }
                else
                {
                    div.classList.add("locked");
                }
            }
        });
    }

    applyVisualState(div, perk)
    {
        const selected = this.selectedByType[perk.type];

        if (!selected) return;

        if (selected === perk.name)
        {
            div.classList.add("selected");
        }
        else
        {
            div.classList.add("locked");
        }
    }
}

class Pagination
{
    constructor(containerId, grid)
    {
        this.container = document.getElementById(containerId);
        this.grid = grid;
        this.total = 0;
    }

    render(total)
    {
        this.total = total;
        this.draw();
    }

    draw()
    {
        this.container.innerHTML = "";

        const pages = Math.ceil(this.total / this.grid.perPage);

        for (let i = 0; i < pages; i++)
        {
            const btn = document.createElement("button");
            btn.textContent = i + 1;

            if (i === this.grid.page)
                btn.classList.add("active");

            btn.addEventListener("click", () =>
            {
                this.grid.page = i;
                this.grid.render();
                this.draw();
            });

            this.container.appendChild(btn);
        }
    }
}

async function initSurvivorBanScene(onFinish)
{
    document.getElementById("roleScreen").classList.add("hidden");
    document.getElementById("perkScreen").classList.remove("hidden");

    const banBtn = document.getElementById("banBtn");
    banBtn.classList.remove("hidden");
    banBtn.disabled = false;

    document.getElementById("goBtn").classList.add("hidden");

    document.getElementById("perkGrid").innerHTML = "";
    document.getElementById("pagination").innerHTML = "";
    document.getElementById("selectedPerks").innerHTML = "";

    createSurvivorBanSlots();

    const data = await fetch("data/perks.json").then(r => r.json());
    const perks = data.filter(p => p.role === "Killer" && ["hex", "gen", "block"].includes(p.type));

    renderSurvivorBanGrid(perks, onFinish);
}

function renderSurvivorBanGrid(perks, onFinish)
{
    const grid = document.getElementById("perkGrid");
    const banBtn = document.getElementById("banBtn");

    const selected = {};

    perks.forEach(perk =>
    {
        const div = document.createElement("div");
        div.className = "perk";
        div.dataset.name = perk.name;
        div.dataset.type = perk.type;

        const img = document.createElement("img");
        img.src = perk.icon;
        img.alt = perk.name;
        div.appendChild(img);

        div.addEventListener("click", () =>
        {
            const type = perk.type;
            const slot = document.querySelector(
                `.selected-slot.survivor[data-row="0"][data-type="${type}"]`
            );

            if (selected[type]?.name === perk.name)
            {
                slot.innerHTML = "";
                delete selected[type];
                updateSurvivorBanVisuals(selected);
                return;
            }

            if (selected[type]) return;

            slot.innerHTML = `<img src="${perk.icon}" alt="${perk.name}">`;
            selected[type] = perk;

            updateSurvivorBanVisuals(selected);
        });

        grid.appendChild(div);
    });

    const cleanBtn = banBtn.cloneNode(true);
    banBtn.parentNode.replaceChild(cleanBtn, banBtn);

    cleanBtn.addEventListener("click", () =>
    {
        if (Object.keys(selected).length !== 3) return;
        playSurvivorBanScene(selected, perks, onFinish);
    });
}

function updateSurvivorBanVisuals(selected)
{
    document.querySelectorAll("#perkGrid .perk").forEach(div =>
    {
        const type = div.dataset.type;
        const name = div.dataset.name;

        div.classList.remove("selected", "locked-soft");

        if (!selected[type]) return;

        if (selected[type].name === name)
        {
            div.classList.add("selected");
        }
        else
        {
            div.classList.add("locked-soft");
        }
    });
}

function playSurvivorBanScene(userPick, perks, onFinish)
{
    const banBtn = document.getElementById("banBtn");
    banBtn.disabled = true;

    setTimeout(() =>
    {
        const allies = generateAllyVotes(perks);

        allies.forEach((ally, i) =>
        {
            Object.values(ally).forEach(perk => {
                const perkEl = document.querySelector(`.perk[data-name="${perk.name}"]`);

                if (perkEl) perkEl.classList.add(`ally-${i + 1}`);

                const slot = document.querySelector(
                    `.selected-slot.survivor[data-row="${i + 1}"][data-type="${perk.type}"]`);

                if (slot) slot.innerHTML = `<img src="${perk.icon}" alt="${perk.name}">`;
            });
        });

        setTimeout(() =>
        {
            resolveSurvivorBan(userPick, allies, onFinish);
        }, 3000);

    }, 2000);
}

function resolveSurvivorBan(userPick, allies, onFinish)
{
    const bannedPerks = [];

    document.querySelectorAll(".selected-slot").forEach(slot =>
    {
        slot.classList.remove("vote-winner", "lost-vote");
    });

    document.querySelectorAll(".perk").forEach(p =>
        p.classList.add("locked-soft")
    );

    ["hex", "gen", "block"].forEach(type =>
    {
        const votes = [
            userPick[type],
            ...allies.map(a => a[type])
        ];

        const winner = resolveVotes(votes);
        bannedPerks.push(winner);

        const slots = document.querySelectorAll(
            `.selected-slot[data-type="${type}"]`
        );

        slots.forEach(slot =>
        {
            const img = slot.querySelector("img");
            if (!img) return;

            if (img.alt === winner.name)
            {
                slot.classList.add("vote-winner");
            }
            else
            {
                slot.classList.add("lost-vote");
            }
        });
    });

    setTimeout(() =>
    {
        setTimeout(async () =>
        {
            survivorBuildLocks = await generateFakeKillerBansForSurvivor();

            showBlockedModal(
                {
                    title: "The killer blocked these perks for you",
                    subtitle: "Go try survive with that",
                    perks: survivorBuildLocks
                },
                onFinish
            );
        }, 10);
    }, 3000);
}

function generateAllyVotes(perks)
{
    const types = ["hex", "gen", "block"];

    return Array.from({ length: 3 }, () =>
    {
        const pick = {};
        types.forEach(type =>
        {
            const pool = perks.filter(p => p.type === type);
            pick[type] = pool[Math.floor(Math.random() * pool.length)];
        });
        return pick;
    });
}

function resolveVotes(list)
{
    const count = new Map();

    list.forEach(p =>
    {
        count.set(p.name, (count.get(p.name) || 0) + 1);
    });

    const max = Math.max(...count.values());
    const winners = [...count.entries()]
        .filter(([, v]) => v === max)
        .map(([name]) => list.find(p => p.name === name));

    return winners[Math.floor(Math.random() * winners.length)];
}

async function generateFakeKillerBansForSurvivor()
{
    const data = await fetch("data/perks.json").then(r => r.json());

    const categories = ["boon", "exaust", "secondchance"];

    return categories.map(type =>
    {
        const pool = data.filter(p =>
            p.role === "Survivor" && p.type === type
        );
        return pool[Math.floor(Math.random() * pool.length)];
    });
}

function createSurvivorBanSlots()
{
    const container = document.getElementById("selectedPerks");
    const rows = ["YOU", "ALLY 1", "ALLY 2", "ALLY 3"];

    rows.forEach((label, rowIndex) =>
    {
        const row = document.createElement("div");
        row.className = "ban-row";

        const tag = document.createElement("div");
        tag.className = "ban-label";
        tag.textContent = label;
        row.appendChild(tag);

        ["hex", "gen", "block"].forEach(type =>
        {
            const slot = document.createElement("div");
            slot.className = "selected-slot survivor";
            slot.dataset.type = type;
            slot.dataset.row = rowIndex;
            row.appendChild(slot);
        });

        container.appendChild(row);
    });
}

async function initKillerPhase()
{
    document.getElementById("perkGrid").innerHTML = "";
    document.getElementById("selectedPerks").innerHTML = "";
    document.getElementById("pagination").innerHTML = "";

    document.getElementById("banBtn").classList.add("hidden");
    document.getElementById("goBtn").classList.remove("hidden");

    for (let i = 0; i < 4; i++)
    {
        const slot = document.createElement("div");
        slot.className = "selected-slot killer";
        document.getElementById("selectedPerks").appendChild(slot);
    }

    const perks = await PerkService.loadKillerPerksForPick();

    const lockedMap = pickRandomLocked(perks);
    const lockedPerks = perks.filter(p => lockedMap[p.name]);

    showBlockedModal(lockedPerks, () =>
    {
        const grid = new KillerPerkGrid("perkGrid", lockedMap);
        const pagination = new Pagination("pagination", grid);

        grid.setPerks(perks);
        pagination.render(perks.length);
    });
}

function pickRandomLocked(perks)
{
    const locked = {};

    ["hex", "gen", "block"].forEach(type =>
    {
        const pool = perks.filter(p => p.type === type);
        if (!pool.length) return;

        const perk = pool[Math.floor(Math.random() * pool.length)];
        locked[perk.name] = true;
    });

    return locked;
}

class KillerPerkGrid
{
    constructor(containerId, locked)
    {
        this.container = document.getElementById(containerId);
        this.locked = locked;

        this.perks = [];
        this.page = 0;
        this.perPage = 28;

        this.selected = new Map();
        this.max = 4;
    }

    setPerks(perks)
    {
        this.perks = perks;
        this.render();
    }

    render()
    {
        this.container.innerHTML = "";

        const start = this.page * this.perPage;
        const current = this.perks.slice(start, start + this.perPage);

        current.forEach(perk =>
        {
            const div = document.createElement("div");
            div.className = "perk";
            div.dataset.name = perk.name;

            if (this.locked[perk.name])
            {
                div.classList.add("locked");
            }

            if (this.selected.has(perk.name))
            {
                div.classList.add("selected");
            }

            const img = document.createElement("img");
            img.src = perk.icon;
            img.alt = perk.name;

            div.appendChild(img);

            if (!this.locked[perk.name])
            {
                div.addEventListener("click", () => this.togglePerk(perk, div));
            }

            this.container.appendChild(div);
        });

        this.applySoftLock();
    }

    applySoftLock()
    {
        if (this.selected.size < this.max) return;

        this.container.querySelectorAll(".perk").forEach(div =>
        {
            const name = div.dataset.name;

            if (this.locked[name]) return;

            if (!this.selected.has(name))
            {
                div.classList.add("locked-soft");
            }
        });
    }

    togglePerk(perk, perkDiv)
    {
        if (this.selected.has(perk.name)) {
            const slot = this.selected.get(perk.name);
            slot.innerHTML = "";
            this.selected.delete(perk.name);
            this.updateVisuals();
            return;
        }

        if (this.selected.size >= this.max) return;

        const slots = document.querySelectorAll(".selected-slot.killer");
        const free = [...slots].find(s => !s.firstChild);
        if (!free) return;

        const img = document.createElement("img");
        img.src = perk.icon;
        img.alt = perk.name;

        free.appendChild(img);
        this.selected.set(perk.name, free);

        this.updateVisuals();
    }

    updateVisuals()
    {
        this.container.querySelectorAll(".perk").forEach(div =>
        {
            const name = div.dataset.name;

            div.classList.remove("selected", "locked-soft");

            if (this.locked[name]) return;

            if (this.selected.has(name))
            {
                div.classList.add("selected");
            }
            else if (this.selected.size >= this.max)
            {
                div.classList.add("locked-soft");
            }
        });
    }


}

class SurvivorBuildGrid
{
    constructor(containerId, locked) {
        this.container = document.getElementById(containerId);
        this.locked = locked;

        this.perks = [];
        this.page = 0;
        this.perPage = 28;

        this.selected = new Map();
        this.max = 4;
    }

    setPerks(perks)
    {
        this.perks = perks;
        this.render();
    }

    render()
    {
        this.container.innerHTML = "";

        const start = this.page * this.perPage;
        const current = this.perks.slice(start, start + this.perPage);

        current.forEach(perk =>
        {

            const div = document.createElement("div");
            div.className = "perk";
            div.dataset.name = perk.name;

            if (this.locked[perk.name])
            {
                div.classList.add("locked");
            }

            if (this.selected.has(perk.name))
            {
                div.classList.add("selected");
            }

            const img = document.createElement("img");
            img.src = perk.icon;
            img.alt = perk.name;

            div.appendChild(img);

            if (!this.locked[perk.name])
            {
                div.addEventListener("click", () => this.togglePerk(perk, div));
            }

            this.container.appendChild(div);

            this.applySoftLock();
        });
    }

    applySoftLock()
    {
        if (this.selected.size < this.max) return;

        this.container.querySelectorAll(".perk").forEach(div =>
        {
            const name = div.dataset.name;

            if (this.locked[name]) return;

            if (!this.selected.has(name))
            {
                div.classList.add("locked-soft");
            }
        });
    }

    togglePerk(perk, perkDiv)
    {

        if (this.selected.has(perk.name))
        {
            const slot = this.selected.get(perk.name);
            slot.innerHTML = "";
            this.selected.delete(perk.name);
            this.updateVisuals();
            return;
        }

        if (this.selected.size >= this.max) return;

        const slots = document.querySelectorAll(".selected-slot.survivor-build");
        const free = [...slots].find(s => !s.firstChild);
        if (!free) return;

        const img = document.createElement("img");
        img.src = perk.icon;
        img.alt = perk.name;

        free.appendChild(img);
        this.selected.set(perk.name, free);

        this.updateVisuals();
    }

    updateVisuals()
    {
        this.container.querySelectorAll(".perk").forEach(div =>
        {

            const name = div.dataset.name;

            div.classList.remove("selected", "locked-soft");

            if (this.locked[name]) return;

            if (this.selected.has(name))
            {
                div.classList.add("selected");
            }
            else if (this.selected.size >= this.max)
            {
                div.classList.add("locked-soft");
            }
        });
    }
}

async function initSurvivorBuildPick()
{

    document.getElementById("perkGrid").innerHTML = "";
    document.getElementById("selectedPerks").innerHTML = "";
    document.getElementById("pagination").innerHTML = "";

    document.getElementById("banBtn").classList.add("hidden");
    document.getElementById("goBtn").classList.add("hidden");
    document.getElementById("goSurvBtn").classList.remove("hidden");

    for (let i = 0; i < 4; i++)
    {
        const slot = document.createElement("div");
        slot.className = "selected-slot survivor-build";
        document.getElementById("selectedPerks").appendChild(slot);
    }

    const data = await fetch("data/perks.json").then(r => r.json());
    const perks = data.filter(p => p.role === "Survivor");

    const lockedMap = {};
    survivorBuildLocks.forEach(p =>
    {
        lockedMap[p.name] = true;
    });

    const grid = new SurvivorBuildGrid("perkGrid", lockedMap);
    const pagination = new Pagination("pagination", grid);

    grid.setPerks(perks);
    pagination.render(perks.length);
}

function showBlockedModal(data, onContinue)
{
    const modal = document.getElementById("blockedModal");
    const titleEl = document.getElementById("blockedTitle");
    const subtitleEl = document.getElementById("blockedSubtitle");
    const container = document.getElementById("blockedPerks");
    const btn = document.getElementById("blockedContinue");

    let title = "";
    let subtitle = "";
    let perks = [];

    if (Array.isArray(data))
    {
        title = "The survivors blocked these perks for you";
        subtitle = "Go punish them for this";
        perks = data;
    }
    else
    {
        title = data.title;
        subtitle = data.subtitle;
        perks = data.perks;
    }

    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;

    container.innerHTML = "";

    perks.forEach(perk =>
    {
        const div = document.createElement("div");
        div.className = "perk";

        const img = document.createElement("img");
        img.src = perk.icon;
        img.alt = perk.name;

        div.appendChild(img);
        container.appendChild(div);
    });

    modal.classList.remove("hidden");

    const cleanBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(cleanBtn, btn);

    cleanBtn.addEventListener("click", () =>
    {
        modal.classList.add("hidden");
        if (onContinue) onContinue();
    });
}

const MapVotingState =
    {
    phase: "KILLER_BAN",
    maps: [],
    tempSelection: new Set(),
    killerBans: new Set(),
    survivorBans: new Set(),
    killerPicks: new Set(),
    survivorPicks: new Set(),
    isLocked: false
};

const SurvivorMapVotingState =
    {
    phase: "KILLER_BAN_WAIT",
    maps: [],
    killerBans: new Set(),
    killerPicks: new Set(),

    votes:
        {
        user: new Set(),
        allies: [new Set(), new Set(), new Set()]
    },

    resolvedBans: new Set(),
    resolvedPicks: new Set(),
    tempWinners: new Set(),

    isLocked: false
};

function renderMapPhase()
{
    const grid = document.getElementById("mapGrid");
    const title = document.getElementById("mapPhaseTitle");

    grid.innerHTML = "";
    title.textContent = getPhaseTitle();

    MapVotingState.maps.forEach(realm =>
    {
        const card = document.createElement("div");
        card.className = "map-card";
        card.dataset.id = realm.id;

        const img = document.createElement("img");
        img.src = realm.image;
        img.alt = realm.name;

        card.appendChild(img);
        applyMapState(card, realm.id);
        card.addEventListener("click", () => onMapClick(realm.id));

        grid.appendChild(card);
    });

    updateConfirmButton();
}

function renderSurvivorMapPhase()
{

    const grid = document.getElementById("mapGrid");
    grid.innerHTML = "";

    const title = document.getElementById("mapPhaseTitle");
    title.textContent = getSurvivorPhaseTitle();

    SurvivorMapVotingState.maps.forEach(realm =>
    {

        const card = document.createElement("div");
        card.className = "map-card";
        card.dataset.id = realm.id;

        const img = document.createElement("img");
        img.src = realm.image;

        card.appendChild(img);

        applySurvivorMapState(card, realm.id);

        card.addEventListener("click", () =>
        {

            if (SurvivorMapVotingState.phase === "SURV_SELECT")
                return onSurvivorMapClick(realm.id);

            if (SurvivorMapVotingState.phase === "SURV_PICK_SELECT")
                return onSurvivorMapPickClick(realm.id);

        });

        grid.appendChild(card);
    });
}

function getPhaseTitle()
{
    switch (MapVotingState.phase)
    {
        case "KILLER_BAN":
            return "Killer bans 4 realms";

        case "SURV_BAN":
            return "Survivors ban 4 realms";

        case "KILLER_PICK":
            return "Killer selects 2 realms";

        case "SURV_PICK":
            return "Survivors select 2 realms";

        case "FINAL":
            return "Choosing the trial location…";

        case "SURV_BAN_WAIT":
            return "Survivors ban 4 realms";

        case "SURV_PICK_WAIT":
            return "Survivors select 2 realms";

        default:
            return "";
    }
}

function getSurvivorPhaseTitle()
{

    const p = SurvivorMapVotingState.phase;

    if (p === "SURV_SELECT" || p === "ALLY_REVEAL" || p === "CLEAN" || p === "PREBAN" || p === "RESULT")
        return "Survivors ban 4 realms";

    if (p === "SURV_PICK_SELECT" || p === "ALLY_REVEAL_PICK" || p === "PREPICK")
        return "Survivors pick 2 realms";

    if (p === "KILLER_PICK_WAIT")
        return "Killer picks 2 realms";

    if (p === "RESULT_PICK")
        return "Choosing the trial location…";

    return "Waiting for killer...";
}

function applyMapState(card, id)
{
    const s = MapVotingState;

    if (s.killerBans.has(id) || s.survivorBans.has(id))
    {
        card.classList.add("banned", "disabled");
        return;
    }

    if (s.phase === "FINAL")
    {
        if (!s.killerPicks.has(id) && !s.survivorPicks.has(id))
        {
            card.classList.add("banned", "disabled");
            return;
        }
    }

    if (s.killerPicks.has(id))
    {
        card.classList.add("killer-pick");
    }

    if (s.survivorPicks.has(id))
    {
        card.classList.add("survivor-pick");
    }

    if (s.tempSelection.has(id))
    {
        card.classList.add("selecting");
    }

    if (s.phase === "SURV_PICK" && s.killerPicks.has(id))
    {
        card.classList.add("disabled");
    }
}

function applySurvivorMapState(card, id)
{

    const s = SurvivorMapVotingState;

    card.style.boxShadow = "";
    card.classList.remove("disabled");

    if (s.killerBans.has(id))
    {
        card.classList.add("banned", "disabled");
        return;
    }

    if (s.phase === "SURV_PICK_SELECT" && s.killerPicks.has(id))
    {
        card.style.boxShadow = "0 0 0 4px red";
        return;
    }

    if (s.killerPicks.has(id))
    {
        card.style.boxShadow = "0 0 0 4px red";
    }

    if (s.resolvedBans.has(id))
    {
        card.classList.add("banned");
        return;
    }

    if (s.phase === "SURV_PICK_SELECT" || s.phase === "ALLY_REVEAL_PICK")
    {

        let shadows = [];

        if (s.killerPicks.has(id))
        {
            shadows.push("0 0 0 4px red");
        }

        if (s.votes.user.has(id))
        {
            shadows.push(`0 0 0 6px ${SURV_COLORS[0]}`);
        }

        s.votes.allies.forEach((set,i)=>
        {
            if (set.has(id))
            {
                shadows.push(`0 0 0 ${8+i*2}px ${SURV_COLORS[i+1]}`);
            }
        });

        card.style.boxShadow = shadows.join(",");
        return;
    }

    if (s.phase === "SURV_SELECT" || s.phase === "ALLY_REVEAL")
    {

        let shadows = [];

        if (s.votes.user.has(id))
        {
            shadows.push(`0 0 0 4px ${SURV_COLORS[0]}`);
        }

        s.votes.allies.forEach((set,i)=>
        {
            if (set.has(id))
            {
                shadows.push(`0 0 0 ${6+i*2}px ${SURV_COLORS[i+1]}`);
            }
        });

        card.style.boxShadow = shadows.join(",");
        return;
    }

    if (s.phase === "PREBAN")
    {
        if (s.tempWinners.has(id))
        {
            card.style.boxShadow = "0 0 0 6px red";
        }
        return;
    }

    if (s.phase === "PREPICK")
    {
        if (s.tempWinners.has(id))
        {
            card.style.boxShadow = "0 0 0 6px dodgerblue";
        }
        return;
    }

    if (s.phase === "RESULT")
    {
        if (s.resolvedBans.has(id))
        {
            card.classList.add("banned");
        }
        return;
    }

    if (s.phase === "RESULT_PICK")
    {

        if (s.killerPicks.has(id))
        {
            card.style.boxShadow = "0 0 0 4px red";
        }

        if (s.resolvedPicks.has(id))
        {
            card.style.boxShadow = "0 0 0 6px dodgerblue";
        }

        return;
    }
}

function getSurvivorMapById(id)
{
    return SurvivorMapVotingState.maps.find(m => m.id === id);
}

function getMapById(id)
{
    return MapVotingState.maps.find(m => m.id === id);
}

function spinSlot(container, items, onFinish)
{
    container.innerHTML = "";

    const reel = document.createElement("div");
    reel.style.position = "absolute";
    reel.style.top = "0";
    reel.style.width = "100%";

    const ITEM_HEIGHT = 150;
    const SPIN_DURATION = 3000;

    const extended = [...items, ...items, ...items];

    extended.forEach(item =>
    {
        const div = document.createElement("div");
        div.className = "slot-item";

        const img = document.createElement("img");
        img.src = item.image;
        img.alt = item.name;

        div.appendChild(img);
        reel.appendChild(div);
    });

    container.appendChild(reel);

    const start = performance.now();
    const totalDistance = ITEM_HEIGHT * items.length * 2;
    const chosenIndex = Math.floor(Math.random() * items.length);
    const finalOffset = ITEM_HEIGHT * chosenIndex;

    function easeOutCubic(t)
    {
        return 1 - Math.pow(1 - t, 3);
    }

    function animate(now)
    {
        const elapsed = now - start;
        const progress = Math.min(elapsed / SPIN_DURATION, 1);
        const eased = easeOutCubic(progress);

        const current = -(totalDistance * eased + finalOffset);
        reel.style.transform = `translateY(${current}px)`;

        if (progress < 1)
        {
            requestAnimationFrame(animate);
        }
        else
        {
            reel.style.transform = `translateY(-${finalOffset}px)`;
            onFinish(items[chosenIndex]);
        }
    }

    requestAnimationFrame(animate);
}

function spinVariations(realm)
{
    const slot = document.getElementById("variationSlot");

    if (!realm.variations || realm.variations.length <= 1)
    {
        slot.innerHTML = `
            <div class="slot-item">
                <img src="${realm.image}">
            </div>
        `;
        return;
    }

    spinSlot(slot, realm.variations.map(v => ({image: v.image, name: v.name})), () => {});
}

function showCasinoModal()
{
    document.getElementById("casinoModal").classList.remove("hidden");

    const realmCandidates =
        [
        ...MapVotingState.killerPicks,
        ...MapVotingState.survivorPicks
    ];

    spinSlot(
        document.getElementById("realmSlot"),
        realmCandidates.map(id => getMapById(id)),
        selectedRealm =>
        {
            spinVariations(selectedRealm);
        }
    );
}

function closeCasinoModal()
{
    document.getElementById("casinoModal").classList.add("hidden");
}

function onMapClick(realmId)
{

    if (activeMapMode !== "KILLER") return;

    const s = MapVotingState;
    if (MapVotingState.isLocked) return;

    let limit = 0;

    if (s.phase === "KILLER_BAN" || s.phase === "SURV_BAN") limit = 4;
    if (s.phase === "KILLER_PICK" || s.phase === "SURV_PICK") limit = 2;

    if (s.tempSelection.has(realmId))
    {
        s.tempSelection.delete(realmId);
    }
    else if (s.tempSelection.size < limit)
    {
        s.tempSelection.add(realmId);
    }

    renderMapPhase();
}

async function nextMapPhase()
{
    if (activeMapMode !== "KILLER") return;

    const s = MapVotingState;
    const selected = [...s.tempSelection];
    s.tempSelection.clear();
    document.getElementById("mapActionBtn").disabled = true;

    if (s.phase === "KILLER_BAN")
    {
        selected.forEach(id => s.killerBans.add(id));

        renderMapPhase();
        await fakeSurvivorBan();

        s.phase = "KILLER_PICK";
        renderMapPhase();
        return;
    }

    if (s.phase === "KILLER_PICK")
    {
        selected.forEach(id => s.killerPicks.add(id));

        renderMapPhase();
        await fakeSurvivorPick();

        s.phase = "FINAL";
        renderMapPhase();
        await sleep(3000);
        showCasinoModal();
    }
}

async function fakeSurvivorBan()
{
    const s = MapVotingState;
    s.isLocked = true;


    MapVotingState.phase = "SURV_BAN_WAIT";
    renderMapPhase();

    await sleep(3000);

    MapVotingState.phase = "KILLER_PICK";
    renderMapPhase();

    const available = s.maps
        .map(m => m.id)
        .filter(id =>
            !s.killerBans.has(id) &&
            !s.survivorBans.has(id)
        );

    while (s.survivorBans.size < 4 && available.length)
    {
        const idx = Math.floor(Math.random() * available.length);
        s.survivorBans.add(available.splice(idx, 1)[0]);
    }

    s.isLocked = false;
    renderMapPhase();
}

async function fakeSurvivorPick()
{
    const s = MapVotingState;
    s.isLocked = true;

    MapVotingState.phase = "SURV_PICK_WAIT";
    renderMapPhase();

    await sleep(3000);

    MapVotingState.phase = "FINAL";
    renderMapPhase();

    const available = s.maps
        .map(m => m.id)
        .filter(id =>
            !s.killerBans.has(id) &&
            !s.survivorBans.has(id) &&
            !s.killerPicks.has(id)
        );

    while (s.survivorPicks.size < 2 && available.length)
    {
        const idx = Math.floor(Math.random() * available.length);
        s.survivorPicks.add(available.splice(idx, 1)[0]);
    }

    s.isLocked = false;
    renderMapPhase();
}

function updateConfirmButton()
{
    const btn = document.getElementById("mapActionBtn");
    const s = MapVotingState;

    if (s.isLocked || s.phase === "FINAL")
    {
        btn.disabled = true;
        return;
    }

    let needed = s.phase === "KILLER_BAN" ? 4 : 2;
    btn.disabled = s.tempSelection.size !== needed;
}

async function initMapVoting()
{
    document.getElementById("perkScreen").classList.add("hidden");
    document.getElementById("mapScreen").classList.remove("hidden");
    document.getElementById("goSurvBtn").classList.add("hidden");

    activeMapMode = "KILLER";

    const res = await fetch("data/maps.json");
    MapVotingState.maps = await res.json();

    MapVotingState.phase = "KILLER_BAN";

    renderMapPhase();
}

async function initSurvivorMapBan()
{

    document.getElementById("perkScreen").classList.add("hidden");
    document.getElementById("mapScreen").classList.remove("hidden");
    const btn = document.getElementById("mapActionBtn");
    btn.style.display = "block";
    btn.disabled = true;

    activeMapMode = "SURVIVOR";

    const res = await fetch("data/maps.json");
    SurvivorMapVotingState.maps = await res.json();

    SurvivorMapVotingState.phase = "KILLER_BAN_WAIT";

    renderSurvivorMapPhase();

    await sleep(3000);
    fakeKillerMapBanForSurvivors();

    SurvivorMapVotingState.phase = "SURV_SELECT";
    SurvivorMapVotingState.isLocked = false;

    renderSurvivorMapPhase();
    updateSurvivorConfirmButton();
}

function fakeKillerMapBanForSurvivors()
{

    const s = SurvivorMapVotingState;

    const available = s.maps.map(m => m.id);

    while (s.killerBans.size < 4 && available.length)
    {
        const idx = Math.floor(Math.random() * available.length);
        s.killerBans.add(available.splice(idx, 1)[0]);
    }
}

function onSurvivorMapClick(id)
{

    const s = SurvivorMapVotingState;
    if (s.phase !== "SURV_SELECT" || s.isLocked) return;

    toggleFromSet(s.votes.user, id, 4);
    renderSurvivorMapPhase();

    updateSurvivorConfirmButton();
}

function updateSurvivorConfirmButton()
{
    const btn = document.getElementById("mapActionBtn");
    const s = SurvivorMapVotingState;

    if (s.phase !== "SURV_SELECT")
    {
        btn.disabled = true;
        return;
    }

    btn.style.display = "block";
    btn.disabled = s.votes.user.size !== 4;
}

function confirmSurvivorBan()
{

    const s = SurvivorMapVotingState;
    if (s.votes.user.size !== 4) return;

    s.phase = "ALLY_REVEAL";
    s.isLocked = true;

    renderSurvivorMapPhase();

    setTimeout(async () =>
    {

        generateAllyMapVotesSurvivor();
        renderSurvivorMapPhase();

        await sleep(2000);

        resolveSurvivorMapVotes();

    }, 3000);
}

function generateAllyMapVotesSurvivor()
{

    const s = SurvivorMapVotingState;

    const available = s.maps
        .map(m => m.id)
        .filter(id => !s.killerBans.has(id));

    s.votes.allies.forEach(set =>
    {
        while (set.size < 4 && available.length)
        {
            const id = available[Math.floor(Math.random() * available.length)];
            set.add(id);
        }
    });
}

function resolveSurvivorMapVotes()
{

    const s = SurvivorMapVotingState;
    const voteCount = new Map();

    [s.votes.user, ...s.votes.allies].forEach(set =>
    {
        set.forEach(id =>
        {
            voteCount.set(id, (voteCount.get(id) || 0) + 1);
        });
    });

    const winners = [...voteCount.entries()]
        .sort((a,b)=>b[1]-a[1])
        .slice(0,4)
        .map(v=>v[0]);

    s.phase = "CLEAN";
    renderSurvivorMapPhase();

    setTimeout(() =>
    {
        s.tempWinners = new Set(winners);
        s.phase = "PREBAN";
        renderSurvivorMapPhase();

        setTimeout(() =>
        {
            winners.forEach(id => s.resolvedBans.add(id));
            s.tempWinners.clear();

            s.phase = "RESULT";
            renderSurvivorMapPhase();

            setTimeout(()=>
            {
                initSurvivorMapPick();
            },3000);

        }, 2000);

    }, 1000);
}

async function initSurvivorMapPick()
{

    const s = SurvivorMapVotingState;

    s.phase = "KILLER_PICK_WAIT";
    s.votes.user.clear();
    s.votes.allies.forEach(v=>v.clear());
    s.tempWinners.clear();
    s.isLocked = true;

    renderSurvivorMapPhase();

    await sleep(3000);

    fakeKillerMapPickForSurvivor();

    s.phase = "SURV_PICK_SELECT";
    s.isLocked = false;

    renderSurvivorMapPhase();
    updateSurvivorConfirmButtonPick();
}

function fakeKillerMapPickForSurvivor()
{

    const s = SurvivorMapVotingState;

    const available = s.maps
        .map(m=>m.id)
        .filter(id =>
            !s.killerBans.has(id) &&
            !s.resolvedBans.has(id)
        );

    while (s.killerPicks.size < 2 && available.length)
    {
        const idx = Math.floor(Math.random()*available.length);
        s.killerPicks.add(available.splice(idx,1)[0]);
    }
}

function onSurvivorMapPickClick(id)
{

    const s = SurvivorMapVotingState;
    if (s.phase !== "SURV_PICK_SELECT" || s.isLocked || s.killerPicks.has(id))
        return;

    toggleFromSet(s.votes.user, id, 2);
    renderSurvivorMapPhase();

    updateSurvivorConfirmButtonPick();
}

function updateSurvivorConfirmButtonPick()
{

    const btn = document.getElementById("mapActionBtn");
    const s = SurvivorMapVotingState;

    if (s.phase !== "SURV_PICK_SELECT")
    {
        btn.disabled = true;
        return;
    }

    btn.style.display = "block";
    btn.disabled = s.votes.user.size !== 2;
}

function confirmSurvivorPick()
{

    const s = SurvivorMapVotingState;
    if (s.votes.user.size !== 2)
        return;

    s.phase = "ALLY_REVEAL_PICK";
    s.isLocked = true;

    renderSurvivorMapPhase();

    setTimeout(async ()=>
    {

        generateAllyMapVotesPick();
        renderSurvivorMapPhase();

        await sleep(2000);

        resolveSurvivorMapPickVotes();

    },3000);
}

function generateAllyMapVotesPick()
{
    const s = SurvivorMapVotingState;

    s.votes.allies.forEach(v => v.clear());

    const available = s.maps
        .map(m=>m.id)
        .filter(id =>
            !s.killerBans.has(id) &&
            !s.resolvedBans.has(id) &&
            !s.killerPicks.has(id)
        );

    s.votes.allies.forEach(set =>
    {
        while (set.size < 2 && available.length)
        {
            const id = available[Math.floor(Math.random()*available.length)];
            set.add(id);
        }
    });
}

function resolveSurvivorMapPickVotes()
{

    const s = SurvivorMapVotingState;
    const voteCount = new Map();

    [s.votes.user, ...s.votes.allies].forEach(set=>
    {
        set.forEach(id=>{
            voteCount.set(id,(voteCount.get(id)||0)+1);
        });
    });

    const winners = [...voteCount.entries()]
        .sort((a,b)=>b[1]-a[1])
        .slice(0,2)
        .map(v=>v[0]);

    s.tempWinners = new Set(winners);
    s.phase = "PREPICK";
    renderSurvivorMapPhase();

    setTimeout(()=>
    {

        s.votes.user.clear();
        s.votes.allies.forEach(v=>v.clear());

        s.resolvedPicks = new Set(winners);
        s.phase = "RESULT_PICK";

        renderSurvivorMapPhase();

        setTimeout(()=>
        {
            launchSurvivorCasino();
        },3000);

    },2000);
}

function launchSurvivorCasino()
{

    const s = SurvivorMapVotingState;

    document.getElementById("casinoModal").classList.remove("hidden");

    const realmCandidates = [
        ...s.killerPicks,
        ...s.resolvedPicks
    ];

    spinSlot(
        document.getElementById("realmSlot"),
        realmCandidates.map(id => getSurvivorMapById(id)),
        selectedRealm => {
            spinVariations(selectedRealm);
        }
    );
}

function toggleFromSet(set, value, max)
{
    if (set.has(value))
    {
        set.delete(value);
    }
    else if (set.size < max)
    {
        set.add(value);
    }
}

function sleep(ms)
{
    return new Promise(r => setTimeout(r, ms));
}

function showRoleScreen()
{
    document.getElementById("roleScreen").classList.remove("hidden");
}

async function initKillerBan()
{
    document.getElementById("roleScreen").classList.add("hidden");
    document.getElementById("perkScreen").classList.remove("hidden");

    document.getElementById("banBtn").classList.remove("hidden");
    document.getElementById("goBtn").classList.add("hidden");
    document.getElementById("goSurvBtn").classList.add("hidden");

    const perks = await PerkService.loadSurvivorPerksForBan();

    const grid = new PerkGrid("perkGrid");
    const pagination = new Pagination("pagination", grid);

    grid.setPerks(perks);
    pagination.render(perks.length);
}


new Countdown(showRoleScreen);

document
    .getElementById("killerBtn")
    .addEventListener("click", initKillerBan);

document.getElementById("banBtn")
    .addEventListener("click", initKillerPhase);

document.getElementById("goBtn").addEventListener("click", initMapVoting);

document.getElementById("goSurvBtn").addEventListener("click", initSurvivorMapBan);

document.getElementById("mapActionBtn").addEventListener("click", () =>
{

    if (activeMapMode === "SURVIVOR")
    {

        if (SurvivorMapVotingState.phase === "SURV_SELECT")
            return confirmSurvivorBan();

        if (SurvivorMapVotingState.phase === "SURV_PICK_SELECT")
            return confirmSurvivorPick();

        return;
    }

    nextMapPhase();
});

document.getElementById("playBtn").addEventListener("click", () =>
{
    closeCasinoModal();
    document.getElementById("mapScreen").classList.add("hidden");

    currentMatch = simulateMatch();

    console.group("ACTION LOG");
    currentMatch.events.forEach(e => console.log(e));
    console.groupEnd();

    const killerScore = scoreKiller(currentMatch.events, currentMatch.survivors);
    const survivorScores = scoreSurvivors(currentMatch.events, currentMatch.survivors);

    const report = buildKillerReport(killerScore, survivorScores);
    renderReport(report);

    console.log("SURVIVOR SCORES", survivorScores);
});

const logBtn = document.getElementById("logBtn");
const backBtn = document.getElementById("backToResults");

logBtn.addEventListener("click", () =>
{
    if (!currentMatch)
        return;

    document.getElementById("resultScreen").classList.add("hidden");
    document.getElementById("logScreen").classList.remove("hidden");

    renderActionLog(currentMatch.events);
});

backBtn.addEventListener("click", () =>
{
    document.getElementById("logScreen").classList.add("hidden");
    document.getElementById("resultScreen").classList.remove("hidden");
});

document.getElementById("survivorBtn").addEventListener("click", () =>
{
        initSurvivorBanScene(() =>
        {
            initSurvivorBuildPick();
        });
    });

document.getElementById("exitBtn").addEventListener("click", () =>
{
    window.location.href = "/";
});