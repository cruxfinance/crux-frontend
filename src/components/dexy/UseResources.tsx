import React, { FC } from "react";
import { Box, Paper, Typography, Link, Chip, useTheme } from "@mui/material";
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

  const documentation: ResourceLink[] = [
    { label: "GitHub", url: "https://github.com/kushti/dexy-stable" },
    {
      label: "Whitepaper",
      url: "https://github.com/kushti/dexy-stable/blob/master/paper-lipics/dexy.pdf",
    },
    {
      label: "Inspiration",
      url: "https://medium.com/@manastaking/use-new-algorithmic-stablecoin-8dfcb43172f6",
    },
  ];

  const contractAddresses: ResourceLink[] = [
    {
      label: "Bank Contract",
      url: "https://ergexplorer.com/addresses#L7ttnK2Comjkxxhyykdat7cCYLN7yrMJz6jCYmQGd5nu8Ma9mHi1JEiCNsxgmxAvDd5vuDMRkjiwQU11JHsizheespaEu4AaH41a2NzR2JbUsaTWVEg7jCBeMXCUbetnrsSLPCqZUb4PhnvE2sGV21E8LGyZyMjtWQqcauyB297d8d7aUCgKsbgZocqRsKZdeH185yxERavMEsb9R8ifqpbD4FVTNwWV6kixAQrMrwzp1wvheEk9t931iQXH9A2X4SJ4JR3eByqcHbWWAHoNs2gL2tpWa6fkVdCs2Kqgd7LgH7u9VFGEzACibuFzanQfNNZsic6Q1ndG97ebFoGVArfMNdvFMbxo1raYuqg4oFEeTY3aNXhhtgCfZWgt2AKz1mtKdZNLRBsWt83LKTiTQLrqBVNBurD2ojUnTV4r5deV",
    },
    {
      label: "LP Contract",
      url: "https://ergexplorer.com/addresses#3W5ZTNTWAwgjcNhctkBccWeUVruJJVLATdYp1makMwoP78WiW2MDjMd2HKxZ2eUwtaSrhtRujuvi27k49msqFVAi7T2BsVHvMCHQ879nf5oJvuXjhEshf76EZgrijL3v3KcEA8CYi511YFtwN1b9u7ZUXeQSSUhqcMvyXMwaCZrpZsgCfbiLxk2DQMrngBMUh96vh7cBfPxZWhsZ9DGUtkGhiquqH3DcgFhpP33rRMjanCRXPAx9SbbphH3RBA2Z9K9j9TvWV6PnUafVGSpixUS8eawxUCiAuUAZHttXK9DjWqzeTDxDH9Tz1gSyjy7aKokwZyoAGTEafuiNQQrJ1UVfuVJCHPUD5v9eomJLmLVqdVDEUm7gj6Qj9a2cEKDfzedex977RkqXvuaeUdaumcikVCr9spzgmv7rhFCovdzAJscwTio98iRGS9rqcnUoTZFN6YmNJPXKe3krdQ7c9yvv74Ad7SBQmvNyuMkchFRnbPRozogKzV3xmTMxpLzagjQ1AdcP",
    },
  ];

  const tradeUse: ResourceLink[] = [
    {
      label: "USE/ERG on Crux",
      url: "https://cruxfinance.io/tokens/a55b8735ed1a99e46c2c89f8994aacdf4b1109bdcf682f1e5b34479c6e392669",
    },
    {
      label: "USE/USDT on BSC",
      url: "https://pancakeswap.finance/swap?inputCurrency=0x04458bD623824e7e7DF04Be619B553FC5f286151&outputCurrency=0x55d398326f99059fF775485246999027B3197955&chain=bsc",
    },
  ];

  const mintUse: ResourceLink[] = [
    { label: "Mint USE on Crux", url: null, comingSoon: true },
  ];

  const transferUse: ResourceLink[] = [
    { label: "Rosen Bridge", url: "https://rosen.tech/" },
  ];

  const ResourceItem: FC<{ resource: ResourceLink }> = ({ resource }) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 0.75,
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
        {/* Documentation & Code */}
        <Grid xs={12} sm={6} md={4}>
          <Typography
            variant="subtitle2"
            sx={{ color: theme.palette.text.secondary, mb: 1 }}
          >
            Documentation & Code
          </Typography>
          {documentation.map((resource) => (
            <ResourceItem key={resource.label} resource={resource} />
          ))}
        </Grid>

        {/* Contract Addresses */}
        <Grid xs={12} sm={6} md={4}>
          <Typography
            variant="subtitle2"
            sx={{ color: theme.palette.text.secondary, mb: 1 }}
          >
            Contract Addresses
          </Typography>
          {contractAddresses.map((resource) => (
            <ResourceItem key={resource.label} resource={resource} />
          ))}
        </Grid>

        {/* Socials */}
        <Grid xs={12} sm={6} md={4}>
          <Typography
            variant="subtitle2"
            sx={{ color: theme.palette.text.secondary, mb: 1 }}
          >
            Socials
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2} sx={{ fontSize: "24px" }}>
              <SocialGrid
                telegram="https://t.me/USE_stablecoin"
                twitter="https://x.com/StableUSE"
              />
            </Grid>
          </Box>
        </Grid>
      </Grid>

      {/* USE Actions Section */}
      <Box
        sx={{ mt: 4, pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          Get USE
        </Typography>

        <Grid container spacing={4}>
          {/* Trade USE */}
          <Grid xs={12} sm={6} md={4}>
            <Typography
              variant="subtitle2"
              sx={{ color: theme.palette.text.secondary, mb: 1 }}
            >
              Trade USE
            </Typography>
            {tradeUse.map((resource) => (
              <ResourceItem key={resource.label} resource={resource} />
            ))}
          </Grid>

          {/* Mint USE */}
          <Grid xs={12} sm={6} md={4}>
            <Typography
              variant="subtitle2"
              sx={{ color: theme.palette.text.secondary, mb: 1 }}
            >
              Mint USE from Algorithmic Bank
            </Typography>
            {mintUse.map((resource) => (
              <ResourceItem key={resource.label} resource={resource} />
            ))}
          </Grid>

          {/* Transfer USE */}
          <Grid xs={12} sm={6} md={4}>
            <Typography
              variant="subtitle2"
              sx={{ color: theme.palette.text.secondary, mb: 1 }}
            >
              Transfer USE Between Blockchains
            </Typography>
            {transferUse.map((resource) => (
              <ResourceItem key={resource.label} resource={resource} />
            ))}
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default UseResources;
