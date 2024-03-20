import SideMenu from "@components/layout/SideMenu";
import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import { NextPage } from "next";
import userNavItems from "@lib/navigation/userNav";
import { findSubscriptions } from "@server/services/subscription/subscription";
import { useState } from "react";
import { trpc } from "@lib/trpc";
import ReviseSubscription from "@components/user/manage/ReviseSubscription";
import { Subscription } from ".";
import { PaymentInstrument } from "@prisma/client";

const Subscriptions: NextPage = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentInstruments, setPaymentInstruments] = useState<
    PaymentInstrument[]
  >([]);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [loadingPaymentInstruments, setLoadingPaymentInstruments] = useState(true);
  trpc.subscription.findActiveSubscripion.useQuery(undefined, {
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
  const loading = loadingSubscription || loadingPaymentInstruments;

  return (
    <SideMenu title="Settings" navItems={userNavItems}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Revise Subscription
      </Typography>
      {loading && (
        <Paper
          variant="outlined"
          sx={{ p: 3, width: "100%", position: "relative", pb: 4 }}
        >
          <Box display="flex" justifyContent="center" sx={{ p: 2 }}>
            <CircularProgress />
          </Box>
        </Paper>
      )}
      {!loading && subscription !== null && (
        <Box sx={{ mb: 2 }}>
          <ReviseSubscription subscription={subscription} paymentInstruments={paymentInstruments}/>
        </Box>
      )}
      {!loading && subscription === null && (
        <Box sx={{ mb: 2 }}>There is no active subscription.</Box>
      )}
    </SideMenu>
  );
};

export default Subscriptions;
