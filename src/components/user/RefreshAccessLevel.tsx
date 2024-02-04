import { trpc } from "@lib/trpc";
import { Subscription } from "@pages/user/subscription";
import { useSession } from "next-auth/react";
import { FC, useEffect, useState } from "react";

const RefreshAccessLevel: FC = () => {
  const session = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const refreshAccessLevel = trpc.user.refreshAccessLevel.useMutation();

  trpc.subscription.findActiveSubscripion.useQuery(undefined, {
    onSuccess: (data) => {
      setSubscription(data);
    },
  });

  useEffect(() => {
    const refresh = async () => {
      await refreshAccessLevel.mutateAsync();
    };

    if (session.data?.user.id) {
      // active session
      refresh();
    }
  }, [session.data?.user.id, subscription]);

  return <></>;
};

export default RefreshAccessLevel;
