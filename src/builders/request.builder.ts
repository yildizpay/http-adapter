import { HttpMethod } from "../common/enums/http-method.enum";
import { HttpBody } from "../common/types/http.types";
import { Request } from "../models/request";
import { RequestOptions } from "../models/request-options";

/**
 * A fluent builder for constructing HTTP requests.
 *
 * This class provides a chainable API to configure various aspects of an HTTP request,
 * such as the endpoint, HTTP method, headers, query parameters, and request body.
 * It is designed to simplify the creation of complex `Request` objects in a structured
 * and readable manner.
 */
export class RequestBuilder {
  private readonly baseUrl: string;
  private endpoint: string = "";
  private method: HttpMethod = HttpMethod.POST;
  private headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  private body: HttpBody = {};
  private queryParams: Record<string, string> = {};
  private options: RequestOptions;

  /**
   * Initializes a new instance of the RequestBuilder class.
   *
   * @param baseUrl - The base URL for the HTTP requests constructed by this builder.
   */
  public constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.options = new RequestOptions();
  }

  /**
   * Sets the endpoint for the HTTP request.
   *
   * @param endpoint - The specific endpoint path (relative to the base URL) to be called.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public setEndpoint(endpoint: string): this {
    this.endpoint = endpoint;
    return this;
  }

  /**
   * Sets the HTTP method for the request.
   *
   * @param method - The HTTP method to be used (e.g., GET, POST, PUT, DELETE).
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public setMethod(method: HttpMethod): this {
    this.method = method;
    return this;
  }

  /**
   * Configures the request to send data as XML.
   * Sets the 'Content-Type' header to 'text/xml'.
   *
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public asXml(): this {
    this.headers["Content-Type"] = "text/xml";
    return this;
  }

  /**
   * Configures the request to send data as URL-encoded form data.
   * Sets the 'Content-Type' header to 'application/x-www-form-urlencoded'.
   *
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public asFormUrlEncoded(): this {
    this.headers["Content-Type"] = "application/x-www-form-urlencoded";
    return this;
  }

  /**
   * Configures the request to send data as JSON.
   * Sets the 'Content-Type' header to 'application/json'. This is the default behavior.
   *
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public asJson(): this {
    this.headers["Content-Type"] = "application/json";
    return this;
  }

  /**
   * Replaces the entire request body with the provided object.
   *
   * @param body - The object representing the body of the request.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public setBody(body: HttpBody): this {
    this.body = body;
    return this;
  }

  /**
   * Adds or updates a single parameter in the request body.
   *
   * @param key - The key of the body parameter.
   * @param value - The value of the body parameter.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public addBodyParam(key: string, value: HttpBody[string]): this {
    this.body[key] = value;
    return this;
  }

  /**
   * Merges a set of parameters into the existing request body.
   * Existing keys will be overwritten.
   *
   * @param params - An object containing the parameters to add to the body.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public addBodyParams(params: HttpBody): this {
    this.body = { ...this.body, ...params };
    return this;
  }

  /**
   * Removes a specific parameter from the request body.
   *
   * @param key - The key of the parameter to remove.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public removeBodyParam(key: string): this {
    delete this.body[key];
    return this;
  }

  /**
   * Clears all parameters from the request body.
   *
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public resetBodyParams(): this {
    this.body = {};
    return this;
  }

  /**
   * Replaces all request headers with the provided object.
   *
   * @param headers - An object containing header key-value pairs.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public setHeaders(headers: Record<string, string>): this {
    this.headers = headers;
    return this;
  }

  /**
   * Adds or updates a single header in the request.
   *
   * @param key - The name of the header.
   * @param value - The value of the header.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public addHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this;
  }

  /**
   * Merges a set of headers into the existing request headers.
   * Existing keys will be overwritten.
   *
   * @param headers - An object containing header key-value pairs to add.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public addHeaders(headers: Record<string, string>): this {
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  /**
   * Removes a specific header from the request.
   *
   * @param key - The name of the header to remove.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public removeHeader(key: string): this {
    delete this.headers[key];
    return this;
  }

  /**
   * Clears all headers from the request.
   *
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public resetHeaders(): this {
    this.headers = {};
    return this;
  }

  /**
   * Replaces all query string parameters with the provided object.
   *
   * @param params - An object containing query parameter key-value pairs.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public setQueryParams(params: Record<string, string>): this {
    this.queryParams = params;
    return this;
  }

  /**
   * Adds or updates a single query string parameter.
   *
   * @param key - The name of the query parameter.
   * @param value - The value of the query parameter.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public addQueryParam(key: string, value: string): this {
    this.queryParams[key] = value;
    return this;
  }

  /**
   * Merges a set of query parameters into the existing query string parameters.
   * Existing keys will be overwritten.
   *
   * @param params - An object containing query parameter key-value pairs to add.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public addQueryParams(params: Record<string, string>): this {
    this.queryParams = { ...this.queryParams, ...params };
    return this;
  }

  /**
   * Removes a specific query parameter from the request.
   *
   * @param key - The name of the query parameter to remove.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public removeQueryParam(key: string): this {
    delete this.queryParams[key];
    return this;
  }

  /**
   * Clears all query parameters from the request.
   *
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public resetQueryParams(): this {
    this.queryParams = {};
    return this;
  }

  /**
   * Sets the timeout for the request.
   *
   * @param timeout - The timeout duration in milliseconds.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public setTimeout(timeout: number): this {
    this.options.timeout = timeout;
    return this;
  }

  /**
   * Sets the configuration options for the request.
   *
   * @param options - A RequestOptions object containing configuration settings.
   * @returns The current instance of RequestBuilder for method chaining.
   */
  public setOptions(options: RequestOptions) {
    this.options = options;
    return this;
  }

  /**
   * Builds and returns a new Request object based on the current configuration.
   *
   * @returns A constructed Request object ready to be executed.
   */
  public build(): Request {
    return new Request(
      this.baseUrl,
      this.endpoint,
      this.method,
      this.headers,
      this.queryParams,
      this.body ? { ...this.body } : undefined
    );
  }
}
