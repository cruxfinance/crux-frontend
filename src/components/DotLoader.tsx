import React from "react";
import { Box } from "@mui/material";

const BouncingDotsLoader = (props: any) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box sx={dotStyles(0)}></Box>
      <Box sx={dotStyles(0.2)}></Box>
      <Box sx={dotStyles(0.4)}></Box>
    </Box>
  );
};

const dotStyles = (delay: any) => ({
  width: 16,
  height: 16,
  mx: 1,
  borderRadius: '50%',
  backgroundColor: '#a3a1a1',
  opacity: 1,
  animation: 'bouncing-loader 0.6s infinite alternate',
  animationDelay: `${delay}s`,
  "@keyframes bouncing-loader": {
    to: {
      opacity: 0.1,
      transform: 'translateY(-16px)'
    }
  }
});

export default BouncingDotsLoader;