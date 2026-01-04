/**
 * Utility class for string manipulation and generation.
 */
export class StrUtil {
  /**
   * Generates a random UUID v4 string.
   *
   * This implementation uses a pseudo-random number generator and is suitable
   * for non-cryptographic purposes such as tracing IDs.
   *
   * @returns A string representation of a UUID v4 (e.g., 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').
   */
  static generateUuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.trunc(Math.random() * 16);
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
