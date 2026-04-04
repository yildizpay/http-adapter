import { Request } from '../models/request';
import { Response } from '../models/response';

/**
 * Contract for sending HTTP requests through an adapter.
 *
 * Implement this interface to allow both the real {@link import('../core/http.adapter').HttpAdapter}
 * and test doubles such as `MockHttpAdapter` to be used interchangeably via dependency injection.
 *
 * @example
 * ```typescript
 * class PaymentService {
 *   constructor(private readonly adapter: HttpAdapterContract) {}
 *
 *   async getPayment(id: string): Promise<Payment> {
 *     const request = new RequestBuilder('https://api.example.com')
 *       .withEndpoint(`/payments/${id}`)
 *       .withMethod(HttpMethod.GET)
 *       .build();
 *
 *     const response = await this.adapter.send<Payment>(request);
 *     return response.data;
 *   }
 * }
 * ```
 */
export interface HttpAdapterContract {
  send<T = unknown>(request: Request): Promise<Response<T>>;
}
