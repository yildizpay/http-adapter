import { RetryExecutor } from '../../src/resilience/retry-executor';
import { RetryPolicy } from '../../src/contracts/retry-policy.contract';

describe('RetryExecutor', () => {
  let mockPolicy: jest.Mocked<RetryPolicy>;
  let executor: RetryExecutor;

  beforeEach(() => {
    mockPolicy = {
      maxAttempts: 3,
      backoffMs: jest.fn().mockReturnValue(10), // Short delay for tests
      retryOn: jest.fn(),
    } as unknown as jest.Mocked<RetryPolicy>;

    executor = new RetryExecutor(mockPolicy);
  });

  it('should return result immediately if operation succeeds', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await executor.execute(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(mockPolicy.retryOn).not.toHaveBeenCalled();
  });

  it('should retry on failure if policy allows it', async () => {
    const error = new Error('fail');
    const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

    mockPolicy.retryOn.mockReturnValue(true);

    const result = await executor.execute(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(mockPolicy.retryOn).toHaveBeenCalledWith(error);
    expect(mockPolicy.backoffMs).toHaveBeenCalledWith(1);
  });

  it('should throw immediately if policy says do not retry', async () => {
    const error = new Error('fatal error');
    const operation = jest.fn().mockRejectedValue(error);

    mockPolicy.retryOn.mockReturnValue(false);

    await expect(executor.execute(operation)).rejects.toThrow(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry up to maxAttempts and then throw', async () => {
    const error = new Error('persistent fail');
    const operation = jest.fn().mockRejectedValue(error);

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
