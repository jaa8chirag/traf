import { afterEach, describe, expect, it } from "vitest";
import { defaultAppUrl } from "./app-url";

const KEYS = ["NEXT_PUBLIC_APP_URL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL"] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
afterEach(() => KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))));
const clear = () => KEYS.forEach((k) => delete process.env[k]);

describe("defaultAppUrl", () => {
  it("prefers the explicit URL and strips a trailing slash", () => {
    clear();
    process.env.NEXT_PUBLIC_APP_URL = "https://tarf.example/";
    expect(defaultAppUrl()).toBe("https://tarf.example");
  });
  it("uses the production domain on Vercel production and the deployment URL on previews", () => {
    clear();
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "tarf.vercel.app";
    process.env.VERCEL_URL = "tarf-git-b2b-abc.vercel.app";
    process.env.VERCEL_ENV = "production";
    expect(defaultAppUrl()).toBe("https://tarf.vercel.app");
    process.env.VERCEL_ENV = "preview";
    expect(defaultAppUrl()).toBe("https://tarf-git-b2b-abc.vercel.app");
  });
  it("falls back to localhost", () => {
    clear();
    expect(defaultAppUrl()).toBe("http://localhost:3000");
  });
});
