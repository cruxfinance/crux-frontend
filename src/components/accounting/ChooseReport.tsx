import React, { FC, useState, useEffect } from 'react';
import { Box, Button } from '@mui/material';

interface IChooseYearProps {
  selectedReport: TReport | undefined;
  setSelectedReport: React.Dispatch<React.SetStateAction<TReport | undefined>>;
  reports: TReport[];
  handlePayForReport: () => void;
}

const ChooseYear: FC<IChooseYearProps> = ({
  selectedReport,
  setSelectedReport,
  reports,
  handlePayForReport
}) => {
  const [localSelectedReport, setLocalSelectedReport] = useState<TReport | undefined>(selectedReport);

  useEffect(() => {
    setLocalSelectedReport(selectedReport);
  }, [selectedReport]);

  const handleReportChange = (newReport: TReport) => {
    if (localSelectedReport === newReport) {
      setLocalSelectedReport(undefined);
      setSelectedReport(undefined);
    }
    else {
      setLocalSelectedReport(newReport);
      setSelectedReport(newReport);
    }
  };

  return (
    <Box sx={{
      position: 'relative', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1,
    }}>
      {reports.map((report) => (
        <Button
          key={report.id}
          variant="text"
          onClick={() => handleReportChange(report)}
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
      <Button variant="outlined" color="primary" onClick={handlePayForReport}>
        Generate new report
      </Button>
    </Box>
  );
};

export default ChooseYear;