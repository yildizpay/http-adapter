import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import { HttpMethod } from '../../src/common/enums/http-method.enum';
import { RetryExecutor } from '../../src/resilience/retry-executor';
import { RetryPolicy } from '../../src/contracts/retry-policy.contract';

describe('RetryExecutor', () => {
  let mockPolicy: Mocked<RetryPolicy>;
  let executor: RetryExecutor;

  beforeEach(() => {
    mockPolicy = {
      maxAttempts: 3,
      backoffMs: vi.fn().mockReturnValue(10), // Short delay for tests
      retryOn: vi.fn(),
    } as unknown as Mocked<RetryPolicy>;

    executor = new RetryExecutor(mockPolicy);
  });

  it('should return result immediately if operation succeeds', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await executor.execute(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(mockPolicy.retryOn).not.toHaveBeenCalled();
  });

  it('should pass the request context to the policy', async () => {
    const error = new Error('fail');
    const operation = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success');
    mockPolicy.retryOn.mockReturnValue(true);

    await executor.execute(operation, { method: HttpMethod.POST });

    expect(mockPolicy.retryOn).toHaveBeenCalledWith(error, { method: HttpMethod.POST });
  });

  it('should retry on failure if policy allows it', async () => {
    const error = new Error('fail');
    const operation = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

    mockPolicy.retryOn.mockReturnValue(true);

    const result = await executor.execute(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(mockPolicy.retryOn).toHaveBeenCalledWith(error, undefined);
    expect(mockPolicy.backoffMs).toHaveBeenCalledWith(1);
  });

  it('should throw immediately if policy says do not retry', async () => {
    const error = new Error('fatal error');
    const operation = vi.fn().mockRejectedValue(error);

    mockPolicy.retryOn.mockReturnValue(false);

    await expect(executor.execute(operation)).rejects.toThrow(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry up to maxAttempts and then throw', async () => {
    const error = new Error('persistent fail');
    const operation = vi.fn().mockRejectedValue(error);

    mockPolicy.retryOn.mockReturnValue(true);

    await expect(executor.execute(operation)).rejects.toThrow(error);

    // 1 initial + (maxAttempts - 1) retries?? NO implementation check:
    // while(true) -> try -> catch -> if (attempt >= max) throw
    // attempt starts at 1.
    // 1. call -> fail -> attempt=1 -> 1 >= 3 (F) -> wait -> attempt++ (2)
    // 2. call -> fail -> attempt=2 -> 2 >= 3 (F) -> wait -> attempt++ (3)
    // 3. call -> fail -> attempt=3 -> 3 >= 3 (T) -> THROW

    expect(operation).toHaveBeenCalledTimes(3);
    expect(mockPolicy.backoffMs).toHaveBeenCalledTimes(2);
  });
});
