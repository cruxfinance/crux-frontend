import React, { useState, useEffect } from "react";
import Header from "@components/layout/Header";
import Footer from "@components/layout/Footer";
import {
  Box,
  CircularProgress
} from "@mui/material";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Header />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Box sx={{ flexGrow: '1', height: '100%' }}>
          {children}
        </Box>
        <Footer />
      </Box>
    </>
  );
};

export default Layout;