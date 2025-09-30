/**
 * Matches hook names against patterns
 * @param hookName The actual hook name
 * @param pattern The pattern to match against (can include * wildcards)
 * @returns true if the hook name matches the pattern
 */
export function matchesHookPattern(hookName: string, pattern: string): boolean {
    // Direct match
    if (hookName === pattern) return true;

    // Convert pattern to regex (e.g., "dashboard-*-header" -> /^dashboard-[^-]+-header$/)
    const regexPattern = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\\\*/g, '[^-]+') // Replace * with non-dash matcher
        .replace(/{([^}]+)}/g, '([^-]+)'); // Replace {var} with capture group

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(hookName);
}