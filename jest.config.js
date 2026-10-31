const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  coveragePathIgnorePatterns: ["/node_modules/", "<rootDir>/test/"],
  transform: {
    ...tsJestTransformCfg,
  },
};