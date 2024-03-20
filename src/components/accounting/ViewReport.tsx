


import React, { FC, useState, useEffect } from 'react';
import { Box, Button, Card, CardActions, CardContent, Paper, ToggleButton, ToggleButtonGroup, Typography, useTheme } from '@mui/material';
import Grid from '@mui/system/Unstable_Grid/Grid';
import ReportsTable from './ReportsTable';
import { Currencies } from '@lib/utils/currencies';
import { trpc } from '@lib/trpc';
import { useAlert } from '@lib/contexts/AlertContext';
import { addressListFlatMap } from '@lib/utils/addresses';
import { slugify } from '@lib/utils/general';
import { LoadingButton } from '@mui/lab';
import { generateDownloadLink } from '@server/utils/s3';
import { GetServerSideProps } from 'next';

const getBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  return `${window.location.protocol}//${window.location.host}`;
}

interface IViewReportProps {
  report: TReport;
}

const ViewReport: FC<IViewReportProps> = ({
  report
}) => {
  const { addAlert } = useAlert()
  const baseUrl = getBaseUrl();
  const flatAddressList = addressListFlatMap(report.wallets)

  const thisReportQuery = trpc.accounting.getReportById.useQuery({
    reportId: report.id
  })

  const [currency, setCurrency] = useState<Currencies>('USD')
  const handleCurrencyChange = (e: any, value: 'USD' | 'ERG') => {
    if (value !== null) {
      setCurrency(value);
    }
  };

  const downloadCsv = trpc.accounting.downloadCsv.useMutation();
  const downloadKoinly = trpc.accounting.downloadKoinly.useMutation();

  const [csvDownloading, setCsvDownloading] = useState(false)
  const [koinlyDownloading, setKoinlyDownloading] = useState(false)
  const [koinlyGenerating, setKoinlyGenerating] = useState(false)
  const handleDownloadCsv = async () => {
    setCsvDownloading(true);

    try {
      const data = await downloadCsv.mutateAsync({
        addresses: flatAddressList,
        queries: {},
        reportId: report.id,
      });

      const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${slugify(report.customName ?? report.id)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      addAlert('success', 'CSV download successfully generated.');
    } catch (error) {
      console.error('Download failed:', error);
      addAlert('error', 'Unable to generate CSV, please contact support.');
    } finally {
      setCsvDownloading(false);
    }
  };

  const handleGenerateKoinly = async () => {
    setKoinlyGenerating(true);
    try {
      console.log(baseUrl)
      // Initiate the Koinly report generation
      const koinly = await downloadKoinly.mutateAsync({
        wallets: report.wallets as unknown as WalletListItem[],
        reportId: report.id,
        baseUrl
      });
      // console.log(koinly)
      if (koinly.job_id) {
        thisReportQuery.refetch()
        addAlert('success', 'Your Koinly report is being prepared. You will be notified when it is ready to download.');
      }
    } catch (error) {
      console.error('Koinly report generation failed:', error);
      addAlert('error', 'Unable to initiate Koinly report generation, please contact support.');
    } finally {
      setKoinlyGenerating(false); // Reset the loading state
    }
  }

  const handleDownloadKoinly = async () => {
    setKoinlyDownloading(true);

    if (thisReportQuery?.data?.reportFilename) {
      try {
        const url = await generateDownloadLink(thisReportQuery?.data?.reportFilename)
        // console.log(url)
        const link = document.createElement('a');
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addAlert('success', 'Koinly download starting.');
      } catch (error) {
        console.error('Download failed:', error);
        addAlert('error', 'Unable to download Koinly file, please contact support.');
      } finally {
        setKoinlyDownloading(false);
      }
    }
  };

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 3, mb: 4, maxWidth: '1200px', mx: 'auto' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Download reports</Typography>
        </Box>
        <Grid container spacing={2} alignItems="stretch" direction="row" justifyContent="space-evenly">
          {[{
            title: 'CSV',
            description: 'Get your transaction data in CSV format for easy import into spreadsheets or other tools.'
          }, {
            title: 'Koinly',
            description: 'Export your transaction data in a format compatible with Koinly, a popular cryptocurrency tax software.'
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
                <CardActions sx={{ p: 2, justifyContent: 'space-between' }}>
                  {item.title === "CSV" ?
                    <LoadingButton
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={handleDownloadCsv}
                      loading={csvDownloading}
                    >
                      Download CSV
                    </LoadingButton>
                    : <>
                      {thisReportQuery?.data?.reportFilename
                        ? <LoadingButton
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={handleDownloadKoinly}
                          loading={koinlyDownloading}
                        >
                          Download File
                        </LoadingButton>
                        : <LoadingButton
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={handleGenerateKoinly}
                          disabled={thisReportQuery?.data?.koinlyGenerating}
                          loading={koinlyGenerating}
                        >
                          {thisReportQuery?.data?.koinlyGenerating
                            ? 'Generating download'
                            : 'Generate File'}
                        </LoadingButton>}
                    </>
                  }
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
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
        <ReportsTable currency={currency} reportId={report.id} addresses={flatAddressList} />
      </Paper>
    </Box>
  );
};

export default ViewReport;