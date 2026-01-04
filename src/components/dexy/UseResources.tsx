import React, { FC } from "react";
import {
  Box,
  Paper,
  Typography,
  Link,
  Chip,
  useTheme,
} from "@mui/material";
import Grid from "@mui/system/Unstable_Grid/Grid";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SocialGrid from "@components/layout/SocialGrid";

interface ResourceLink {
  label: string;
  url: string | null;
  comingSoon?: boolean;
}

const UseResources: FC = () => {
  const theme = useTheme();

  const resources: ResourceLink[] = [
    { label: "GitHub", url: null, comingSoon: false },
    { label: "Articles", url: null, comingSoon: false },
    { label: "CoinGecko", url: null, comingSoon: true },
    { label: "DefiLlama", url: null, comingSoon: true },
  ];

  const liquidityPairs: ResourceLink[] = [
    { label: "USE/ERG on Crux", url: null, comingSoon: false },
    { label: "USE/USDT on BSC", url: null, comingSoon: false },
  ];

  const ResourceItem: FC<{ resource: ResourceLink }> = ({ resource }) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 1,
      }}
    >
      {resource.url ? (
        <Link
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: theme.palette.text.primary,
            textDecoration: "none",
            "&:hover": {
              color: theme.palette.primary.main,
            },
          }}
        >
          {resource.label}
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </Link>
      ) : (
        <Typography
          sx={{
            color: resource.comingSoon
              ? theme.palette.text.secondary
              : theme.palette.text.primary,
          }}
        >
          {resource.label}
        </Typography>
      )}
      {resource.comingSoon && (
        <Chip
          label="Coming soon"
          size="small"
          sx={{
            height: 20,
            fontSize: "0.7rem",
            backgroundColor: theme.palette.action.hover,
          }}
        />
      )}
      {!resource.url && !resource.comingSoon && (
        <Chip
          label="TBD"
          size="small"
          sx={{
            height: 20,
            fontSize: "0.7rem",
            backgroundColor: theme.palette.action.hover,
          }}
        />
      )}
    </Box>
  );

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        Resources
      </Typography>

      <Grid container spacing={4}>
        <Grid xs={12} sm={6} md={3}>
          <Typography
            variant="subtitle2"
            sx={{ color: theme.palette.text.secondary, mb: 1 }}
          >
            Documentation & Code
          </Typography>
          {resources.slice(0, 2).map((resource) => (
            <ResourceItem key={resource.label} resource={resource} />
          ))}
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Typography
            variant="subtitle2"
            sx={{ color: theme.palette.text.secondary, mb: 1 }}
          >
            Analytics Platforms
          </Typography>
          {resources.slice(2).map((resource) => (
            <ResourceItem key={resource.label} resource={resource} />
          ))}
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Typography
            variant="subtitle2"
            sx={{ color: theme.palette.text.secondary, mb: 1 }}
          >
            Liquidity Pairs
          </Typography>
          {liquidityPairs.map((resource) => (
            <ResourceItem key={resource.label} resource={resource} />
          ))}
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Typography
            variant="subtitle2"
            sx={{ color: theme.palette.text.secondary, mb: 1 }}
          >
            Socials
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2} sx={{ fontSize: "24px" }}>
              <SocialGrid
                telegram="https://t.me/CruxFinance"
                twitter="https://twitter.com/cruxfinance"
              />
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default UseResources;
