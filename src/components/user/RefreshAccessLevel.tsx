import { useWallet } from "@contexts/WalletContext";
import { trpc } from "@lib/trpc";
import { Subscription } from "@pages/user/subscription";
import { FC, useEffect, useState } from "react";

const RefreshAccessLevel: FC = () => {
  const { sessionData, sessionStatus } = useWallet();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const refreshAccessLevel = trpc.user.refreshAccessLevel.useMutation();

  trpc.subscription.findActiveSubscripion.useQuery(undefined, {
    onSuccess: (data) => {
      setSubscription(data);
    },
    enabled: sessionStatus === 'authenticated'
  });

  useEffect(() => {
    const refresh = async () => {
      await refreshAccessLevel.mutateAsync();
    };

    if (sessionData?.user.id) {
      // active session
      refresh();
    }
  }, [sessionData?.user.id, subscription]);

  return <></>;
};

export default RefreshAccessLevel;
