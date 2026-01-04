import { RequestBuilder } from "../../src/builders/request.builder";
import { HttpMethod } from "../../src/common/enums/http-method.enum";

describe("RequestBuilder", () => {
  let builder: RequestBuilder;
  const baseUrl = "https://api.example.com";

  beforeEach(() => {
    builder = new RequestBuilder(baseUrl);
  });

  it("should initialize with correct base URL", () => {
    const request = builder.build();
    expect(request.baseUrl).toBe(baseUrl);
  });

  it("should set endpoint correctly", () => {
    const endpoint = "/users";
    const request = builder.setEndpoint(endpoint).build();
    expect(request.endpoint).toBe(endpoint);
  });

  it("should set HTTP method correctly", () => {
    const request = builder.setMethod(HttpMethod.GET).build();
    expect(request.method).toBe(HttpMethod.GET);
  });

  it("should default to POST method", () => {
    const request = builder.build();
    expect(request.method).toBe(HttpMethod.POST);
  });

  describe("Content-Type Helpers", () => {
    it("should set JSON content type", () => {
      const request = builder.asJson().build();
      expect(request.headers["Content-Type"]).toBe("application/json");
    });

    it("should set XML content type", () => {
      const request = builder.asXml().build();
      expect(request.headers["Content-Type"]).toBe("text/xml");
    });

    it("should set Form URL Encoded content type", () => {
      const request = builder.asFormUrlEncoded().build();
      expect(request.headers["Content-Type"]).toBe(
        "application/x-www-form-urlencoded"
      );
    });
  });

  describe("Body Management", () => {
    it("should set full body object", () => {
      const body = { id: 1, name: "Test" };
      const request = builder.setBody(body).build();
      expect(request.body).toEqual(body);
    });

    it("should add single body param", () => {
      const request = builder.addBodyParam("key", "value").build();
      expect(request.body).toEqual({ key: "value" });
    });

    it("should merge multiple body params", () => {
      const request = builder
        .addBodyParam("key1", "value1")
        .addBodyParam("key2", "value2")
        .build();
      expect(request.body).toEqual({ key1: "value1", key2: "value2" });
    });

    it("should remove body param", () => {
      const request = builder
        .addBodyParam("key1", "value1")
        .removeBodyParam("key1")
        .build();
      expect(request.body).toEqual({});
    });
  });

  describe("Header Management", () => {
    it("should add single header", () => {
      const request = builder
        .addHeader("Authorization", "Bearer token")
        .build();
      expect(request.headers["Authorization"]).toBe("Bearer token");
    });

    it("should merge headers", () => {
      const initialHeaders = { "X-Custom-1": "1" };
      const request = builder
        .setHeaders(initialHeaders)
        .addHeader("X-Custom-2", "2")
        .build();

      expect(request.headers["X-Custom-1"]).toBe("1");
      expect(request.headers["X-Custom-2"]).toBe("2");
    });
  });

  describe("Query Params Management", () => {
    it("should add single query param", () => {
      const request = builder.addQueryParam("page", "1").build();
      expect(request.queryParams["page"]).toBe("1");
    });

    it("should merge query params", () => {
      const request = builder
        .addQueryParam("page", "1")
        .addQueryParams({ sort: "desc" })
        .build();

      expect(request.queryParams).toEqual({ page: "1", sort: "desc" });
    });
  });
});
