import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

type CruxTableHeaderTooltip = {
  index: number;
  text: string;
}

interface ICruxTableProps<T> {
  title?: string;
  data: T[];
  headers: string[][];
  tooltips?: CruxTableHeaderTooltip[];
  actions?: React.ReactNode;
}

// NOTE: YOU MAY HAVE TO SET THE PARENT CONTAINER TO overflow: 'clip' TO FIX IPHONE ISSUES

const CruxTable = <T extends Record<string, any>>({
  title,
  data,
  headers,
  tooltips,
  actions
}: ICruxTableProps<T>) => {
  const [windowWidth, setWindowWidth] = useState(1);
  const [paperWidth, setPaperWidth] = useState(0);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  const sensitivityThreshold = 2;

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (paperRef.current) {
        setPaperWidth(paperRef.current.offsetWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isTableWiderThanWindow = windowWidth < (paperWidth + 32)

  useEffect(() => {
    if (tableRef.current && !isTableWiderThanWindow) {
      // tableRef.current.style.cursor = 'auto'
      tableRef.current.style.removeProperty('user-select')
      tableRef.current.style.transform = `translateX(0px)`
    }
  }, [isTableWiderThanWindow])

  const isDraggingRef = useRef(false);

  const onDragStart = (clientX: number, clientY: number) => {
    if (tableRef.current && isTableWiderThanWindow) {
      isDraggingRef.current = true;
      // tableRef.current.style.cursor = 'grabbing';
      tableRef.current.style.userSelect = 'none';
      setStartX(clientX - translateX);
      setStartY(clientY);
    }
  };

  const onDragMove = (e: React.MouseEvent<Element, MouseEvent> | React.TouchEvent<Element>, clientX: number, clientY: number) => {
    if (isDraggingRef.current && tableRef.current) {
      let deltaX = clientX - startX;
      const deltaY = clientY - startY;

      // Check if the swipe is more horizontal than vertical using the sensitivity threshold
      if (Math.abs(deltaX) > Math.abs(deltaY) * sensitivityThreshold) {
        const maxTranslate = tableRef.current.offsetWidth - tableRef.current.scrollWidth;
        deltaX = Math.min(Math.max(deltaX, maxTranslate), 0);
        setTranslateX(deltaX);
        // tableRef.current.style.cursor = 'grabbing';
        tableRef.current.style.transform = `translateX(${deltaX}px)`;
      }
    }
  };

  const onDragEnd = () => {
    if (tableRef.current && isTableWiderThanWindow) {
      isDraggingRef.current = false;
      // tableRef.current.style.cursor = 'grab'
      tableRef.current.style.removeProperty('user-select');
    }
  };

  const onMouseDown = (e: React.MouseEvent) => onDragStart(e.clientX, e.clientY)
  const onMouseMove = (e: React.MouseEvent) => onDragMove(e, e.clientX, e.clientY)
  const onMouseUpOrLeave = () => onDragEnd()

  const onTouchStart = (e: React.TouchEvent) => onDragStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => onDragMove(e, e.touches[0].clientX, e.touches[0].clientY);
  const onTouchEnd = () => onDragEnd();

  const theme = useTheme();

  const renderRowCell = (item: T, header: string[], index: number) => {
    return (
      <TableCell key={`cell-${index}`}>
        {header.map((field) => {
          const cellContent = item[field];
          return (
            <div key={field}>
              {typeof cellContent === 'string' ? (
                <Typography>{cellContent}</Typography>
              ) : (
                cellContent
              )}
            </div>
          );
        })}
      </TableCell>
    );
  };

  if (data.length > 0) return (
    <Box
      ref={tableRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseUpOrLeave}
      onMouseUp={onMouseUpOrLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      sx={{
        zIndex: 0,
        cursor: isTableWiderThanWindow ? 'auto' : isDraggingRef.current ? 'grabbing' : 'grab',
        '&:active': {
          cursor: isTableWiderThanWindow ? 'grabbing!important' : 'auto',
        },
        '&:hover': {
          cursor: isTableWiderThanWindow ? 'grab' : 'auto',
        }
      }}
    >
      <Paper variant="outlined"
        ref={paperRef}
        sx={{
          mb: 2,
          overflowX: 'visible',
          width: 'auto',
          minWidth: 'max-content'
        }}
      >
        <Box
          sx={{
            width: '100%',
            background: theme.palette.background.default,
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
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
        <Table size="small" sx={{ borderRadius: '0 0 16px 16px' }}>
          <TableHead>
            <TableRow>
              {headers.map((headerLabels, index) => (
                <TableCell
                  key={`header-${index}`}
                  colSpan={1}
                  sx={{
                    position: 'sticky',
                    top: '-1px',
                    zIndex: 2,
                    background: theme.palette.background.default
                  }}
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
            '& > tr:last-child > td': {
              borderBottom: 'none',
              '&:first-of-type': {
                borderRadius: '0 0 0 16px',
              },
              '&:last-child': {
                borderRadius: '0 0 16px 0',
              }
            },
          }}>
            {data.map((item, index) => (
              <TableRow key={index}
                sx={{
                  '&:nth-of-type(odd)': { backgroundColor: theme.palette.mode === 'dark' ? 'rgba(205,205,235,0.05)' : 'rgba(0,0,0,0.05)' },
                  '&:hover': { background: theme.palette.mode === 'dark' ? 'rgba(205,205,235,0.15)' : 'rgba(0,0,0,0.1)' },
                }}
              >
                {headers.map((header, index) => renderRowCell(item, header, index))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
  else return <></>
};

export default CruxTable;