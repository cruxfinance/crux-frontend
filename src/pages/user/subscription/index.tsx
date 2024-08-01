import SideMenu from "@components/layout/SideMenu";
import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import { NextPage } from "next";
import userNavItems from "@lib/navigation/userNav";
import CreateSubscription from "@components/user/manage/CreateSubscription";
import ManageSubscription from "@components/user/manage/ManageSubscription";
import { findSubscriptions } from "@server/services/subscription/subscription";
import { useState } from "react";
import { trpc } from "@lib/trpc";
import ReviseSubscription from "@components/user/manage/ReviseSubscription";
import { PaymentInstrument } from "@components/user/manage/ManagePaymentInstruments";

export type Subscription = ArrayElement<
  Awaited<ReturnType<typeof findSubscriptions>>
>;

const Subscriptions: NextPage = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [paymentInstruments, setPaymentInstruments] = useState<
    PaymentInstrument[]
  >([]);
  const [loadingPaymentInstruments, setLoadingPaymentInstruments] = useState(true);

  const querySubscription = trpc.subscription.findActiveSubscripion.useQuery(undefined, {
    onSuccess: (data) => {
      setSubscription(data);
      setLoadingSubscription(false);
    },
  });
  trpc.subscription.findPaymentInstruments.useQuery(undefined, {
    onSuccess: (data) => {
      setPaymentInstruments(data);
      setLoadingPaymentInstruments(false);
    },
  });

  const refreshSubscription = () => querySubscription.refetch()

  const loading = loadingPaymentInstruments || loadingSubscription

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
          <ReviseSubscription subscription={subscription} paymentInstruments={paymentInstruments} refetchSubscription={refreshSubscription} />
        </Box>
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
