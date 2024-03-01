import { FC, useEffect, useState } from 'react';
import {
  Typography,
  Paper,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Container
} from '@mui/material';
import { NextPage } from 'next';
import ChooseYear from '@components/accounting/ChooseYear';
import ReportsTable from '@components/accounting/ReportsTable';
import { Currencies } from '@lib/utils/currencies';
import { trpc } from '@lib/trpc';
import { useWallet } from '@contexts/WalletContext';

const yearsAvailableTRPCQuery = [
  2023, 2024
]

const Accounting: NextPage = () => {
  const [year, setYear] = useState<number>(0)
  const [years, setYears] = useState<number[]>([])
  useEffect(() => {
    setYears(yearsAvailableTRPCQuery)
  }, [yearsAvailableTRPCQuery]) // replace with TRPC query when its available

  const { sessionStatus } = useWallet()

  const [currency, setCurrency] = useState<Currencies>('USD')
  const handleCurrencyChange = (e: any, value: 'USD' | 'ERG') => {
    if (value !== null) {
      setCurrency(value);
    }
  };

  const checkAvailableReport = trpc.accounting.checkAvailableReport.useQuery(
    {
      taxYear: year
    },
    {
      enabled: sessionStatus === "authenticated",
      refetchOnWindowFocus: false,
      retry: 0
    }
  )

  const handlePayForReport = () => {
    console.log("Handle paying for the report here...");
    // Navigate to payment page or open payment modal
  };

  const payReport = trpc.accounting.processPaymentAndCreateReport.useMutation()
  const createReportDev = () => {
    payReport.mutateAsync({ taxYear: year })
    checkAvailableReport.refetch()
  }

  return (
    <Container maxWidth="xl">

      <Paper sx={{ p: 3, mb: 4, maxWidth: '1200px', mx: 'auto' }}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          // justifyContent: 'space-between',
        }}>
          <Typography variant="h5" sx={{ pr: 2 }}>
            Choose tax year:
          </Typography>
          <ChooseYear
            year={year}
            setYear={setYear}
            years={years}
          />
        </Box>
        {sessionStatus !== "authenticated"
          ? <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="h6">Sign in to view your reports.</Typography>
          </Box>
          : year === 0
            ? <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="h6">Please choose a tax year. </Typography>
            </Box>
            : checkAvailableReport.isLoading
              ? <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="h6">Verifying...</Typography>
              </Box>
              : checkAvailableReport.data?.available
                ? <Box>
                  <Box>
                    Download CSV
                  </Box>
                  <Box>
                    Download Koinly
                  </Box>
                </Box>
                : <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="h6">You don&apos;t have a paid report for {year}.</Typography>
                  <Button variant="contained" color="primary" onClick={handlePayForReport} sx={{ mt: 2 }}>
                    Pay for Report
                  </Button>
                </Box>
        }
      </Paper>
      <Paper sx={{ p: 3, mb: 4, maxWidth: '1200px', mx: 'auto' }}>
        <Typography variant="h5">Dev panel</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
          <Button>
            Add a prepaid report
          </Button>
          <Button onClick={createReportDev}>
            Add a paid report for {year}
          </Button>
          <Button>
            Remove all reports for this user
          </Button>
        </Box>
      </Paper>
      <Paper sx={{ p: 3, mb: 4, maxWidth: '1200px', mx: 'auto' }}>
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
        <ReportsTable currency={currency} year={year} />
      </Paper>

    </Container>
  )
}

export default Accounting
