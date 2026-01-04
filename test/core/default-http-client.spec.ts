import { defaultHttpClient } from "../../src/core/default-http-client";

describe("defaultHttpClient", () => {
  it("should be an axios instance", () => {
    // Since it's a direct export of axios.create(), it should have interceptors, request, etc.
    expect(defaultHttpClient).toBeDefined();
    expect(defaultHttpClient.request).toBeDefined();
    expect(typeof defaultHttpClient.request).toBe("function");
  });
});
