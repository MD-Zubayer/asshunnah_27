/**
 * Offline Queue Service - Queue actions when offline, sync when back online
 * Handles: likes, comments, and other write operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as articleService from './article-service';

const QUEUE_KEY = '@offline_queue';
const MAX_QUEUE_SIZE = 100;

/**
 * Add an action to the offline queue
 * @param {Object} action - { type: 'like'|'comment', payload: {...}, timestamp: number }
 */
export async function enqueue(action) {
    try {
        const queue = await getQueue();

        // Prevent queue from growing too large
        if (queue.length >= MAX_QUEUE_SIZE) {
            queue.shift(); // Remove oldest action
        }

        queue.push({
            ...action,
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            retries: 0,
        });

        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        console.log(`[OfflineQueue] Enqueued: ${action.type}`, action.payload);
        return true;
    } catch (error) {
        console.error('[OfflineQueue] Enqueue error:', error);
        return false;
    }
}

/**
 * Get the current offline queue
 * @returns {Array} Queue of pending actions
 */
export async function getQueue() {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('[OfflineQueue] Get queue error:', error);
        return [];
    }
}

/**
 * Clear the offline queue
 */
export async function clearQueue() {
    try {
        await AsyncStorage.removeItem(QUEUE_KEY);
        return true;
    } catch (error) {
        console.error('[OfflineQueue] Clear error:', error);
        return false;
    }
}

/**
 * Remove a specific action from the queue by ID
 */
export async function removeFromQueue(actionId) {
    try {
        const queue = await getQueue();
        const filtered = queue.filter((a) => a.id !== actionId);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error('[OfflineQueue] Remove error:', error);
        return false;
    }
}

/**
 * Process the offline queue - sync all pending actions with server
 * Called when network connection is restored
 * @param {string} token - Auth token
 * @param {Function} onProgress - Callback for progress updates
 */
export async function processQueue(token, onProgress = null) {
    const queue = await getQueue();

    if (queue.length === 0) {
        console.log('[OfflineQueue] Queue is empty, nothing to sync');
        return { processed: 0, failed: 0 };
    }

    console.log(`[OfflineQueue] Processing ${queue.length} pending actions...`);

    let processed = 0;
    let failed = 0;
    const failedActions = [];

    for (const action of queue) {
        try {
            let success = false;

            switch (action.type) {
                case 'like':
                    success = await processLikeAction(token, action.payload);
                    break;
                case 'comment':
                    success = await processCommentAction(token, action.payload);
                    break;
                default:
                    console.warn(`[OfflineQueue] Unknown action type: ${action.type}`);
                    success = true; // Skip unknown actions
            }

            if (success) {
                processed++;
                await removeFromQueue(action.id);
                console.log(`[OfflineQueue] ✓ Processed: ${action.type}`);
            } else {
                action.retries = (action.retries || 0) + 1;
                if (action.retries >= 3) {
                    failed++;
                    failedActions.push(action);
                    await removeFromQueue(action.id);
                    console.warn(`[OfflineQueue] ✗ Failed after 3 retries: ${action.type}`);
                } else {
                    // Update retry count
                    const currentQueue = await getQueue();
                    const idx = currentQueue.findIndex((a) => a.id === action.id);
                    if (idx !== -1) {
                        currentQueue[idx].retries = action.retries;
                        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(currentQueue));
                    }
                }
            }

            if (onProgress) {
                onProgress({ processed, failed, total: queue.length });
            }
        } catch (error) {
            console.error(`[OfflineQueue] Error processing ${action.type}:`, error);
            failed++;
        }
    }

    console.log(`[OfflineQueue] Done: ${processed} processed, ${failed} failed`);
    return { processed, failed, failedActions };
}

/**
 * Process a like action
 */
async function processLikeAction(token, payload) {
    const { articleId } = payload;
    if (!articleId) return false;

    try {
        await articleService.toggleLike(token, articleId);
        return true;
    } catch (error) {
        console.error('[OfflineQueue] Like sync failed:', error);
        return false;
    }
}

/**
 * Process a comment action
 */
async function processCommentAction(token, payload) {
    const { articleId, text, parentComment } = payload;
    if (!articleId || !text) return false;

    try {
        await articleService.createComment(token, articleId, text, parentComment);
        return true;
    } catch (error) {
        console.error('[OfflineQueue] Comment sync failed:', error);
        return false;
    }
}

/**
 * Get queue count (for badge display)
 */
export async function getQueueCount() {
    const queue = await getQueue();
    return queue.length;
}

const offlineQueueService = {
    enqueue,
    getQueue,
    clearQueue,
    removeFromQueue,
    processQueue,
    getQueueCount,
};

export default offlineQueueService;