import { Request } from "../../src/models/request";
import { HttpMethod } from "../../src/common/enums/http-method.enum";

describe("Request", () => {
  const baseUrl = "https://api.example.com";
  const endpoint = "/test";

  it("should initialize with default values", () => {
    const request = new Request(baseUrl, endpoint);

    expect(request.baseUrl).toBe(baseUrl);
    expect(request.endpoint).toBe(endpoint);
    expect(request.method).toBe(HttpMethod.POST);
    expect(request.headers).toEqual({});
    expect(request.queryParams).toEqual({});
    expect(request.body).toBeNull();
    expect(request.systemCorrelationId).toBeDefined();
    expect(request.timestamp).toBeInstanceOf(Date);
  });

  it("should initialize with provided values", () => {
    const method = HttpMethod.GET;
    const headers = { "X-Test": "true" };
    const queryParams = { q: "search" };
    const body = { id: 1 };

    const request = new Request(
      baseUrl,
      endpoint,
      method,
      headers,
      queryParams,
      body
    );

    expect(request.method).toBe(method);
    expect(request.headers).toEqual(headers);
    expect(request.queryParams).toEqual(queryParams);
    expect(request.body).toEqual(body);
  });

  describe("addParam", () => {
    it("should add parameter to existing body", () => {
      const request = new Request(
        baseUrl,
        endpoint,
        HttpMethod.POST,
        {},
        {},
        {}
      );
      request.addParam("newKey", "newValue");
      expect(request.body).toEqual({ newKey: "newValue" });
    });

    it("should throw error if body is null", () => {
      const request = new Request(baseUrl, endpoint);
      expect(() => request.addParam("key", "value")).toThrow(
        "Body is not defined"
      );
    });
  });

  describe("addHeader", () => {
    it("should add new header", () => {
      const request = new Request(baseUrl, endpoint);
      request.addHeader("Authorization", "Bearer token");
      expect(request.headers["Authorization"]).toBe("Bearer token");
    });
  });

  describe("addQueryParam", () => {
    it("should add new query parameter", () => {
      const request = new Request(baseUrl, endpoint);
      request.addQueryParam("page", "1");
      expect(request.queryParams["page"]).toBe("1");
    });
  });

  describe("setTimestamp", () => {
    it("should update timestamp", () => {
      const request = new Request(baseUrl, endpoint);
      const newDate = new Date("2023-01-01");
      request.setTimestamp(newDate);
      expect(request.timestamp).toEqual(newDate);
    });
  });

  describe("toDebugObject", () => {
    it("should return correct debug structure", () => {
      const request = new Request(baseUrl, endpoint);
      const debug = request.toDebugObject();

      expect(debug).toHaveProperty("baseUrl", baseUrl);
      expect(debug).toHaveProperty("endpoint", endpoint);
      expect(debug).toHaveProperty("method");
      expect(debug).toHaveProperty("headers");
      expect(debug).toHaveProperty("queryParams");
      expect(debug).toHaveProperty("body");
    });
  });
});
