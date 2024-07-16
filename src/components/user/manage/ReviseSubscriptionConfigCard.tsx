import {
  Box,
  Card,
  CardActions,
  CardContent,
  Typography,
  useTheme,
} from "@mui/material";
import {
  SubscriptionConfig,
} from "@server/services/subscription/config";
import { FC } from "react";
import { LoadingButton } from "@mui/lab";

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
  const theme = useTheme()
  return (
    <Card
      sx={{
        maxWidth: 300,
        m: 2,
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        border: disabled ? `2px solid ${theme.palette.primary.main}` : 'none',
        position: 'relative',
        overflow: 'visible'
      }}
    >
      {disabled && (
        <Box
          sx={{
            position: 'absolute',
            top: '-8px',
            right: '-6px',
            py: '2px',
            px: '8px',
            border: `1px solid ${theme.palette.primary.main}`,
            background: theme.palette.background.paper,
            borderRadius: '8px'
          }}
        >
          <Typography sx={{ color: theme.palette.primary.main, fontSize: '0.9rem!important' }}>
            Selected
          </Typography>
        </Box>
      )}
      <CardContent>
        {/* <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
          {config.id}
        </Typography> */}
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
        {!disabled && (
          <LoadingButton
            variant="outlined"
            size="small"
            onClick={() => setSelectedPlan(config.id)}
            // disabled={disabled}
            loading={loading}
          >
            Select Plan
          </LoadingButton>
        )}
      </CardActions>
    </Card>
  );
};

export default ReviseSubscriptionConfigCard