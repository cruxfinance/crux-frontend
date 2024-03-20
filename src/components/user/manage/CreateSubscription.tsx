import { trpc } from "@lib/trpc";
import { LoadingButton } from "@mui/lab";
import {
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  SUBSCRIPTION_CONFIG,
  SubscriptionConfig,
} from "@server/services/subscription/config";
import { FC, Fragment, useState } from "react";
import { PaymentInstrument } from "./ManagePaymentInstruments";

interface SubscriptionConfigCardProps {
  config: SubscriptionConfig;
  setSelectedPlan: Function;
}

const SubscriptionConfigCard: FC<SubscriptionConfigCardProps> = ({
  config,
  setSelectedPlan,
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
        <Button
          variant="outlined"
          size="small"
          onClick={() => setSelectedPlan(config.id)}
        >
          Sign Up
        </Button>
      </CardActions>
    </Card>
  );
};

const CreateSubscription = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentInstruments, setPaymentInstruments] = useState<
    PaymentInstrument[]
  >([]);

  const [loading, setLoading] = useState(false);

  trpc.subscription.findOrCreateDefaultPaymentInstruments.useQuery(undefined, {
    onSuccess: (data) => {
      setPaymentInstruments(data);
    },
  });
  const queries = trpc.useQueries((t) => [
    t.subscription.findActiveSubscripion(),
  ]);
  const createSubscription = trpc.subscription.createSubscription.useMutation();

  const signUp = async () => {
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
      await createSubscription.mutateAsync({
        paymentInstrumentId: paymentInstrument.id,
        subscriptionConfigId: subscriptionConfig.id,
      });
      await Promise.all(queries.map((query) => query.refetch()));
      setSelectedPlan(null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Fragment>
      <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative", pb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Create a new Subscription
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-evenly",
          }}
        >
          {SUBSCRIPTION_CONFIG.map((config) => (
            <SubscriptionConfigCard
              key={config.id}
              config={config}
              setSelectedPlan={setSelectedPlan}
            />
          ))}
        </Box>
      </Paper>
      <Dialog
        open={selectedPlan !== null}
        onClose={() => setSelectedPlan(null)}
        aria-labelledby="create-subscription-dialog-title"
        aria-describedby="create-subscription-dialog-description"
      >
        <DialogTitle id="create-subscription-dialog-title">
          Sign Up for a Subscription -{" "}
          {
            SUBSCRIPTION_CONFIG.filter(
              (config) => config.id === selectedPlan
            )[0]?.name
          }
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="create-subscription-dialog-description">
            Your subscription will auto charge your Payment Instruments based on
            current market rate for the token. If the subscription cannot be
            renewed the paid features will be disabled till the payment
            instrument is updated with the required amount of tokens.
          </DialogContentText>
          <DialogContentText
            id="create-subscription-dialog-description-2"
            sx={{ mt: 1, fontWeight: 700, color: "text.primary" }}
          >
            You will be charged{" "}
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
            month(s)
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2 }}>
          <Button onClick={() => setSelectedPlan(null)}>Cancel</Button>
          <LoadingButton autoFocus loading={loading} onClick={signUp}>
            Sign Up
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Fragment>
  );
};

export default CreateSubscription;
