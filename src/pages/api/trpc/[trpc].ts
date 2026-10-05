import { appRouter } from "@server/routers/_app";
import { createTRPCContext } from "@server/trpc";
import * as trpcNext from "@trpc/server/adapters/next";
import * as Sentry from "@sentry/nextjs";

// export API handler
// @see https://trpc.io/docs/server/adapters
export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError: ({ error }) => {
    // Log unconditionally so errors still reach stdout when Sentry is
    // disabled (empty DSN), not just when it's configured.
    console.error("tRPC error:", error);
    Sentry.captureException(error);
  },
});
