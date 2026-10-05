import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios";
import { TRPCError } from "@trpc/server";
import { mapAxiosErrorToTRPCError } from "../mapErrors";

const makeError = (status: number | undefined, data?: unknown) => {
  const config = {
    method: "post",
    url: "/crux/positions",
    headers: new AxiosHeaders(),
  } as InternalAxiosRequestConfig;
  const response =
    status === undefined
      ? undefined
      : { status, statusText: "", data, headers: {}, config };
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, {}, response);
};

describe("mapAxiosErrorToTRPCError", () => {
  it("uses the error field of an object body", () => {
    const result = mapAxiosErrorToTRPCError(
      makeError(500, { error: "Internal server error" }),
    );
    expect(result).toBeInstanceOf(TRPCError);
    expect(result.message).toBe(
      "Upstream 500 POST /crux/positions: Internal server error",
    );
  });

  it("uses the message field when there is no error field", () => {
    const result = mapAxiosErrorToTRPCError(makeError(400, { message: "bad input" }));
    expect(result.message).toBe("Upstream 400 POST /crux/positions: bad input");
  });

  it("uses a string body as is", () => {
    const result = mapAxiosErrorToTRPCError(makeError(502, "Bad Gateway"));
    expect(result.message).toBe("Upstream 502 POST /crux/positions: Bad Gateway");
  });

  it("stringifies an object body without known fields", () => {
    const result = mapAxiosErrorToTRPCError(makeError(500, { foo: 1 }));
    expect(result.message).toBe('Upstream 500 POST /crux/positions: {"foo":1}');
  });

  it("falls back to the axios message when there is no response", () => {
    const result = mapAxiosErrorToTRPCError(makeError(undefined));
    expect(result.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.message).toBe("Upstream POST /crux/positions: Request failed");
  });

  it.each([
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [500, "INTERNAL_SERVER_ERROR"],
  ])("maps status %i to %s", (status, code) => {
    expect(mapAxiosErrorToTRPCError(makeError(status, { error: "x" })).code).toBe(code);
  });

  it("chains the original error as cause", () => {
    const error = makeError(500, { error: "boom" });
    expect(mapAxiosErrorToTRPCError(error).cause).toBe(error);
  });
});
