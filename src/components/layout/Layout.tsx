import React from "react";
import Header from "@components/layout/Header";
import Footer from "@components/layout/Footer";
import { Box } from "@mui/material";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Header />
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
    </>
  );
};

export default Layout;
