import { FC, useState } from 'react';
import {
  Container,
  Typography,
  Link,
  Paper,
  Box,
  ToggleButton,
  ToggleButtonGroup
  // useTheme,
  // useMediaQuery
} from '@mui/material';
import SideMenu from '@components/layout/SideMenu'
import { NextPage } from 'next';
import accountingNavItems from '@lib/navigation/accountingNav';
import ReportsTable from '@components/accounting/ReportsTable';
import { Currencies } from '@lib/utils/currencies';

const TransactionOverview: NextPage = () => {
  // const theme = useTheme()
  // const upSm = useMediaQuery(theme.breakpoints.up('sm'))
  const [currency, setCurrency] = useState<Currencies>('USD')
  const handleCurrencyChange = (e: any, value: 'USD' | 'ERG') => {
    if (value !== null) {
      setCurrency(value);
    }
  };

  return (
    <SideMenu title="Accounting" navItems={accountingNavItems} noMaxWidth>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2
        }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Transaction overview</Typography>
          </Box>
          <Box>
            <ToggleButtonGroup
              value={currency}
              exclusive
              color="primary"
              onChange={handleCurrencyChange}
              sx={{ mb: 1 }}
              size="small"
            >
              <ToggleButton value="USD">USD</ToggleButton>
              <ToggleButton value="ERG">Erg</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
        <ReportsTable currency={currency} />
      </Paper>
    </SideMenu>
  )
}

export default TransactionOverview
