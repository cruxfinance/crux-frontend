import SideMenu from "@components/layout/SideMenu";
import CreatePaymentInstrument from "@components/user/manage/CreatePaymentInstrument";
import ManagePaymentInstruments from "@components/user/manage/ManagePaymentInstruments";
import { Box } from "@mui/material";
import { NextPage } from "next";
import userNavItems from "@lib/navigation/userNav"

const Payments: NextPage = () => {
  return (
    <SideMenu title="Settings" navItems={userNavItems}>
      <Box sx={{ mb: 2 }}>
        <ManagePaymentInstruments />
      </Box>
      <Box sx={{ pb: 2 }}>
        <CreatePaymentInstrument />
      </Box>
    </SideMenu>
  );
};

export default Payments;
