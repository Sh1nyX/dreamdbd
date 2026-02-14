export function scoreSurvivorEvent(e)
{
    switch (e.type)
    {
        case "GEN_25": return { role: e.by, value: 2.5 };
        case "HEAL_25": return { role: e.healer, value: 1 };
        case "UNHOOK": return { role: e.by, value: 2.5 };
        case "ESCAPE_GATE":
        case "ESCAPE_HATCH":
            return { role: e.who, value: 10 };
        default:
            return null;
    }
}


export function scoreSurvivors(events, survivors)
{
    const scores = survivors.map(s => ({
        id: s.id,
        role: s.role,
        score: 0
    }));

    function add(role, value)
    {
        const s = scores.find(x => x.role === role);
        if (s) s.score += value;
    }

    for (const e of events)
    {
        const res = scoreSurvivorEvent(e);
        if (res) add(res.role, res.value);
    }

    return scores;
}