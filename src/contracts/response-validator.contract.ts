import { Response } from '../models/response';

/**
 * Contract for validating HTTP responses before they are returned to the caller.
 *
 * Implement this interface to enforce business rules or schema constraints on a
 * response. Validators are registered on a request via `RequestBuilder.validateWith()`
 * and are executed sequentially by the `HttpAdapter` after a successful HTTP response
 * is received. The first validator that throws will halt the chain.
 *
 * @template T - The expected shape of the response data.
 *
 * @example
 * ```typescript
 * class PaymentStatusValidator implements ResponseValidator<IyzicoResponse> {
 *   async validate(response: Response<IyzicoResponse>): Promise<void> {
 *     if (response.data.status !== 'success') {
 *       throw new ValidationException(
 *         `Payment failed: ${response.data.errorMessage}`,
 *         response,
 *       );
 *     }
 *   }
 * }
 * ```
 */
export interface ResponseValidator<T = unknown> {
  validate(response: Response<T>): Promise<void> | void;
}
