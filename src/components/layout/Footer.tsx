import { FC } from "react";
import Grid from "@mui/material/Grid";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link"
import SocialGrid from "@components/layout/SocialGrid";
import Logo from "@components/svgs/Logo";
import { useMediaQuery, useTheme } from "@mui/material";
import { useRouter } from "next/router";

const titleFont = {
  fontFamily: ['"Space Grotesk"', "sans-serif"].join(","),
  fontWeight: "Bold",
  textTransform: "uppercase",
  fontSize: "1rem",
  lineHeight: "1.5rem",
  pb: "9px",
};

interface IPage {
  name: string;
  link: string;
}

interface IPageLinkList {
  title: string;
  links: IPage[];
}

const firstPages = {
  title: '',
  links: [

  ],
};

const secondPages = {
  title: 'Support',
  links: [
    {
      name: "Apply for IDO",
      link: "/apply",
    },
    {
      name: "Documentation",
      link: "https://docs.coinecta.fi",
    }
  ],
};

const thirdPages = {
  title: 'Launchpad',
  links: [
    {
      name: "Stake",
      link: "/stake",
    },
    {
      name: "Contribute",
      link: "/contribute",
    },
    {
      name: "Redeem",
      link: "/redeem",
    },
  ],
};

// const fourthPages = {
//   title: 'Fourth',
//   links: [
//     {
//       name: "Hello",
//       link: "/",
//     },
//   ],
// };

const LinkList: FC<IPageLinkList> = ({ title, links }) => {
  const theme = useTheme()
  return (
    <Grid item xs={6} md={3} sx={{}} zeroMinWidth>
      <Typography sx={titleFont}>{title}</Typography>
      {links.map((page, i) => (
        <Typography key={i}><Link
          href={page.link}
          sx={{
            color: theme.palette.text.primary,
            textDecoration: "none",
            "&:hover": {
              // textDecoration: "underline",
              color: theme.palette.primary.main,
            },
            // fontSize: "16px",
            lineHeight: '1.625',
          }}
        >
          {page.name}
        </Link></Typography>
      ))}
    </Grid>
  )
}

const Footer: FC = () => {
  const theme = useTheme()
  const upMd = useMediaQuery(theme.breakpoints.up('md'))
  const router = useRouter()
  return (
    <Container
      sx={{
        display: 'block',
        position: 'relative',
        zIndex: 0,
        mt: '16px',
        mb: router.pathname.includes('tokens') && router.pathname.length > 8 ? 6 : 1
      }}
    >
      {/* <Grid
        container
        spacing={{ xs: 3, md: 1 }}
        sx={{
          py: { xs: 2, md: 8 },
        }}
      >
        <Grid item xs={12} md={5}>
          <Link
            href="/"
            sx={{

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
                fontSize: '30px',
                color: theme.palette.text.primary,
              }}
            />
          </Link>
        </Grid>
        <Grid item xs={12} md={7}>
          <Grid container direction="row" justifyContent="flex-end" spacing={4} sx={{ flexWrap: 'wrap' }}>
            {firstPages.links.length != 0 && LinkList(firstPages)}
            {secondPages.links.length != 0 && LinkList(secondPages)}
            {thirdPages.links.length != 0 && LinkList(thirdPages)} 
            <Grid item xs={6} md={3} sx={{}} zeroMinWidth>
              <Typography sx={titleFont}>Socials</Typography>
              <Grid
                container
                spacing={1}
                justifyContent={'left'}
                sx={{
                  fontSize: "25px",
                }}
              >
                <SocialGrid
                  telegram="https://t.me/coinecta"
                  discord="https://discord.gg/EuFdWye8yw"
                  github="https://github.com/coinecta"
                  twitter="https://twitter.com/CruxFinance"
                  medium="https://coinecta.medium.com/"
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid> */}
      <Grid container
        direction={
          // upMd ? 'row' : 
          'column-reverse'
        }
        justifyContent="space-between"
        sx={{ py: 2 }}
        spacing={1}
      >
        <Grid item xs={12} md sx={{ textAlign: { xs: 'center', md: 'left' } }}>
          {/* <Link
            href="/"
            sx={{
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
                fontSize: '30px',
                color: theme.palette.text.primary,
              }}
            />

            <Typography
              component="span"
              sx={{
                color: theme.palette.text.primary,
                fontSize: '1.5rem!important',
                fontWeight: '700',
                lineHeight: 1,
                display: 'inline-block',
                verticalAlign: 'middle',
                fontFamily: '"Jura", sans-serif',
              }}
            >
              Crux Finance
            </Typography>
          </Link> */}
        </Grid>

        <Grid item xs={12} md sx={{ textAlign: 'center' }}>
          Charting solution provided by <Link href="https://www.tradingview.com/" target="_blank">Trading View</Link>
        </Grid>

        <Grid item xs={12} md sx={{ textAlign: 'center' }}>
          <Link
            href="/terms"
            sx={{
              color: theme.palette.text.primary,
              textDecoration: 'none',
              "&:hover": {
                color: theme.palette.primary.main,
              },
            }}
          >
            Terms of Service
          </Link>{" "}
          ·{" "}
          <Link
            href="/privacy"
            sx={{
              color: theme.palette.text.primary,
              textDecoration: 'none',
              "&:hover": {
                color: theme.palette.primary.main,
              },
            }}
          >
            Privacy Policy
          </Link>
        </Grid>

        <Grid item xs={12} md
          sx={{
            textAlign: {
              xs: 'center',
              // md: 'right'
            }
          }}>
          <Grid
            container
            spacing={1}
            justifyContent={{
              xs: 'center',
              // md: 'right' 
            }}
            sx={{
              fontSize: "25px",
            }}
          >
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
    </Container>
  );
}

export default Footer;