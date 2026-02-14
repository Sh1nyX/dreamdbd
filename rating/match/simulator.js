//MATCH SIMULATOR (TO BE FINISHED)

const ROLES = ["runner", "altruist", "medic", "engineer"];

const generators = Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    progress: 0,
    completed: false
}));

//UTILS LOGIC

function rand(min, max)
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(p)
{
    return Math.random() < p;
}

function pick(arr)
{
    return arr[Math.floor(Math.random() * arr.length)];
}

function log(events, type, payload = {})
{
    events.push({ time: events.length, type, ...payload });
}

//SURVIVORS LOGIC

function createSurvivors()
{
    return ROLES.map(role => ({
        id: crypto.randomUUID(),
        role,
        state: "HEALTHY", // HEALTHY | INJURED | DOWNED | HOOKED | DEAD | ESCAPED
        hooks: 0,
        enduranceOnHit: chance(0.25),
        healingProgress: 0,
        currentGenId: null
    }));
}

//CHASE HELPERS LOGIC

function startChase(events, target)
{
    log(events, "CHASE_START", { target: target.role });

    return {
        targetId: target.id,
        targetRole: target.role,
        remainingHits: rand(1, 3),
        startIndex: events.length
    };
}

function endChase(events, chase, escaped = false)
{
    if (!chase) return;

    if (escaped)
    {
        log(events, "CHASE_ESCAPED", { target: chase.targetRole });
    }

    log(events, "CHASE_END",
        {
        target: chase.targetRole,
        duration: events.length - chase.startIndex
    });
}

//SIMULATION LOGIC

export function simulateMatch()
{
    const events = [];
    const survivors = createSurvivors();

    let currentChase = null;
    let gensDone = 0;

    for (let tick = 0; tick < rand(50, 90); tick++) {
        const alive = survivors.filter(s => !["DEAD", "ESCAPED"].includes(s.state));
        if (!alive.length) break;

        //CHASE START LOGIC

        if (!currentChase && chance(0.35))
        {
            const target = pick(
                alive.filter(s => !["DOWNED", "HOOKED"].includes(s.state))
            );
            if (target)
            {
                currentChase = startChase(events, target);
            }
        }

        //CHASE LOGIC

        if (currentChase)
        {
            const target = survivors.find(s => s.id === currentChase.targetId);

            if (!target || ["DEAD", "HOOKED"].includes(target.state))
            {
                endChase(events, currentChase);
                currentChase = null;
                continue;
            }

            // HIT LOGIC

            log(events, "HIT", { target: target.role });

            if (target.state === "INJURED" && target.enduranceOnHit)
            {
                target.enduranceOnHit = false;
                log(events, "ENDURANCE_TRIGGERED", { target: target.role });
            }
            else if (target.state === "HEALTHY")
            {
                target.state = "INJURED";
            }
            else
            {
                target.state = "DOWNED";
                log(events, "DOWN", { target: target.role });

                endChase(events, currentChase);
                currentChase = null;

                if (chance(0.8))
                {
                    log(events, "PICKUP", { target: target.role });

                    target.hooks++;
                    target.state = "HOOKED";
                    log(events, "HOOK", { target: target.role });

                    if (target.hooks >= 3)
                    {
                        target.state = "DEAD";
                        log(events, "SACRIFICE", { target: target.role });
                    }
                }
                continue;
            }

            currentChase.remainingHits--;

            if (currentChase.remainingHits <= 0)
            {
                endChase(events, currentChase, true);
                currentChase = null;
            }


            //REPAIRING GENERATORS DURING CHASE LOGIC

            const workers = survivors.filter(s =>
                s.id !== target.id &&
                s.state === "HEALTHY"
            );

            workers.forEach(worker =>
            {
                if (worker.role === "altruist") return;

                if (worker.role === "medic" && survivors.some(s => s.state === "INJURED"))
                    return;

                let gen =
                    generators.find(g => g.id === worker.currentGenId && !g.completed) ??
                    pick(generators.filter(g => !g.completed));

                if (!gen) return;

                worker.currentGenId = gen.id;

                gen.progress += 25;

                log(events, "GEN_25",
                    {
                    by: worker.role,
                    genId: gen.id,
                    progress: gen.progress
                });

                if (gen.progress >= 100)
                {
                    gen.completed = true;
                    gensDone++;
                    worker.currentGenId = null;

                    log(events, "GEN_COMPLETE",
                        {
                        genId: gen.id,
                        by: worker.role
                    });
                }
            });
        }

        //UNHOOK LOGIC


        if (!currentChase)
        {
            const hooked = survivors.find(s => s.state === "HOOKED");

            if (hooked)
            {
                const altruist = survivors.find(
                    s => s.role === "altruist" && s.state === "HEALTHY"
                );

                const fallback = survivors.find(
                    s => s.state === "HEALTHY" && s.id !== hooked.id
                );

                const rescuer = altruist ?? fallback;
                const chanceRescue = altruist ? 0.85 : 0.55;

                if (rescuer && chance(chanceRescue))
                {
                    hooked.state = "INJURED";
                    log(events, "UNHOOK",
                        {
                        by: rescuer.role,
                        target: hooked.role
                    });
                }
            }
        }

        //HEALING PROCESS LOGIC

        if (!currentChase)
        {
            const medic = survivors.find(
                s => s.role === "medic" && s.state === "HEALTHY"
            );
            const injured = survivors.find(s => s.state === "INJURED");

            if (medic && injured && chance(0.45))
            {
                medic.healingProgress += 25;

                log(events, "HEAL_25",
                    {
                    healer: medic.role,
                    target: injured.role
                });

                if (medic.healingProgress >= 100)
                {
                    injured.state = "HEALTHY";
                    medic.healingProgress = 0;

                    log(events, "HEAL_COMPLETE",
                        {
                        healer: medic.role,
                        target: injured.role
                    });
                }
            }
        }
    }

    //ENDGAME LOGIC

    const alive = survivors.filter(s => s.state !== "DEAD");

    if (gensDone < 5)
    {
        alive.forEach(s => {
            s.state = "DEAD";
            log(events, "SACRIFICE", { target: s.role });
        });
        return { events, survivors };
    }

    log(events, "GATES_POWERED");

    const free = alive.filter(s => !["HOOKED", "DOWNED"].includes(s.state));

    if (free.length >= 2)
    {
        free.forEach(s =>
        {
            s.state = "ESCAPED";
            log(events, "ESCAPE_GATE", { who: s.role });
        });
    }
    else if (free.length === 1)
    {
        const s = free[0];
        s.state = "ESCAPED";
        log(events, chance(0.5) ? "ESCAPE_HATCH" : "ESCAPE_GATE", { who: s.role });
    }

    alive
        .filter(s => ["HOOKED", "DOWNED"].includes(s.state))
        .forEach(s =>
        {
            s.state = "DEAD";
            log(events, "SACRIFICE", { target: s.role });
        });

    return { events, survivors };
}
