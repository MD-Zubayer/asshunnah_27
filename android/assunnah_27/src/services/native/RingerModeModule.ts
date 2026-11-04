import { NativeModules, Platform } from 'react-native';

const { RingerModeModule } = NativeModules;

export type RingerMode = 'silent' | 'vibrate' | 'normal';

class RingerModeService {
  private mockMode: RingerMode = 'normal';

  /**
   * Checks if Notification Policy Access (Do Not Disturb permission) is granted.
   * On iOS, this is always true as ringer controls are handled differently or mocked.
   */
  async checkDndPermission(): Promise<boolean> {
    if (Platform.OS === 'android' && RingerModeModule) {
      try {
        return await RingerModeModule.checkDndPermission();
      } catch (e) {
        console.error('Error checking DND permission:', e);
        return false;
      }
    }
    return true; // Safe fallback
  }

  /**
   * Prompts the user to grant Do Not Disturb settings.
   */
  async requestDndPermission(): Promise<void> {
    if (Platform.OS === 'android' && RingerModeModule) {
      try {
        await RingerModeModule.requestDndPermission();
      } catch (e) {
        console.error('Error requesting DND permission:', e);
      }
    } else {
      console.log('[RingerModeModule] DND Permission requested (Mock/Non-Android)');
    }
  }

  /**
   * Sets the phone's ringer mode.
   */
  async setRingerMode(mode: RingerMode): Promise<boolean> {
    console.log(`[RingerModeModule] Setting ringer mode to: ${mode}`);
    if (Platform.OS === 'android' && RingerModeModule) {
      try {
        const success = await RingerModeModule.setRingerMode(mode);
        return success;
      } catch (e) {
        console.error('Error setting ringer mode native:', e);
        return false;
      }
    } else {
      this.mockMode = mode;
      return true;
    }
  }

  /**
   * Gets the current ringer mode.
   */
  async getRingerMode(): Promise<RingerMode> {
    if (Platform.OS === 'android' && RingerModeModule) {
      try {
        return await RingerModeModule.getRingerMode();
      } catch (e) {
        console.error('Error getting ringer mode native:', e);
        return this.mockMode;
      }
    }
    return this.mockMode;
  }
}

export default new RingerModeService();
