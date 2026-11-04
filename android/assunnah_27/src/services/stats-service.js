/**
 * User Stats Service - Home page progress cards
 * Fetches aggregated user statistics from the backend
 */

import { API_ENDPOINTS } from '../constants/api';

function getAuthHeaders(token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Token ${token}`;
    return headers;
}

async function parseResponse(response) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error('সার্ভার থেকে সঠিক response পাওয়া যায়নি।');
    }
}

/**
 * Get user stats for home page progress cards
 * @param {string} token - Auth token
 * @returns {Object|null} - Stats object or null on failure
 */
export async function getUserStats(token) {
    try {
        if (!token) return null;

        const response = await fetch(API_ENDPOINTS.USER_STATS, {
            method: 'GET',
            headers: getAuthHeaders(token),
        });

        if (response.ok) {
            return await parseResponse(response);
        }
    } catch (error) {
        console.log('[StatsService] Failed to fetch user stats:', error.message);
    }

    return null;
}

/**
 * Format a number to Bengali digits
 * @param {number} num 
 * @returns {string}
 */
export function toBengaliNumber(num) {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (d) => bengaliDigits[d]);
}

const statsService = { getUserStats, toBengaliNumber };
export default statsService;