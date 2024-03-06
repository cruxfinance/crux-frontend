import { trpc } from "@lib/trpc";
import { LoadingButton } from "@mui/lab";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Popover,
  Typography,
  useTheme,
} from "@mui/material";
import { Subscription } from "@pages/user/subscription";
import { SubscriptionStatus } from "@prisma/client";
import { FC, Fragment, useState } from "react";

interface ManageSubscriptionProps {
  subscription: Subscription | null;
}

const ManageSubscription: FC<ManageSubscriptionProps> = ({ subscription }) => {
  const theme = useTheme();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [openPopover, setOpenPopover] = useState(false);
  const [popoverProps, setPopoverProps] = useState({
    message: "",
    error: "",
  });

  const subscriptionRenew = trpc.subscription.renewSubscription.useMutation();
  const queries = trpc.useQueries((t) => [
    t.subscription.findActiveSubscripion(),
  ]);

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

  const renew = async () => {
    setButtonLoading(true);
    try {
      await subscriptionRenew.mutateAsync({
        subscriptionId: subscription?.id ?? "",
      });
      await Promise.all(queries.map((query) => query.refetch()));
      handleOpenPopover("Woohoo!!!");
    } catch (e: any) {
      handleOpenPopoverError(e.toString());
    }
    setButtonLoading(false);
  };

  return (
    <Fragment>
      <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative", pb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Existing Subscriptions
        </Typography>
        <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative" }}>
          {subscription === null &&
            "There is no active Subscription assosiated with your account."}
          {subscription && (
            <>
              <Typography variant="h6">Details</Typography>
              <Divider sx={{ my: 1 }} />
              <Box>
                <Typography>Id: {subscription.id}</Typography>
                <Typography>
                  AccessLevel: {subscription.allowedAccess}
                </Typography>
                <Typography>
                  PaymentInstrument: {subscription.paymentInstrumentId}
                </Typography>
                <Typography>
                  ChargeableAmount:{" "}
                  {Number(subscription.requiredAmountUSD) / 100}$
                </Typography>
                <Typography>
                  SubscriptionPeriod:{" "}
                  {Math.floor(subscription.periodSeconds / (60 * 60 * 24))} days
                </Typography>
                <Typography>
                  ActivatedAt:{" "}
                  {subscription.activationTimestamp
                    ? new Date(subscription.activationTimestamp).toUTCString()
                    : "-"}
                </Typography>
                <Typography>
                  CreatedAt: {subscription.createdAt.toUTCString()}
                </Typography>
                <Typography>
                  UpdatedAt: {subscription.updatedAt.toUTCString()}
                </Typography>
                <Typography>Status: {subscription.status}</Typography>
                <LoadingButton
                  sx={{ mt: 2 }}
                  variant="outlined"
                  disabled={subscription.status === SubscriptionStatus.ACTIVE}
                  loading={buttonLoading}
                  onClick={renew}
                >
                  Activate or Renew
                </LoadingButton>
              </Box>
            </>
          )}
        </Paper>
      </Paper>
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

export default ManageSubscription;
