import React, { FC, useState, useEffect } from 'react';
import { Box, Button, useTheme } from '@mui/material';

interface IChooseYearProps {
  year: number;
  setYear: React.Dispatch<React.SetStateAction<number>>;
  years: number[];
}

const ChooseYear: FC<IChooseYearProps> = ({
  year,
  setYear,
  years
}) => {
  const theme = useTheme()
  const [localYear, setLocalYear] = useState<number>(year);

  useEffect(() => {
    setLocalYear(year);
  }, [year]);

  const handleYearChange = (newYear: number) => {
    setLocalYear(newYear);
    setYear(newYear);
  };

  return (
    <Box sx={{
      position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 1,
    }}>
      {years.map((option, index) => (
        <Button
          key={option}
          variant="text"
          onClick={() => handleYearChange(option)}
          sx={{
            border: '1px solid rgba(120, 150, 150, 0.25)',
            background: localYear === option ? 'rgba(254, 107, 139, 0.16)' : 'inherit',
            fontWeight: localYear === option ? '700' : 'inherit',
            color: localYear === option ? 'primary.main' : 'inherit',
            '&:hover': {
              background: localYear === option ? 'rgba(254, 107, 139, 0.16)' : 'inherit',
            }
          }}
        >
          {option}
        </Button>
      ))}
    </Box>
  );
};

export default ChooseYear;