import { logger } from '@college-hub/logger';

/**
 * Sandboxed Execution Wrapper providing Failure Isolation.
 * Ensures a single throwing module hook cannot crash the platform kernel.
 */
export async function safeExecute<T>(
  moduleId: string,
  lifecyclePhase: string,
  fn: () => Promise<T> | T,
  fallbackValue?: T
): Promise<{ success: boolean; result?: T; error?: Error }> {
  try {
    const result = await fn();
    return { success: true, result };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(
      { moduleId, lifecyclePhase, err: error },
      `❌ Failure Isolation Sandbox caught unhandled error during module '${moduleId}' ${lifecyclePhase} hook`
    );

    if (fallbackValue !== undefined) {
      return { success: false, result: fallbackValue, error };
    }
    return { success: false, error };
  }
}
