import { StrUtil } from "../../../src/common/utils/str.util";

describe("StrUtil", () => {
  describe("generateUuid", () => {
    it("should generate a valid UUID v4 string", () => {
      const uuid = StrUtil.generateUuid();

      // UUID v4 regex: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // where x is any hex digit and y is 8, 9, a, or b
      const uuidV4Regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

      expect(uuid).toMatch(uuidV4Regex);
    });

    it("should generate unique values", () => {
      const uuid1 = StrUtil.generateUuid();
      const uuid2 = StrUtil.generateUuid();
      expect(uuid1).not.toBe(uuid2);
    });
  });
});
