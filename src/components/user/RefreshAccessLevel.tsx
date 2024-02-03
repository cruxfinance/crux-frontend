import { trpc } from "@lib/trpc";
import { useSession } from "next-auth/react";
import { FC, useEffect } from "react";

const RefreshAccessLevel: FC = () => {
  const session = useSession();
  const refreshAccessLevel = trpc.user.refreshAccessLevel.useMutation();

  useEffect(() => {
    const refresh = async () => {
      await refreshAccessLevel.mutateAsync();
    };

    if (session.data?.user.id) {
      // active session
      refresh();
    }
  }, [session.data?.user.id]);

  return <></>;
};

export default RefreshAccessLevel;
