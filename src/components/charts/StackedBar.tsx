import React, { useState, useRef, useEffect } from 'react';
import { Box, useTheme, Tooltip, Typography } from '@mui/material';
import { SxProps } from '@mui/system';
import { Currencies, currencies } from '@lib/utils/currencies';
import { ITvl } from '../portfolio/ValueLocked';
import { formatNumber } from '@lib/utils/general';
import Grid from '@mui/system/Unstable_Grid/Grid';

interface IStacked extends ITvl {
  currency: Currencies;
  longestBar: number;
  exchangeRate: number;
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
  apyPct,
  exchangeRate
}) => {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState('0%');

  useEffect(() => {
    if (longestBar) {
      const totalValue = (currency === 'ERG' ? value : value * exchangeRate) * (totalTokens)
      const barLengthPct = totalValue / longestBar * 100
      const timer = setTimeout(() => {
        setContainerWidth(`${barLengthPct}%`); // this should match the desired width of the bar.
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [longestBar, currency]);

  const initialTokenTooltip = () => {
    const tokenAmt = totalTokens - (earnedTokens || 0)
    const worth = currencies[currency] + formatNumber(tokenAmt * (currency === 'ERG' ? value : value * exchangeRate))
    return formatNumber(tokenAmt) + ' (' + worth + ') ' + name
      + (type.includes('YF') ? ' LP' : '')
      + (type.includes('Staked')
        ? ' initial tokens'
        : type.includes('Vested')
          ? ' tokens remaining'
          : ' tokens')
  }
  const earnedTokensTooltip = () => {
    if (earnedTokens) {
      const worth = currencies[currency] + formatNumber(earnedTokens * (currency === 'ERG' ? value : value * exchangeRate))
      return formatNumber(earnedTokens) + ' (' + worth + ') ' + name + ' tokens earned or added'
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
                  borderRadius: earnedTokens ? '2px 0 0 2px' : '2px',
                  transform: 'scaleY(1)',
                  '&:hover': {
                    zIndex: 2,
                    transform: `scaleY(1.3)`,
                  }
                }}
              />
            </Box>
          </Tooltip>
          {earnedTokens !== undefined && earnedTokens > 0 && (
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
                    background: `linear-gradient(45deg, rgb(225, 195, 125) 10%, rgb(255, 195, 96) 90%)`,
                    height: '100%',
                    transition: 'transform 0.3s ease, width 500ms linear',
                    zIndex: 1,
                    borderRadius: '0 2px 2px 0',
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
        {apyPct && (
          <Typography
            sx={{
              fontSize: '14px !important',
              color: theme.palette.up.main,
              textAlign: 'right',
              ml: 2
            }}
          >
            {apyPct * 0.01 + '%'}
          </Typography>
        )}
      </Grid>
    </Grid>

  );
};

export default StackedBar;