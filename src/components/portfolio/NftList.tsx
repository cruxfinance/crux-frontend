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

export interface INftItem {
  imgUrl?: string;
  link: string;
  name: string;
  tokenId: string;
  qty?: number;
  price?: number;
  currency?: string;
  rarity?: string;
  artist?: string;
  artistLink?: string;
  collection?: string;
  collectionLink?: string;
  explicit?: boolean;
  type?: string;
  loading?: boolean;
  remainingVest?: number;
}

export type IActiveToken = {
  symbol: string;
  amount: number;
  value: number;
  color: string;
} | null

interface INftList {
  tokenList: INftItem[];
  boxHeight: string;
  setBoxHeight: React.Dispatch<React.SetStateAction<string>>
}

const NftList: FC<INftList> = ({ tokenList, boxHeight, setBoxHeight }) => {
  const theme = useTheme()
  const pieChartRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (pieChartRef.current) {
      const height = pieChartRef.current.offsetHeight;
      setBoxHeight(`${height}px`);
    }
  }, [pieChartRef]);

  return (
    <>
      <Grid container alignItems="center" sx={{ mb: 2 }}>
        <Grid xs>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ mr: 2 }}>
              NFTs
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
      <Box sx={{ overflowY: 'auto', height: boxHeight, mr: -2, pr: 2 }}>
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

export default NftList;