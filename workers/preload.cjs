// Lets non-Next processes (worker, CLI scripts) import modules marked `import "server-only"`.
// That package throws outside React Server bundles; here it is resolved to an empty module instead.
const Module = require("node:module");
const path = require("node:path");
const original = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return path.join(__dirname, "empty.cjs");
  return original.call(this, request, ...rest);
};
