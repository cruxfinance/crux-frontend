import React, { FC, useState, useEffect, useRef } from 'react';
import {
  Typography,
  Box,
  Avatar,
  useTheme,
  IconButton,
  Button,
  Badge
} from "@mui/material";
import Grid from '@mui/system/Unstable_Grid/Grid';
import { resolveIpfs } from '@lib/utils/assetsNew';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { INftItem } from './NftList';

interface IFungibleCollectablesList {
  tokenList: INftItem[];
  boxHeight: string;
  setBoxHeight: React.Dispatch<React.SetStateAction<string>>
}

const FungibleCollectablesList: FC<IFungibleCollectablesList> = ({ tokenList, boxHeight }) => {
  const theme = useTheme()

  return (
    <>
      <Grid container alignItems="center" sx={{ mb: 2 }}>
        <Grid xs>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ mr: 2 }}>
              Fungible Collectibles
            </Typography>
            <IconButton
              sx={{
                '&:hover, &.Mui-focusVisible': {
                  background: theme.palette.background.hover
                },
                p: '2px',
                borderRadius: '8px',
              }}
            >
              <Badge
                badgeContent={1}
                color="primary"
              >
                <FilterAltIcon />
              </Badge>
            </IconButton>
          </Box>
        </Grid>
        <Grid>
          {tokenList.length + ' '} Tokens
        </Grid>
      </Grid>
      <Box sx={{ overflowY: 'auto', height: { xs: '100%', lg: '400px' }, maxHeight: "400px", mr: -2, pr: 2 }}>
        {tokenList.map((item, i) => {
          return (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 1,
                // mb: 2,
                p: 1,
                borderRadius: '8px',
                '&:hover': {
                  background: theme.palette.background.paper,
                  cursor: 'pointer',
                  color: theme.palette.primary.main
                }
              }}
              key={item.tokenId}
            >
              <Box sx={{ pt: '2px' }}>
                <Avatar src={item.imgUrl && resolveIpfs(item.imgUrl)} variant="rounded" sx={{ width: '48px', height: '48px' }} />
              </Box>
              <Box sx={{
                flexGrow: 1,
              }}>
                <Typography sx={{
                  fontWeight: 700,
                }}>
                  {item.name}
                </Typography>

                <Typography
                  sx={{ color: theme.palette.text.secondary }}
                >
                  {item.type?.toLowerCase()}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '16px !important', fontWeight: 700 }}>

                </Typography>
              </Box>
            </Box>
          )
        })}
      </Box>
    </>
  );
};

export default FungibleCollectablesList;