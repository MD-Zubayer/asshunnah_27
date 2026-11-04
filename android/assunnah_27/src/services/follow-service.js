/**
 * Follow Service - Handle follow/unfollow API calls
 */
import { API_ENDPOINTS } from '../constants/api';

class FollowService {
    /**
     * Follow a user
     */
    async followUser(token, userId) {
        try {
            const response = await fetch(API_ENDPOINTS.followUser(userId), {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            return { success: response.ok, ...data };
        } catch (error) {
            console.error('Follow error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Unfollow a user
     */
    async unfollowUser(token, userId) {
        try {
            const response = await fetch(API_ENDPOINTS.followUser(userId), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            return { success: response.ok, ...data };
        } catch (error) {
            console.error('Unfollow error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Toggle follow/unfollow
     */
    async toggleFollow(token, userId, isFollowing) {
        if (isFollowing) {
            return await this.unfollowUser(token, userId);
        }
        return await this.followUser(token, userId);
    }

    /**
     * Get follow status and counts
     */
    async getFollowStatus(token, userId) {
        try {
            const response = await fetch(API_ENDPOINTS.followStatus(userId), {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (response.ok) {
                return { success: true, ...data };
            }
            return { success: false, ...data };
        } catch (error) {
            console.error('Follow status error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get followers list
     */
    async getFollowers(token, userId) {
        try {
            const response = await fetch(API_ENDPOINTS.userFollowers(userId), {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (response.ok) {
                return { success: true, data };
            }
            return { success: false, ...data };
        } catch (error) {
            console.error('Followers error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Get following list
     */
    async getFollowing(token, userId) {
        try {
            const response = await fetch(API_ENDPOINTS.userFollowing(userId), {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (response.ok) {
                return { success: true, data };
            }
            return { success: false, ...data };
        } catch (error) {
            console.error('Following error:', error);
            return { success: false, message: error.message };
        }
    }
}

export default new FollowService();