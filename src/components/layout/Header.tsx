import React, { FC, useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import {
  // Theme,
  Fade,
  Divider,
  IconButton,
  Button,
  Avatar,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogContent,
  Menu,
  MenuItem,
  Collapse,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Box from "@mui/material/Box";
import Link from "@components/Link";
// import { ThemeContext } from "@contexts/ThemeContext";
import Logo from "@components/svgs/Logo";
import NotificationsMenu from "@components/notifications/NotificationsMenu";
import UserMenu from "@components/user/UserMenu";
import MenuIcon from "@mui/icons-material/Menu";
import ClearIcon from "@mui/icons-material/Clear";
import useScrollTrigger from "@mui/material/useScrollTrigger";
import SocialGrid from "./SocialGrid";
// import { DarkTheme, LightTheme } from "@theme/theme";
// import Brightness4Icon from '@mui/icons-material/Brightness4';
// import Brightness7Icon from '@mui/icons-material/Brightness7';
// import IconButton from "@mui/material/IconButton";
import { useRouter } from "next/router";
import { useScrollLock } from "@contexts/ScrollLockContext";

interface IHeaderProps { }

const Header: FC<IHeaderProps> = ({ }) => {
  const { lockScroll, unlockScroll, isLocked, scrollBarCompensation } =
    useScrollLock();

  const theme = useTheme();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  useEffect(() => {
    // console.log('hello')
  }, [isLocked, scrollBarCompensation]);

  const router = useRouter();
  const upLg = useMediaQuery(theme.breakpoints.up("lg"));

  const handleDialogOpen = () => {
    lockScroll();
    setNotificationsOpen(true);
  };

  const handleDialogClose = () => {
    unlockScroll();
    setNotificationsOpen(false);
  };

  return (
    <>
      <AppBar
        position="relative"
        elevation={12}
        sx={{
          zIndex: 91,
          border: "none",
          borderBottom: `none`,
          backdropFilter: "none",
          borderRadius: "0px",
          background: notificationsOpen
            ? theme.palette.background.default
            : "none",
          boxShadow: "none!important",
          transition: "background 200ms, box-shadow 200ms, top 400ms",
          "&:before": {
            p: 0,
          },
          mb: "24px",
        }}
      >
        <Box sx={{ mx: 2 }}>
          <Grid
            container
            justifyContent="space-between"
            alignItems="center"
            sx={{
              height: "60px",
              transition: "height 400ms",
            }}
          >
            <Grid item alignItems="center">
              <Link
                href="/"
                sx={{
                  display: "block",
                  "&:hover": {
                    "& span": {
                      color: theme.palette.primary.main,
                    },
                    "& .MuiSvgIcon-root": {
                      color: theme.palette.primary.main,
                    },
                  },
                }}
              >
                <Logo
                  sx={{
                    display: "inline-block",
                    verticalAlign: "middle",
                    mr: "3px",
                    color: theme.palette.text.primary,
                  }}
                />
                <Typography
                  component="span"
                  sx={{
                    color: theme.palette.text.primary,
                    fontSize: "1.6rem!important",
                    fontWeight: "700",
                    lineHeight: 1,
                    display: upLg ? "inline-block" : "none",
                    verticalAlign: "middle",
                    fontFamily: '"Jura", sans-serif',
                  }}
                >
                  Crux Finance
                </Typography>
              </Link>
            </Grid>

            <Grid item>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <NotificationsMenu
                    dialogOpen={notificationsOpen}
                    setDialogOpen={setNotificationsOpen}
                    handleDialogClose={handleDialogClose}
                    handleDialogOpen={handleDialogOpen}
                  />
                </Grid>
                <Grid item>
                  <UserMenu />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      </AppBar>
    </>
  );
};

export default Header;
