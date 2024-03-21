import SideMenu from "@components/layout/SideMenu";
import { Box, Divider, Link, Paper, Typography } from "@mui/material";
import { NextPage } from "next";
import userNavItems from "@lib/navigation/userNav";
import AddWallet from "@components/user/wallet/AddWallet";
import ManageWallets from "@components/user/wallet/ManageWallets";

const Wallets: NextPage = () => {
  return (
    <SideMenu title="Settings" navItems={userNavItems}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Connected Wallets
      </Typography>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <ManageWallets />
        <Divider sx={{ mb: 2 }} />
        <AddWallet />
      </Paper>
    </SideMenu>
  );
};

export default Wallets;
