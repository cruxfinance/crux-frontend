import { FC } from 'react';
import {
  Container,
  Button,
  Typography,
  Box,
  Paper
  // useTheme,
  // useMediaQuery
} from '@mui/material';
import CandleStickChart from '@src/components/charts/CandleStickChart';

const Charts: FC = () => {
  return (
    <Container maxWidth={false}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
          <Paper sx={{ p: 2, width: '100%', maxWidth: 'calc(100vw - 370px)', mb: 2 }}>
            <CandleStickChart />
          </Paper>
          <Paper sx={{ p: 2, width: '100%' }}>
            <Typography>List of market buys and sells</Typography>
          </Paper>
        </Box>
        <Box sx={{ display: 'flex', flex: '0 0 300px' }}>
          <Paper sx={{ p: 2, width: '100%' }}>
            <Typography>Name</Typography>
            <Typography>Price</Typography>
            <Typography>Liquidity</Typography>
            <Typography>24hr Volume</Typography>
            <Typography>Mkt Cap</Typography>
            <Typography>Total supply</Typography>
            <Typography>Circultating supply</Typography>
            <Typography>TVL</Typography>
            <Button>Add to watchlist</Button>
            <Button>Trade</Button>
            <Typography>Links to token website and socials</Typography>
            <Typography>TokenID with explorer link</Typography>
            <Typography>Description of the token</Typography>
          </Paper>
        </Box>
      </Box>
    </Container>
  )
}

export default Charts