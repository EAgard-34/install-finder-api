import type { ZodTypeAny, z } from "zod";
import { HttpError } from "../lib/errors";

/** Parse and throw a 400 with field errors the app can show next to inputs. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, "Please fix the highlighted fields", result.error.flatten().fieldErrors);
  }
  return result.data;
}
