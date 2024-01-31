import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography, IconButton, useTheme, CircularProgress
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

type CruxTableHeaderTooltip = {
  index: number;
  text: string;
};

interface ICruxTableScrollProps<T> {
  title?: string;
  data: T[];
  headers: string[][];
  tooltips?: CruxTableHeaderTooltip[];
  actions?: React.ReactNode;
  loading: boolean;
}

const CruxTableScroll = <T extends Record<string, any>>({
  title,
  data,
  headers,
  tooltips,
  actions,
  loading
}: ICruxTableScrollProps<T>) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const tableRef = useRef<HTMLTableElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const [headerStyles, setHeaderStyles] = useState({});
  const [windowWidth, setWindowWidth] = useState(0);
  const [paperWidth, setPaperWidth] = useState(0);

  useEffect(() => {
    window.addEventListener('scroll', updateHeaderPosition);
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (paperRef.current) {
        setPaperWidth(paperRef.current.offsetWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('scroll', updateHeaderPosition);
      window.removeEventListener('resize', handleResize);
    };
  }, [paperRef.current]);

  const isTableWiderThanWindow = windowWidth < (paperWidth + 32)

  const updateHeaderPosition = () => {
    if (headerRef.current && tableRef.current) {
      const tableRect = tableRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;

      // Calculate the initial top position of the table relative to the document
      const initialTableTop = tableRect.top + scrollY;

      // Calculate how much the header should be translated
      // This value should be 0 when the top of the table is at the top of the viewport
      let translateY = scrollY - initialTableTop;
      translateY = Math.max(translateY, 0); // Prevents translating above the top
      translateY = Math.min(translateY, tableRect.height - headerRef.current.offsetHeight); // Prevents translating beyond the table height

      setHeaderStyles({
        transform: `translateY(${translateY}px)`
      });
    }
  };

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onDragStart = (e: React.MouseEvent<Element, MouseEvent>) => {
    if (boxRef.current && isTableWiderThanWindow) {
      setIsDragging(true);
      setStartX(e.clientX - boxRef.current.getBoundingClientRect().left);
      setScrollLeft(boxRef.current.scrollLeft);
    }
  };

  const onDragMove = (e: React.MouseEvent<Element, MouseEvent>) => {
    if (!isDragging || !boxRef.current) return;
    e.preventDefault();

    const x = e.clientX - boxRef.current.getBoundingClientRect().left;
    const walk = (x - startX) * 2; // Speed of scroll
    boxRef.current.scrollLeft = scrollLeft - walk;
  };

  const onDragEnd = () => {
    setIsDragging(false);
  };

  const onMouseDown = (e: React.MouseEvent) => onDragStart(e)
  const onMouseMove = (e: React.MouseEvent) => onDragMove(e)
  const onMouseUpOrLeave = () => onDragEnd()

  const renderRowCell = (item: T, header: string[], index: number) => (
    <TableCell key={`cell-${index}`}>
      {header.map((field) => (
        <div key={field}>
          {typeof item[field] === 'string' ? (
            <Typography>{item[field]}</Typography>
          ) : (
            item[field]
          )}
        </div>
      ))}
    </TableCell>
  );

  return (
    <Box
      ref={boxRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseUpOrLeave}
      onMouseUp={onMouseUpOrLeave}
      sx={{
        overflowX: 'auto',
        scrollbarWidth: 'none', /* For Firefox */
        '&::-webkit-scrollbar': {
          display: 'none' /* For Chrome, Safari, and Opera */
        },
        cursor: isTableWiderThanWindow ? 'auto' : isDragging ? 'grabbing' : 'grab',
        '&:active': {
          cursor: isTableWiderThanWindow ? 'grabbing!important' : 'auto',
        },
        '&:hover': {
          cursor: isTableWiderThanWindow ? 'grab' : 'auto',
        }
      }}
    >
      <Paper
        variant="outlined"
        ref={paperRef}
        onMouseDown={onMouseDown}
        sx={{
          mb: 2,
          mx: '16px',
          // width: 'auto',
          boxSizing: 'border-box',
          minWidth: 'max-content',
          overflowY: 'hidden'
        }}
      >
        <Box
          sx={{
            width: '100%',
            background: theme.palette.background.default,
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: { xs: 'flex-start', md: 'space-between' },
            alignItems: 'center',
            gap: 2,
            p: 2
          }}
        >
          {title &&
            <Box>
              <Typography variant="h5">
                {title}
              </Typography>
            </Box>
          }
          {actions &&
            <Box>
              {actions}
            </Box>}
        </Box>
        {loading
          ? <Box sx={{ py: 4, textAlign: 'center' }}>
            <Box sx={{ mb: 2 }}>
              <CircularProgress size={60} />
            </Box>
            <Typography>
              Loading data...
            </Typography>
          </Box>
          : data.length > 0
            ? <Table ref={tableRef} size="small" sx={{ borderRadius: '0 0 16px 16px' }}>
              <TableHead
                ref={headerRef}
                style={{
                  ...headerStyles,
                  zIndex: 2,
                  position: 'relative',
                  transition: 'transform 0.1s ease',
                  background: theme.palette.background.default
                }}
              >
                <TableRow>
                  {headers.map((headerLabels, index) => (
                    <TableCell
                      key={`header-${index}`}
                      colSpan={1}
                      sx={{ zIndex: 2 }}
                    >
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center'
                      }}>
                        <Box>
                          {headerLabels.map((label, labelIndex) => (
                            <Typography key={`label-${labelIndex}`}>
                              {label}
                            </Typography>
                          ))}
                        </Box>
                        {tooltips && (() => {
                          const tooltip = tooltips.find(t => t.index === index);
                          return tooltip && (
                            <Box>
                              <Tooltip title={tooltip.text} arrow placement="top">
                                <IconButton><InfoOutlinedIcon width={16} height={16} /></IconButton>
                              </Tooltip>
                            </Box>
                          );
                        })()}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody sx={{
                overflowX: 'auto',
                '& > tr:last-child > td': {
                  borderBottom: 'none',
                  '&:first-of-type': {
                    borderRadius: '0 0 0 16px',
                  },
                  '&:last-child': {
                    borderRadius: '0 0 16px 0',
                  }
                }
              }}>
                {data.map((item, index) => (
                  <TableRow key={index}
                    sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(205,205,235,0.05)'
                          : 'rgba(0,0,0,0.05)'
                      },
                      '&:hover': {
                        background: theme.palette.mode === 'dark'
                          ? 'rgba(205,205,235,0.15)'
                          : 'rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    {headers.map((header, index) => renderRowCell(item, header, index))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            : <Box sx={{ py: 4, textAlign: 'center' }}>No data to display</Box>}
      </Paper>
    </Box>
  )
};

export default CruxTableScroll;