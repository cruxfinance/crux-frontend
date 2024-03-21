import SideMenu from "@components/layout/SideMenu";
import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import { NextPage } from "next";
import userNavItems from "@lib/navigation/userNav";
import CreateSubscription from "@components/user/manage/CreateSubscription";
import ManageSubscription from "@components/user/manage/ManageSubscription";
import { findSubscriptions } from "@server/services/subscription/subscription";
import { useState } from "react";
import { trpc } from "@lib/trpc";

export type Subscription = ArrayElement<
  Awaited<ReturnType<typeof findSubscriptions>>
>;

const Subscriptions: NextPage = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  trpc.subscription.findActiveSubscripion.useQuery(undefined, {
    onSuccess: (data) => {
      setSubscription(data);
      setLoading(false);
    },
  });

  return (
    <SideMenu title="Settings" navItems={userNavItems}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Manage Subscriptions
      </Typography>
      {loading && (
        <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative", pb: 4 }}>
          <Box display="flex" justifyContent="center" sx={{ p: 2 }}>
            <CircularProgress />
          </Box>
        </Paper>
      )}
      {!loading && subscription !== null && (
        <Box sx={{ mb: 2 }}>
          <ManageSubscription subscription={subscription} />
        </Box>
      )}
      {!loading && subscription === null && (
        <Box>
          <CreateSubscription />
        </Box>
      )}
    </SideMenu>
  );
};

export default Subscriptions;
