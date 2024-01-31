import ManageUser from "@components/layout/ManageUser";
import CreatePaymentInstrument from "@components/user/manage/CreatePaymentInstrument";
import ManagePaymentInstruments from "@components/user/manage/ManagePaymentInstruments";
import { trpc } from "@lib/trpc";
import { Box, Typography } from "@mui/material";
import { findPaymentInstruments } from "@server/services/subscription/paymentInstrument";
import { useState } from "react";

const PaymentInstruments = () => {
  return (
    <ManageUser>
      <Typography variant="h4">Payment Instruments</Typography>
      <Box sx={{ py: 2 }}>
        <ManagePaymentInstruments />
      </Box>
      <Box sx={{ pb: 2 }}>
        <CreatePaymentInstrument />
      </Box>
    </ManageUser>
  );
};

export default PaymentInstruments;
