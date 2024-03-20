import React, { FC, useState, useEffect } from 'react';
import { Box, Button } from '@mui/material';
import { useRouter } from 'next/router';

interface IChooseReportProps {
  selectedReport: TReport | undefined;
  setSelectedReport: React.Dispatch<React.SetStateAction<TReport | undefined>>;
  setYear: React.Dispatch<React.SetStateAction<number>>;
  reports: TReport[];
}

const ChooseReport: FC<IChooseReportProps> = ({
  selectedReport,
  setSelectedReport,
  setYear,
  reports,
}) => {
  const [localSelectedReport, setLocalSelectedReport] = useState<TReport | undefined>(selectedReport);
  const router = useRouter();

  useEffect(() => {
    setLocalSelectedReport(selectedReport);
  }, [selectedReport]);

  const handleReportSelection = (newReport: TReport) => {
    if (localSelectedReport && localSelectedReport.id === newReport.id) {
      setLocalSelectedReport(undefined);
      setSelectedReport(undefined);
      router.push({
        pathname: router.pathname
      }, undefined, { shallow: true });
    }
    else {
      if (newReport.taxYear) setYear(newReport.taxYear);
      setLocalSelectedReport(newReport);
      setSelectedReport(newReport);
      router.push({
        pathname: router.pathname,
        query: { ...router.query, 'report-id': newReport.id },
      }, undefined, { shallow: true });
    }
  };

  return (
    <Box sx={{
      position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 1,
    }}>
      {reports.map((report) => (
        <Button
          key={report.id}
          variant="text"
          onClick={() => handleReportSelection(report)}
          sx={{
            border: '1px solid rgba(120, 150, 150, 0.25)',
            background: localSelectedReport?.id === report.id ? 'rgba(254, 107, 139, 0.16)' : 'inherit',
            fontWeight: localSelectedReport?.id === report.id ? '700' : 'inherit',
            color: localSelectedReport?.id === report.id ? 'primary.main' : 'inherit',
            '&:hover': {
              background: localSelectedReport?.id === report.id ? 'rgba(254, 107, 139, 0.16)' : 'inherit',
            }
          }}
        >
          {report.customName ?? report.id}
        </Button>
      ))}
    </Box>
  );
};

export default ChooseReport;