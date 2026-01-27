/**
 * Haptic feedback utility for mobile devices
 * Uses the Vibration API to provide tactile feedback on user interactions
 *
 * Note: The Vibration API is supported on most mobile browsers but not on iOS Safari
 * or desktop browsers. The functions gracefully handle unsupported environments.
 */

/**
 * Check if the Vibration API is supported
 */
export const isHapticSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Haptic feedback patterns for different interaction types
 */
export const haptic = {
  /**
   * Light haptic - for subtle interactions like toggle changes
   * Duration: 10ms
   */
  light: (): boolean => {
    return navigator.vibrate?.(10) ?? false;
  },

  /**
   * Medium haptic - for standard interactions like button presses
   * Duration: 25ms
   */
  medium: (): boolean => {
    return navigator.vibrate?.(25) ?? false;
  },

  /**
   * Heavy haptic - for important actions
   * Duration: 50ms
   */
  heavy: (): boolean => {
    return navigator.vibrate?.(50) ?? false;
  },

  /**
   * Success haptic - for positive feedback (e.g., correct answer, successful scan)
   * Pattern: short-pause-short (celebratory double tap)
   */
  success: (): boolean => {
    return navigator.vibrate?.([10, 50, 10]) ?? false;
  },

  /**
   * Error haptic - for negative feedback (e.g., wrong answer, failed action)
   * Pattern: three quick pulses (attention-grabbing)
   */
  error: (): boolean => {
    return navigator.vibrate?.([50, 30, 50, 30, 50]) ?? false;
  },
};

export default haptic;
