import React from "react";
import Header from "@components/layout/Header";
import Footer from "@components/layout/Footer";
import Sidebar from "@components/layout/Sidebar";
import { Box } from "@mui/material";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Header onMenuClick={handleDrawerToggle} />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: "calc(100vh - 116px)",
          }}
        >
          <Box sx={{ flexGrow: "1", height: "100%" }}>{children}</Box>
          <Footer />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
