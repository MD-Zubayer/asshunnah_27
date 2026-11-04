/**
 * Acquaintance Service - Handle selected acquaintances from Fuzalaye Jamia data
 * Uses AsyncStorage for local storage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@acquaintances';
const VISIT_COUNT_KEY = '@acquaintance_visit_count';

// Default visit threshold for reminder (show every 3rd visit if not selected)
const REMINDER_THRESHOLD = 3;

/**
 * Get all selected acquaintances
 * @returns {Promise<{selected: Array, hasCompletedSelection: boolean}>}
 */
export async function getSelectedAcquaintances() {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        }
        return { selected: [], hasCompletedSelection: false };
    } catch (error) {
        console.error('[AcquaintanceService] Get error:', error);
        return { selected: [], hasCompletedSelection: false };
    }
}

/**
 * Save selected acquaintances
 * @param {Array} selectedList - List of selected people with their details
 * @returns {Promise<boolean>}
 */
export async function saveSelectedAcquaintances(selectedList) {
    try {
        const data = {
            selected: selectedList,
            hasCompletedSelection: true,
            savedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('[AcquaintanceService] Save error:', error);
        return false;
    }
}

/**
 * Check if user has completed selection
 * @returns {Promise<boolean>}
 */
export async function hasCompletedSelection() {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            return parsed.hasCompletedSelection === true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

/**
 * Check if we should show the selection reminder
 * Shows on 3rd, 6th, 9th... visit if not completed
 * @returns {Promise<boolean>}
 */
export async function shouldShowReminder() {
    try {
        // If already completed, don't show
        const completed = await hasCompletedSelection();
        if (completed) return false;

        // Get and increment visit count
        const countStr = await AsyncStorage.getItem(VISIT_COUNT_KEY);
        const count = countStr ? parseInt(countStr, 10) : 0;
        const newCount = count + 1;
        await AsyncStorage.setItem(VISIT_COUNT_KEY, String(newCount));

        // Show every REMINDER_THRESHOLD visits
        return newCount % REMINDER_THRESHOLD === 0;
    } catch (error) {
        return false;
    }
}

/**
 * Reset visit count (after selection is done)
 */
export async function resetVisitCount() {
    try {
        await AsyncStorage.setItem(VISIT_COUNT_KEY, '0');
    } catch (error) {
        console.error('[AcquaintanceService] Reset visit count error:', error);
    }
}

/**
 * Clear all acquaintance data
 */
export async function clearAcquaintances() {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
        await AsyncStorage.removeItem(VISIT_COUNT_KEY);
    } catch (error) {
        console.error('[AcquaintanceService] Clear error:', error);
    }
}

/**
 * Get selected names as a Set for quick lookup
 * @returns {Promise<Set<string>>}
 */
export async function getSelectedNamesSet() {
    const { selected } = await getSelectedAcquaintances();
    return new Set(selected.map(p => p.name));
}

/**
 * Check if a specific person is selected
 * @param {string} name - Person's name
 * @returns {Promise<boolean>}
 */
export async function isPersonSelected(name) {
    const { selected } = await getSelectedAcquaintances();
    return selected.some(p => p.name === name);
}

const acquaintanceService = {
    getSelectedAcquaintances,
    saveSelectedAcquaintances,
    hasCompletedSelection,
    shouldShowReminder,
    resetVisitCount,
    clearAcquaintances,
    getSelectedNamesSet,
    isPersonSelected,
};

export default acquaintanceService;