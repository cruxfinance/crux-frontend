import { appRouter } from "@server/routers/_app";
import { createTRPCContext } from "@server/trpc";
import * as trpcNext from "@trpc/server/adapters/next";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import * as Sentry from "@sentry/nextjs";
import axios from "axios";

// export API handler
// @see https://trpc.io/docs/server/adapters
export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError: ({ error, path }) => {
    // Our own 4xx are expected rejections (logged-out, non-premium, bad
    // input). An upstream 4xx means ci-api rejected a request we built.
    const upstream = axios.isAxiosError(error.cause);
    if (getHTTPStatusCodeFromError(error) < 500 && !upstream) return;
    // Log so failures still reach stdout when Sentry is disabled (empty DSN).
    console.error(`tRPC error on ${path ?? "<no-path>"}:`, error);
    Sentry.captureException(error);
  },
});
