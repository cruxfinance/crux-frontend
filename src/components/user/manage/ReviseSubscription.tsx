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

interface ReviseSubscriptionProps {
  subscription: Subscription;
  paymentInstruments: PaymentInstrument[];
}

export type UpdateSubscriptionParams = Awaited<
  ReturnType<typeof getSubscriptionUpdateParams>
>;

interface ReviseSubscriptionConfigCardProps {
  config: SubscriptionConfig;
  setSelectedPlan: Function;
  disabled: boolean;
  loading: boolean;
}

const ReviseSubscriptionConfigCard: FC<ReviseSubscriptionConfigCardProps> = ({
  config,
  setSelectedPlan,
  disabled,
  loading,
}) => {
  return (
    <Card
      sx={{
        maxWidth: 300,
        m: 2,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <CardContent>
        <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
          {config.id}
        </Typography>
        <Typography variant="h6" component="div">
          {config.name}
        </Typography>
        {disabled && (
          <Typography component="div" sx={{ mb: 1 }}>
            (Current)
          </Typography>
        )}
        <Typography sx={{ mt: 0.5, mb: 1.5 }} color="text.secondary">
          {config.description}
        </Typography>
        <Box display="flex">
          {config.amountUSD !== config.discountedAmountUSD && (
            <Typography
              variant="h6"
              sx={{
                mt: 0.5,
                textDecoration: "line-through",
                mr: 1,
              }}
              color="text.secondary"
            >
              {config.amountUSD}$
            </Typography>
          )}
          <Typography variant="h6" sx={{ mt: 0.5, mb: 1.5, fontWeight: 700 }}>
            {config.discountedAmountUSD}$
          </Typography>
        </Box>
      </CardContent>
      <CardActions sx={{ mt: "auto", pl: 2, pb: 2 }}>
        <LoadingButton
          variant="outlined"
          size="small"
          onClick={() => setSelectedPlan(config.id)}
          disabled={disabled}
          loading={loading}
        >
          Switch Plan
        </LoadingButton>
      </CardActions>
    </Card>
  );
};

const ReviseSubscription: FC<ReviseSubscriptionProps> = ({
  subscription,
  paymentInstruments,
}) => {
  const router = useRouter();
  const theme = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [updateSubscriptionParams, setUpdateSubscriptionParams] =
    useState<UpdateSubscriptionParams | null>(null);
  const [loading, setLoading] = useState(false);
  const [openPopover, setOpenPopover] = useState(false);
  const [popoverProps, setPopoverProps] = useState({
    message: "",
    error: "",
  });

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

  const handleOpenPopover = (message: string) => {
    setPopoverProps({ message: message, error: "" });
    setOpenPopover(true);
  };

  const handleOpenPopoverError = (error: string) => {
    setPopoverProps({ message: "", error: error });
    setOpenPopover(true);
  };

  const handleClosePopover = () => {
    setPopoverProps({ message: "", error: "" });
    setOpenPopover(false);
  };

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
      handleOpenPopover("Woohoo!!!");
      router.push("/user/subscription");
    } catch (e: any) {
      handleOpenPopoverError(e.toString());
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
          Upgrade your Subscription Plan
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-evenly",
          }}
        >
          {SUBSCRIPTION_CONFIG.map((config) => (
            <ReviseSubscriptionConfigCard
              key={config.id}
              config={config}
              setSelectedPlan={(plan: string) => {
                setSelectedPlan(plan), setLoading(true);
              }}
              disabled={isSameSubscriptionConfig(
                config,
                subscription,
                paymentInstruments.filter(
                  (pay) => pay.id === subscription.paymentInstrumentId
                )[0]
              )}
              loading={loading && config.id === selectedPlan}
            />
          ))}
        </Box>
      </Paper>
      <Dialog
        open={selectedPlan !== null && updateSubscriptionParams !== null}
        onClose={() => {
          setSelectedPlan(null);
          setUpdateSubscriptionParams(null);
        }}
        aria-labelledby="revise-subscription-dialog-title"
        aria-describedby="revise-subscription-dialog-description"
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
              setSelectedPlan(null), setUpdateSubscriptionParams(null);
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
      <Popover
        id="subscription-popover"
        open={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        sx={{
          mt: "10px",
          "& .MuiPopover-paper": {
            overflow: "hidden",
            background: theme.palette.background.paper,
          },
        }}
      >
        <Box
          sx={{
            minWidth: "420px",
            minHeight: "80px",
            p: 2,
          }}
        >
          {popoverProps.message && (
            <>
              <Typography>Subcription Activated</Typography>
              <Typography sx={{ pt: 1 }}>{popoverProps.message}</Typography>
            </>
          )}
          {popoverProps.error && (
            <>
              <Typography sx={{ color: theme.palette.primary.main }}>
                ERROR
              </Typography>
              <Typography sx={{ pt: 1 }}>{popoverProps.error}</Typography>
            </>
          )}
        </Box>
      </Popover>
    </Fragment>
  );
};

const isSameSubscriptionConfig = (
  config: SubscriptionConfig,
  subscription: Subscription,
  paymentInstrument: PaymentInstrument
) => {
  return (
    config.allowedPriviledgeLevel === subscription.allowedAccess &&
    config.discountedAmountUSD * 100 ===
      Number(subscription.requiredAmountUSD) &&
    config.subscriptionPeriodMonths * 30 * 24 * 60 * 60 ===
      subscription.periodSeconds &&
    config.allowedTokenIds
      .map((token) => token.tokenId)
      .includes(paymentInstrument?.tokenId)
  );
};

export default ReviseSubscription;
