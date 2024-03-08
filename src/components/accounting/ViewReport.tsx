


import React, { FC, useState, useEffect } from 'react';
import { Box, Button, Card, CardActions, CardContent, Paper, ToggleButton, ToggleButtonGroup, Typography, useTheme } from '@mui/material';
import Grid from '@mui/system/Unstable_Grid/Grid';
import ReportsTable from './ReportsTable';
import { Currencies } from '@lib/utils/currencies';
import { trpc } from '@lib/trpc';
import { useAlert } from '@lib/contexts/AlertContext';


interface IViewReportProps {
  report: TReport;
}

const ViewReport: FC<IViewReportProps> = ({
  report
}) => {
  const { addAlert } = useAlert()

  const [currency, setCurrency] = useState<Currencies>('USD')
  const handleCurrencyChange = (e: any, value: 'USD' | 'ERG') => {
    if (value !== null) {
      setCurrency(value);
    }
  };

  const downloadCsv = trpc.accounting.downloadCsv.useMutation();

  const handleDownload = async (type: string) => {
    if (type === 'CSV') {
      const download = await downloadCsv.mutateAsync(
        {
          addresses: report.addresses,
          queries: {},
          reportId: report.id,
        },
        {
          onSuccess: (data) => {
            const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report-${report.id}.csv`); // or another filename
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
          },
          onError: (error) => {
            console.error('Download failed:', error);
          },
        }
      );
      if (download) {
        addAlert('success', 'CSV download successfully generated')
      }
    }
    if (type === 'Koinly') {
      // const download = await downloadCsv.mutateAsync(
      //   {
      //     addresses: report.addresses,
      //     queries: {},
      //     reportId: report.id,
      //   },
      //   {
      //     onSuccess: (data) => {
      //       const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
      //       const url = URL.createObjectURL(blob);
      //       const link = document.createElement('a');
      //       link.href = url;
      //       link.setAttribute('download', `report-${report.id}.csv`); // or another filename
      //       document.body.appendChild(link);
      //       link.click();
      //       link.parentNode?.removeChild(link);
      //     },
      //     onError: (error) => {
      //       console.error('Download failed:', error);
      //     },
      //   }
      // );
      // if (download) {
      addAlert('success', 'Koinly download successfully generated')
      // }
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
                <CardActions sx={{ p: 2 }}>
                  <Button size="small" variant="contained" color="primary" onClick={() => handleDownload(item.title)}>
                    Download {item.title}
                  </Button>
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
        <ReportsTable currency={currency} reportId={report.id} addresses={report.addresses} />
      </Paper>
    </Box>
  );
};

export default ViewReport;