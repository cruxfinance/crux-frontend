import React, { FC, useContext, useEffect } from 'react';
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
  useTheme
} from '@mui/material';
import Box from "@mui/material/Box";
import Link from '@components/Link'
// import { ThemeContext } from "@contexts/ThemeContext";
import Logo from '@components/svgs/Logo';
import NotificationsMenu from '@components/notifications/NotificationsMenu'
import UserMenu from '@components/user/UserMenu';
import MenuIcon from '@mui/icons-material/Menu';
import ClearIcon from '@mui/icons-material/Clear';
import useScrollTrigger from "@mui/material/useScrollTrigger";
import SocialGrid from './SocialGrid';
// import { DarkTheme, LightTheme } from "@theme/theme";
// import Brightness4Icon from '@mui/icons-material/Brightness4';
// import Brightness7Icon from '@mui/icons-material/Brightness7';
// import IconButton from "@mui/material/IconButton";
import { useRouter } from 'next/router';

const pages = [
  {
    name: "Tokens",
    link: "/tokens"
  },
  {
    name: "Portfolio",
    link: "/portfolio"
  },
  {
    name: "Alerts",
    link: "/alerts",
    disabled: true
  },
  {
    name: "Trading Floor",
    link: "/trading-floor",
    disabled: true
  },
  {
    name: "Accounting",
    link: "/accounting",
    disabled: true
  },
];

interface INavItemProps {
  size?: number;
  fontWeight?: number;
  page: {
    name: string;
    link: string;
    disabled?: boolean;
  };
}

interface IHeaderProps {

}

const Header: FC<IHeaderProps> = ({ }) => {
  // const {
  //   theme,
  //   // setTheme 
  // } = useContext(ThemeContext);
  const theme = useTheme()
  const [navbarOpen, setNavbarOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  const router = useRouter();
  const upMd = useMediaQuery(theme.breakpoints.up("md"));
  const upLg = useMediaQuery(theme.breakpoints.up("lg"));

  const handleDialogOpen = () => {
    setNavbarOpen(false)
    setNotificationsOpen(true);
  };

  const handleDialogClose = () => {
    setNotificationsOpen(false);
  };

  const handleNavbarToggle = () => {
    if (navbarOpen === true) {
      setNavbarOpen(false)
    }
    else {
      setNavbarOpen(true)
      setNotificationsOpen(false)
    }

  }

  // const toggleTheme = () => {
  //   setTheme((prevTheme: Theme) => (prevTheme === LightTheme ? DarkTheme : LightTheme));
  //   let temp = theme === LightTheme ? "dark" : "light";
  //   localStorage.setItem('darkToggle', temp);
  //   // console.log(temp)
  // };

  const NavigationListItem: React.FC<INavItemProps> = ({ size, fontWeight, page }) => {
    return (
      <Grid item>
        <Box
          sx={{
            display: 'inline-block',
            position: 'relative',
            // "&::after": {
            //   content: '""',
            //   position: 'absolute',
            //   bottom: '-4px',
            //   display: 'block',
            //   mt: '0',
            //   borderRadius: '10px',
            //   height: (fontWeight && fontWeight > 500) || (size && size > 20) ? '3px' : '2px',
            //   background: router.pathname === page.link ? theme.palette.primary.main : '',
            //   width: '100%',
            // },
          }}
        >
          {page.disabled ? (
            <Typography
              sx={{
                color: theme.palette.text.secondary,
                fontSize: size ? size.toString() + 'px' : '16px',
                textDecoration: "none",
                fontWeight: fontWeight ? fontWeight : '500',
                px: '8px',
              }}
            >
              {page.name}
            </Typography>
          ) : (
            <Box onClick={() => setNavbarOpen(false)}>
              <Link
                href={page.link}
                sx={{
                  color: router.pathname === page.link ? theme.palette.primary.main : theme.palette.text.primary,
                  "&:hover": {
                    color: theme.palette.primary.main,
                  },
                }}

              >
                <Typography
                  sx={{
                    fontSize: size ? size.toString() + 'px' : '16px',
                    textDecoration: "none",
                    fontWeight: fontWeight ? fontWeight : '500',
                    px: '8px',
                  }}
                >
                  {page.name}
                </Typography>
              </Link>
            </Box>
          )}
        </Box>
      </Grid>
    );
  };

  const trigger = useScrollTrigger({
    disableHysteresis: router.pathname === '/' ? true : false,
    threshold: 0,
  });

  return (
    <>
      <AppBar
        position="relative"
        elevation={12}
        sx={{
          zIndex: 91,
          border: 'none',
          // top: trigger && router.pathname !== '/' ? '-60px' : 0,
          borderBottom: `none`,
          // backdropFilter: "blur(10px)",
          backdropFilter: 'none',
          borderRadius: '0px',
          // background: theme.palette.background.default,
          boxShadow: router.pathname === '/'
            // && !trigger
            ? 'none'
            : '3px 3px 15px 5px rgba(0,0,0,0.5)',
          // boxShadow: 'none!important',
          background: navbarOpen || notificationsOpen
            ? theme.palette.background.default
            : router.pathname === '/'
              // && !trigger
              ? 'none'
              : 'radial-gradient(at right top, rgba(16,20,34,0.8), rgba(1, 4, 10, 0.8))',
          transition: 'background 200ms, box-shadow 200ms, top 400ms',
          '&:before': {
            p: 0
          },
          mb: '24px'
        }}
      >
        <Box sx={{ mx: 2 }}>
          <Grid
            container
            justifyContent="space-between"
            alignItems="center"
            sx={{
              height: router.pathname === '/'
                // && !trigger 
                && upMd
                ? "90px"
                : '60px',
              transition: 'height 400ms'
            }}
          >
            <Grid
              item
              alignItems="center"
            >
              <Link
                href="/"
                sx={{
                  display: 'block',
                  '&:hover': {
                    '& span': {
                      color: theme.palette.primary.main
                    },
                    '& .MuiSvgIcon-root': {
                      color: theme.palette.primary.main
                    }
                  }
                }}
              >
                <Logo
                  sx={{
                    display: 'inline-block',
                    verticalAlign: 'middle',
                    mr: '3px',
                    // fontSize: '64px',
                    color: theme.palette.text.primary,
                  }}
                />
                <Typography
                  component="span"
                  sx={{
                    color: theme.palette.text.primary,
                    fontSize: '1.6rem!important',
                    fontWeight: '700',
                    lineHeight: 1,
                    display: upLg ? 'inline-block' : 'none',
                    verticalAlign: 'middle',
                    fontFamily: '"Jura", sans-serif',
                  }}
                >
                  Crux Finance
                </Typography>
              </Link>
            </Grid>
            <Grid item sx={{ display: { xs: "none", md: "flex" } }}>
              <Grid
                container
                spacing={2}
              >
                {pages.map((page, i) => (
                  <NavigationListItem size={16} key={i} page={page} fontWeight={700} />
                ))}
              </Grid>
            </Grid>
            <Grid item>

              <Grid container spacing={2} alignItems="center">
                {/* <IconButton onClick={toggleTheme} sx={{ color: theme.palette.text.primary }}>
                    {(theme === DarkTheme) ? <Brightness7Icon /> : <Brightness4Icon />}
                  </IconButton> */}
                <Grid item>
                  <NotificationsMenu dialogOpen={notificationsOpen} setDialogOpen={setNotificationsOpen} handleDialogClose={handleDialogClose} handleDialogOpen={handleDialogOpen} />
                </Grid>
                <Grid item>
                  <UserMenu />
                </Grid>
                <Grid item sx={{ display: { xs: "flex", md: "none" } }}>
                  <IconButton
                    sx={{ p: 0 }}
                    onClick={() => handleNavbarToggle()}
                  >
                    {!navbarOpen
                      ? <MenuIcon color="primary" />
                      : <ClearIcon color="primary" />
                    }
                  </IconButton>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      </AppBar>
      <Fade in={navbarOpen} style={{ transitionDuration: "200ms" }} mountOnEnter unmountOnExit>
        <Box
          sx={{
            height: "calc(100vh - 60px)",
            width: "100vw",
            position: "fixed",
            top: 0,
            zIndex: 10002,
            background: theme.palette.background.default,
            mt: "60px",
            p: "16px",
            pb: 0,
          }}
        >
          <Grid
            container
            direction="column"
            justifyContent="flex-end"
            alignItems="flex-start"
            spacing={2}
            height="100%"
          >
            <Grid item>
              <Grid
                container
                spacing={5}
                direction="column"
                justifyContent="flex-end"
                alignItems="flex-start"
                sx={{
                  mb: 3
                }}
              >
                {pages.map((page) => (
                  <NavigationListItem size={24} key={page.name} page={page} />
                ))}
              </Grid>
            </Grid>
            <Grid item>
              <Grid
                container
                direction="column"
                spacing={4}
              >
                {/* <Grid item>
                  <Button variant="contained" fullWidth>New transaction</Button>
                </Grid> */}
                <Grid item>
                  <Divider />
                </Grid>
                <Grid item>
                  <Typography variant="h5" gutterBottom fontWeight="800" fontSize="14px" >
                    Follow us on social media
                  </Typography>
                  <Typography variant="body2" gutterBottom sx={{ mb: 4 }} fontSize="14px" >
                    Interacting with our socials helps us reach a wider audience.
                  </Typography>
                  <Grid container direction="row" spacing={3} sx={{ fontSize: '24px' }}>
                    <SocialGrid
                      telegram="https://t.me/CruxFinance"
                      discord="https://discord.gg/tZEd3PadtD"
                      // github=""
                      twitter="https://twitter.com/cruxfinance"
                    // medium=""
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      </Fade>
    </>
  );
};

export default Header;