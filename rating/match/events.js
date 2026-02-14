export function event(type, payload = {})
{
    return {
        type,
        payload,
    };
}