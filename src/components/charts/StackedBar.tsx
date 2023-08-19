import React, { useState, useRef, useEffect } from 'react';
import { Box, useTheme, Tooltip, Typography } from '@mui/material';
import { SxProps } from '@mui/system';
import { Currencies, currencies } from '@src/utils/currencies';
import { ITvl } from '../portfolio/ValueLocked';
import { formatNumber } from '@src/utils/general';
import Grid from '@mui/system/Unstable_Grid/Grid';

interface IStacked extends ITvl {
  currency: Currencies;
  longestBar: number;
}

const StackedBar: React.FC<IStacked> = ({
  value,
  currency,
  longestBar,
  totalTokens,
  earnedTokens,
  redeemedTokens,
  name,
  type,
  issuer,
  apyPct
}) => {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState('0%');

  useEffect(() => {
    if (longestBar) {
      const totalValue = value * (totalTokens)
      const barLengthPct = totalValue / longestBar * 100
      const timer = setTimeout(() => {
        setContainerWidth(`${barLengthPct}%`); // this should match the desired width of the bar.
      }, 1000); // wait for 1 second after component mounts.

      return () => clearTimeout(timer);
    }
  }, [longestBar, currency]);

  const initialTokenTooltip = () => {
    const tokenAmt = totalTokens - (earnedTokens || 0)
    const worth = currencies[currency] + formatNumber(tokenAmt * value)
    return formatNumber(tokenAmt) + ' (' + worth + ') ' + name + ' tokens added'
  }
  const earnedTokensTooltip = () => {
    if (earnedTokens) {
      const worth = currencies[currency] + formatNumber(earnedTokens * value)
      return formatNumber(earnedTokens) + ' (' + worth + ') ' + name + ' tokens earned'
    }
  }
  return (
    <Grid container justifyContent="space-between">
      <Grid xs>
        <Box
          ref={containerRef}
          sx={{
            display: 'flex',
            transition: 'width 0.5s ease',
            width: containerWidth,
            position: 'relative',
            height: '24px'
          }}
        >
          <Tooltip
            title={initialTokenTooltip()}
            arrow
          >
            <Box
              sx={{
                height: '24px',
                py: '6px',
                width: `${(totalTokens - (earnedTokens || 0)) / totalTokens * 100}%`,
              }}
            >
              <Box
                sx={{
                  background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                  height: '100%',
                  transition: 'transform 0.3s ease, width 500ms linear',
                  zIndex: 1,
                  transform: 'scaleY(1)',
                  '&:hover': {
                    zIndex: 2,
                    transform: `scaleY(1.3)`,
                  }
                }}
              />
            </Box>
          </Tooltip>
          {earnedTokens && (
            <Tooltip
              title={earnedTokensTooltip()}
              arrow
            >
              <Box
                sx={{
                  height: '24px',
                  py: '6px',
                  width: `${earnedTokens / totalTokens * 100}%`,
                }}
              >
                <Box
                  sx={{
                    background: `linear-gradient(45deg, rgb(200, 216, 235) 10%, rgb(130, 219, 243) 90%)`,
                    height: '100%',
                    transition: 'transform 0.3s ease, width 500ms linear',
                    zIndex: 1,
                    transform: 'scaleY(1)',
                    '&:hover': {
                      zIndex: 2,
                      transform: `scaleY(1.3)`,
                    }
                  }}
                />
              </Box>
            </Tooltip>
          )}
        </Box>
      </Grid>
      <Grid>
        <Typography
          sx={{
            fontSize: '14px !important',
            color: theme.palette.up.main,
            textAlign: 'right',
            ml: 2
          }}
        >
          {apyPct && apyPct * 0.01 + '%'}
        </Typography>
      </Grid>
    </Grid>

  );
};

export default StackedBar;