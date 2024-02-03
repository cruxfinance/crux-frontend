import SideMenu from "@components/layout/SideMenu";
import { Box, Typography } from "@mui/material";
import { NextPage } from "next";
import userNavItems from "@lib/navigation/userNav";
import CreateSubscription from "@components/user/manage/CreateSubscription";
import ManageSubscription from "@components/user/manage/ManageSubscription";

const Subscriptions: NextPage = () => {
  return (
    <SideMenu title="Settings" navItems={userNavItems}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Manage Subscriptions
      </Typography>
      <Box sx={{ mb: 2 }}>
        <ManageSubscription />
      </Box>
      <Box>
        <CreateSubscription />
      </Box>
    </SideMenu>
  );
};

export default Subscriptions;
