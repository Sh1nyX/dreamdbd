export function generateModifiers(role)
{
    return {
        extraHealthStages: Math.random() < 0.25 ? 1 : 0,
        enduranceOnHit: Math.random() < 0.25,
        fasterHealing: role === "medic",
        fasterRepair: role === "engineer",
    };
}