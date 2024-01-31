import SideMenu from "@components/layout/SideMenu";
import { Box, Link, Paper, Typography } from "@mui/material";
import { NextPage } from "next";
import userNavItems from "@lib/navigation/userNav"

const UserProfile: NextPage = () => {
  return (
    <SideMenu title="Manage Account" navItems={userNavItems}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>User Profile</Typography>
        <Typography>
          Coming soon.
        </Typography>
        <Link href="/">
          <Typography>
            Go Back Home
          </Typography>
        </Link>
      </Paper>
    </SideMenu>
  );
};

export default UserProfile;
