import { HttpAdapter } from "../../src/core/http.adapter";
import { Request } from "../../src/models/request";
import { Response } from "../../src/models/response";
import { HttpInterceptor } from "../../src/contracts/http-interceptor.contract";
import { HttpMethod } from "../../src/common/enums/http-method.enum";
import { defaultHttpClient } from "../../src/core/default-http-client";
import { AxiosInstance } from "axios";

// Mock axios and defaultHttpClient
jest.mock("../../src/core/default-http-client", () => ({
  defaultHttpClient: {
    request: jest.fn(),
  },
}));

describe("HttpAdapter", () => {
  let adapter: HttpAdapter;
  let mockHttpClient: jest.Mocked<AxiosInstance>;
  let request: Request;

  beforeEach(() => {
    mockHttpClient = defaultHttpClient as jest.Mocked<AxiosInstance>;
    mockHttpClient.request.mockReset();

    // Default successful response
    mockHttpClient.request.mockResolvedValue({
      data: { success: true },
      status: 200,
      headers: {},
    });

    request = new Request("https://api.example.com", "/test", HttpMethod.GET);
  });

  describe("create", () => {
    it("should create an instance with default client", () => {
      const instance = HttpAdapter.create([]);
      expect(instance).toBeInstanceOf(HttpAdapter);
    });
  });

  describe("send", () => {
    it("should send request via http client", async () => {
      adapter = HttpAdapter.create([], undefined, mockHttpClient);

      const response = await adapter.send(request);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://api.example.com/test",
          method: "GET",
        })
      );
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });
    });

    it("should execute interceptors in order", async () => {
      const order: string[] = [];

      const interceptor1: HttpInterceptor = {
        onRequest: async (req) => {
          order.push("req1");
          return req;
        },
        onResponse: async (res) => {
          order.push("res1");
          return res;
        },
        onError: async (err, req) => {
          return err;
        },
      };

      const interceptor2: HttpInterceptor = {
        onRequest: async (req) => {
          order.push("req2");
          return req;
        },
        onResponse: async (res) => {
          order.push("res2");
          return res;
        },
        onError: async (err, req) => {
          return err;
        },
      };

      adapter = HttpAdapter.create(
        [interceptor1, interceptor2],
        undefined,
        mockHttpClient
      );

      await adapter.send(request);

      // Request: 1 -> 2
      // Response: 1 -> 2 (implementation passes processed response through chain)
      // Check implementation:
      // for (const interceptor of this.interceptors) response = await interceptor.onResponse(response);
      // So order is 1 -> 2.

      expect(order).toEqual(["req1", "req2", "res1", "res2"]);
    });

    it("should handle errors through interceptors", async () => {
      const error = new Error("network error");
      mockHttpClient.request.mockRejectedValue(error);

      const interceptor: HttpInterceptor = {
        onRequest: async (req) => req,
        onResponse: async (res) => res,
        onError: async (err, req) => {
          return new Error("intercepted error");
        },
      };

      adapter = HttpAdapter.create([interceptor], undefined, mockHttpClient);

      await expect(adapter.send(request)).rejects.toThrow("intercepted error");
    });

    it("should append query params to url", async () => {
      adapter = HttpAdapter.create([], undefined, mockHttpClient);
      request.addQueryParam("q", "search");

      await adapter.send(request);

      expect(mockHttpClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://api.example.com/test?q=search",
        })
      );
    });
  });
});
