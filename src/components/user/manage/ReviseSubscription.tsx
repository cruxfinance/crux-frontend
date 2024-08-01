import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Popover,
  Typography,
  useTheme,
} from "@mui/material";
import { Subscription } from "@pages/user/subscription";
import {
  SUBSCRIPTION_CONFIG,
  SubscriptionConfig,
} from "@server/services/subscription/config";
import { FC, Fragment, useState } from "react";
import { LoadingButton } from "@mui/lab";
import { getSubscriptionUpdateParams } from "@server/services/subscription/subscription";
import { trpc } from "@lib/trpc";
import { PaymentInstrument } from "@prisma/client";
import { useRouter } from "next/router";
import ReviseSubscriptionConfigCard from "./ReviseSubscriptionConfigCard";
import { useAlert } from '@contexts/AlertContext';

interface ReviseSubscriptionProps {
  subscription: Subscription;
  paymentInstruments: PaymentInstrument[];
  refetchSubscription: Function
}

export type UpdateSubscriptionParams = Awaited<
  ReturnType<typeof getSubscriptionUpdateParams>
>;

const ReviseSubscription: FC<ReviseSubscriptionProps> = ({
  subscription,
  paymentInstruments,
  refetchSubscription
}) => {
  const router = useRouter();
  const theme = useTheme();
  const { addAlert } = useAlert()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [updateSubscriptionParams, setUpdateSubscriptionParams] =
    useState<UpdateSubscriptionParams | null>(null);
  const [openUpdateSubscriptionDialog, setOpenUpdateSubscriptionDialog] = useState(false)
  const [loading, setLoading] = useState(false);

  trpc.subscription.getUpdateSubscriptionParams.useQuery(
    {
      activeSubscriptionId: subscription.id,
      updateSubscriptionConfigId: selectedPlan ?? "",
    },
    {
      onSuccess: (data) => {
        setUpdateSubscriptionParams(data);
        setLoading(false);
      },
      enabled: selectedPlan !== null,
    }
  );

  const updateSubscription = trpc.subscription.updateSubscription.useMutation();
  const update = async () => {
    setLoading(true);
    try {
      const subscriptionConfig = SUBSCRIPTION_CONFIG.filter(
        (config) => config.id === selectedPlan
      )[0];
      const paymentInstrument = paymentInstruments.filter(
        (paymentInstrument) =>
          paymentInstrument.tokenId ===
          subscriptionConfig.allowedTokenIds[0].tokenId
      )[0];
      await updateSubscription.mutateAsync({
        paymentInstrumentId: paymentInstrument.id,
        updateSubscriptionConfigId: subscriptionConfig.id,
        activeSubscriptionId: subscription.id,
      });
      addAlert('success', `Subscription ${subscriptionConfig.name} activated.`)
      setOpenUpdateSubscriptionDialog(false)
      refetchSubscription()
    } catch (e: any) {
      addAlert('error', `Error changing subscription. Please contact support if the problem persists. `)
      setOpenUpdateSubscriptionDialog(false)
    }
    setLoading(false);
  };

  return (
    <Fragment>
      <Paper
        variant="outlined"
        sx={{ p: 3, width: "100%", position: "relative", pb: 4 }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Available subscriptions
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-evenly",
            alignItems: "stretch"
          }}
        >
          {SUBSCRIPTION_CONFIG.map((config) => (
            <ReviseSubscriptionConfigCard
              key={config.id}
              config={config}
              setSelectedPlan={(plan: string) => {
                setSelectedPlan(plan), setLoading(true), setOpenUpdateSubscriptionDialog(true);
              }}
              disabled={subscription.subscriptionType === config.id}
              loading={loading && config.id === selectedPlan}
            />
          ))}
        </Box>
      </Paper>
      <Dialog
        open={openUpdateSubscriptionDialog}
        onClose={() => {
          setSelectedPlan(null);
          setUpdateSubscriptionParams(null);
          setOpenUpdateSubscriptionDialog(false)
        }}
        aria-labelledby="revise-subscription-dialog-title"
        aria-describedby="revise-subscription-dialog-description"
        sx={{
          '& .MuiBackdrop-root': {
            backdropFilter: 'blur(3px)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }
        }}
      >
        <DialogTitle id="create-subscription-dialog-title">
          Revise Subscription -{" "}
          {
            SUBSCRIPTION_CONFIG.filter(
              (config) => config.id === selectedPlan
            )[0]?.name
          }
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="revise-subscription-dialog-description">
            Your subscription will auto charge your Payment Instruments based on
            current market rate for the token. If the subscription cannot be
            renewed the paid features will be disabled till the payment
            instrument is updated with the required amount of tokens.
          </DialogContentText>
          <DialogContentText
            id="revise-subscription-dialog-description-2"
            sx={{ mt: 1, fontWeight: 700, color: "text.primary" }}
          >
            You will be charged the difference amount of{" "}
            {(updateSubscriptionParams?.amountUSD ?? 0) / 100}$ now to update
            the subscription to the new plan followed by{" "}
            {
              SUBSCRIPTION_CONFIG.filter(
                (config) => config.id === selectedPlan
              )[0]?.discountedAmountUSD
            }
            $ every{" "}
            {
              SUBSCRIPTION_CONFIG.filter(
                (config) => config.id === selectedPlan
              )[0]?.subscriptionPeriodMonths
            }{" "}
            month(s). The new plan will be activated instantly.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2 }}>
          <Button
            onClick={() => {
              setSelectedPlan(null), setUpdateSubscriptionParams(null), setOpenUpdateSubscriptionDialog(false)
            }}
          >
            Cancel
          </Button>
          <LoadingButton
            autoFocus
            loading={loading}
            onClick={update}
            variant="outlined"
          >
            Switch Plan
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
};

export default ReviseSubscription;
