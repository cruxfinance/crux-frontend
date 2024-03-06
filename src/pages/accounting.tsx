import { FC, useEffect, useState } from 'react';
import {
  Typography,
  Paper,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Container,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { NextPage } from 'next';
import ChooseYear from '@components/accounting/ChooseYear';
import ReportsTable from '@components/accounting/ReportsTable';
import { Currencies } from '@lib/utils/currencies';
import { trpc } from '@lib/trpc';
import { useWallet } from '@contexts/WalletContext';
import Grid from '@mui/system/Unstable_Grid/Grid';
import PayReportDialog from '@components/accounting/PayReportDialog';
import { useAlert } from '@lib/contexts/AlertContext';

const yearsAvailableTRPCQuery = [
  2023, 2024
]

const Accounting: NextPage = () => {
  const { addAlert } = useAlert()

  const [year, setYear] = useState<number>(0)
  const [years, setYears] = useState<number[]>([])
  const [payOpen, setPayOpen] = useState(false)
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
      enabled: sessionStatus === "authenticated"
    }
  )
  const checkPrepaidReports = trpc.accounting.checkPrepaidReports.useQuery(
    undefined,
    {
      enabled: sessionStatus === "authenticated"
    }
  )

  const handlePayForReport = () => {
    console.log("Handle paying for the report here...");
    setPayOpen(true)
  };

  const payReport = trpc.accounting.processPaymentAndCreateReport.useMutation()
  const createReportDev = () => {
    payReport.mutateAsync({ taxYear: year, status: 'AVAILABLE' })
    checkAvailableReport.refetch()
    checkPrepaidReports.refetch()
  }
  const createPrepaidReportDev = () => {
    payReport.mutateAsync({ taxYear: year, status: 'PREPAID' })
    checkAvailableReport.refetch()
    checkPrepaidReports.refetch()
  }

  const handleDownload = (choice: string) => {
    console.log(choice)
  }

  useEffect(() => {
    checkPrepaidReports.refetch()
    checkAvailableReport.refetch()
  }, [payOpen])

  return (
    <Container maxWidth="xl">

      <Paper variant="outlined" sx={{ p: 3, mb: 4, maxWidth: '1200px', mx: 'auto' }}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'row',
          mb: 3
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
                ? <Grid container spacing={2} alignItems="stretch" direction="row" justifyContent="space-evenly">
                  {[{
                    title: 'CSV',
                    description: 'Get your transaction data in CSV format for easy import into spreadsheets or other tools.',
                    link: ''
                  }, {
                    title: 'Koinly',
                    description: 'Export your transaction data in a format compatible with Koinly, a popular cryptocurrency tax software.',
                    link: ''
                  }].map((item, i) => (
                    <Grid xs={12} sm={6} key={`${item.title}-${i}`} sx={{ maxWidth: 345 }}>
                      <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="h5" component="div" gutterBottom>
                            {item.title} format
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.description}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ p: 2 }}>
                          <Button size="small" variant="contained" color="primary" onClick={() => handleDownload(item.title)}>
                            Download {item.title}
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                : <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="h6">You don&apos;t have a paid report for {year}.</Typography>
                  {checkPrepaidReports.data && checkPrepaidReports.data.hasPrepaidReports && <Typography>
                    You have {checkPrepaidReports.data.prepaidReports.length} prepaid report{checkPrepaidReports.data.prepaidReports.length > 1 && 's'} to use.
                  </Typography>}
                  <Button variant="contained" color="primary" onClick={handlePayForReport} sx={{ mt: 2 }}>
                    Pay for Report
                  </Button>
                </Box>
        }
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 4, maxWidth: '1200px', mx: 'auto' }}>
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
      <Paper variant="outlined" sx={{ p: 3, mb: 4, maxWidth: '1200px', mx: 'auto' }}>
        <Typography variant="h5">Dev panel</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
          <Button onClick={createPrepaidReportDev}>
            Add a prepaid report
          </Button>
          <Button onClick={createReportDev}>
            Add a paid report for {year}
          </Button>
          <Button>
            Remove all reports for this user
          </Button>
          <Button onClick={() => {
            addAlert('success', 'Alert added')
            console.log('alert')
          }}>Add alert</Button>
        </Box>
      </Paper>
      <PayReportDialog
        open={payOpen}
        setOpen={setPayOpen}
        taxYear={year}
      />
    </Container>
  )
}

export default Accounting
