import SideMenu from "@components/layout/SideMenu";
import { Box, Link, Paper, Typography } from "@mui/material";
import { NextPage } from "next";
import userNavItems from "@lib/navigation/userNav";

const Subscriptions: NextPage = () => {
  return (
    <SideMenu title="Settings" navItems={userNavItems}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Manage Subscriptions
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>Coming soon.</Typography>
        <Link href="/">
          <Typography>Go Back Home</Typography>
        </Link>
      </Paper>
    </SideMenu>
  );
};

export default Subscriptions;
