// M7 test
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export const ok = <T>(
  c: Context,
  data: T,
  statusCode: ContentfulStatusCode = 200,
) => {
  return c.json({ result: { data } }, statusCode);
};

export const fail = (
  c: Context,
  code: string,
  message: string,
  httpStatus: ContentfulStatusCode = 500,
) => {
  return c.json(
    { error: { message, code: -32600, data: { code, httpStatus } } },
    httpStatus,
  );
};
