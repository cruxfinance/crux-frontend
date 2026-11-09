import React, { FC } from "react";
import { Alert } from "@mui/material";
import { useClStatus } from "@components/cl/useClStatus";

/** Banner shown on CL pages while CL is paused (kill switch) or unreachable.
 * Renders nothing while live or until the first status response. */
const ClStatusBanner: FC<{ sx?: object }> = ({ sx }) => {
  const status = useClStatus();
  if (!status || !status.message) return null;
  return (
    <Alert severity={status.state === "killed" ? "warning" : "info"} sx={{ mb: 2, ...sx }}>
      {status.message}
    </Alert>
  );
};

export default ClStatusBanner;
