export function buildKillerReport(killerScore, survivorScores = [])
{
    const killerTotal = killerScore.total;

    const avgSurvivor =
        survivorScores.length
            ? survivorScores.reduce((s, v) => s + v.score, 0) / survivorScores.length
            : 0;

    let finalDelta = 0;
    if (killerTotal >= avgSurvivor + 25) finalDelta = 25;
    else if (Math.abs(killerTotal - avgSurvivor) <= 10) finalDelta = 10;
    else if (killerTotal <= avgSurvivor - 25) finalDelta = -10;

    return {
        killerTotal,
        avgSurvivor,
        survivors: survivorScores,
        sections: [
            {
                title: "Hits on survivors",
                count: killerScore.hits,
                details: [
                    { label: "Endurance hits", value: killerScore.enduranceHits }
                ],
                score: killerScore.hits + killerScore.enduranceHits
            },
            {
                title: "Downed survivors",
                count: killerScore.downs,
                details: [],
                score: killerScore.downs * 2
            },
            {
                title: "Hooks",
                count: killerScore.hooks,
                details: [],
                score: killerScore.hooks * 2
            },
            {
                title: "Kills / Sacrifices",
                count: killerScore.kills,
                details: [],
                score: killerScore.kills * 10
            }
        ],
        finalDelta
    };
}