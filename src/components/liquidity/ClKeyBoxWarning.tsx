import React, { FC } from "react";
import { Alert, Button, CircularProgress } from "@mui/material";
import { keyBoxWarning } from "@components/cl/clStatus";

interface ClKeyBoxWarningProps {
  ageBlocks: number | null | undefined;
  storagePeriodBlocks: number | null | undefined;
  busy: boolean;
  onRefresh: () => void;
}

/** Storage-rent warning for a position's key box, with a self-send button.
 * Renders nothing below the warning threshold or when the age is unknown. */
const ClKeyBoxWarning: FC<ClKeyBoxWarningProps> = ({
  ageBlocks,
  storagePeriodBlocks,
  busy,
  onRefresh,
}) => {
  const warning = keyBoxWarning(ageBlocks, storagePeriodBlocks);
  if (!warning) return null;
  return (
    <Alert
      severity={warning.severity === "urgent" ? "error" : "warning"}
      sx={{ mt: 0.5, py: 0, "& .MuiAlert-message": { fontSize: "0.75rem" } }}
      action={
        <Button
          size="small"
          color="inherit"
          disabled={busy}
          onClick={onRefresh}
          sx={{ whiteSpace: "nowrap" }}
        >
          {busy ? <CircularProgress size={14} /> : "Send key to myself"}
        </Button>
      }
    >
      {warning.message}
    </Alert>
  );
};

export default ClKeyBoxWarning;
