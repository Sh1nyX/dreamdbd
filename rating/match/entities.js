import { generateModifiers } from "./modifiers.js";

export function createSurvivor(role, id)
{
    const modifiers = generateModifiers(role);
    const maxHealth = 2 + modifiers.extraHealthStages;

    return {
        id,
        role,
        maxHealth,
        currentHealth: maxHealth,
        state: "Healthy", // Healthy | Injured | Downed | Dead
        healProgress: 0,
        genProgress: 0,
        hookedCount: 0,
        modifiers,
    };
}

export function createKiller()
{
    return {
        hooks: 0,
        kills: 0,
    };
}