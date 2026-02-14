export function scoreKillerEvent(event)
{
    switch (event.type)
    {
        case "HIT": return { killer: 1 };
        case "ENDURANCE_TRIGGERED": return { killer: 1 };
        case "DOWN": return { killer: 2 };
        case "HOOK": return { killer: 2 };
        case "SACRIFICE": return { killer: 10 };
        default: return null;
    }
}



export function scoreKiller(events)
{
    const score =
        {
        hits: 0,
        enduranceHits: 0,
        downs: 0,
        hooks: 0,
        kills: 0,
        total: 0,
    };

    events.forEach(e =>
    {
        switch (e.type)
        {

            case "HIT":
                score.hits++;
                score.total += 1;
                break;

            case "ENDURANCE_TRIGGERED":
                score.enduranceHits++;
                score.total += 1;
                break;

            case "DOWN":
                score.downs++;
                score.total += 2;
                break;

            case "HOOK":
                score.hooks++;
                score.total += 2;
                break;

            case "SACRIFICE":
                score.kills++;
                score.total += 10;
                break;
        }
    });

    return score;
}