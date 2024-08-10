import React, { FC, useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Avatar,
  useTheme,
  IconButton,
  Badge,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Collapse,
  Modal
} from "@mui/material";
import Grid from '@mui/system/Unstable_Grid/Grid';
import { resolveIpfs } from '@lib/utils/assetsNew';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ListIcon from '@mui/icons-material/List';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewCompactIcon from '@mui/icons-material/ViewCompact';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import CloseIcon from '@mui/icons-material/Close';
import CollectibleInfo from '@components/tokens/CollectibleInfo';

interface ICollectibles {
  tokenList: INftItem[];
}

const Collectibles: FC<ICollectibles> = ({ tokenList }) => {
  const theme = useTheme();
  const [view, setView] = useState<'list' | 'large' | 'small'>('small');
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedToken, setSelectedToken] = useState<INftItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const savedView = localStorage.getItem('collectiblesView');
    if (savedView) {
      setView(savedView as 'list' | 'large' | 'small');
    }

    const savedExpanded = localStorage.getItem('collectiblesExpanded');
    if (savedExpanded !== null) {
      setIsExpanded(JSON.parse(savedExpanded));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('collectiblesView', view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem('collectiblesExpanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  const handleChangeView = (event: React.MouseEvent<HTMLElement>, newView: 'list' | 'large' | 'small') => {
    if (newView !== null) {
      setView(newView);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleTokenClick = (token: INftItem) => {
    setSelectedToken(token);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedToken(null);
  };

  return (
    <>
      <Paper variant="outlined" sx={{ p: 3, width: "100%", position: "relative" }}>
        <Grid container alignItems="center" sx={{ mb: isExpanded ? 2 : 0 }} spacing={2}>
          <Grid xs>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 2 }}>
                NFTs &amp; Collectibles
              </Typography>
            </Box>
          </Grid>
          {isExpanded && (
            <>
              <Grid>
                <IconButton
                  sx={{
                    '&:hover, &.Mui-focusVisible': {
                      background: theme.palette.background.hover
                    },
                    p: '5px',
                    borderRadius: '8px',
                  }}
                >
                  <Badge badgeContent={1} color="primary">
                    <FilterAltIcon />
                  </Badge>
                </IconButton>
              </Grid>
              <Grid>
                <ToggleButtonGroup
                  value={view}
                  size="small"
                  exclusive
                  onChange={handleChangeView}
                  aria-label="view mode"
                >
                  <ToggleButton value="list" aria-label="list view">
                    <ListIcon />
                  </ToggleButton>
                  <ToggleButton value="large" aria-label="large icons view">
                    <ViewModuleIcon />
                  </ToggleButton>
                  <ToggleButton value="small" aria-label="small icons view">
                    <ViewCompactIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            </>
          )}
          <Grid>
            {tokenList.length + ' '} Tokens
          </Grid>
          <Grid>
            <ToggleButton
              value="expand"
              // selected={isExpanded}
              onChange={toggleExpand}
              size="small"
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ToggleButton>
          </Grid>
        </Grid>
        <Collapse in={isExpanded}>
          <Box sx={{ overflowY: 'auto', height: { xs: '100%', lg: '400px' }, maxHeight: "400px", mr: -2, pr: 2 }}>
            <Grid container spacing={2}>
              {tokenList.map((item, i) => {
                // console.log(item)
                return (
                  <Grid
                    xs={view === 'small' ? 6 : view === 'large' ? 12 : 12}
                    sm={view === 'small' ? 4 : view === 'large' ? 6 : 12}
                    md={view === 'small' ? 2 : view === 'large' ? 4 : 12}
                    lg={view === 'small' ? 1 : view === 'large' ? 3 : 12}
                    key={item.tokenId}
                  >
                    <Box
                      onClick={() => handleTokenClick(item)}
                      sx={{
                        display: 'flex',
                        flexDirection: view === 'list' ? 'row' : 'column',
                        alignItems: view === 'list' ? 'center' : 'flex-start',
                        gap: 1,
                        p: 1,
                        borderRadius: '8px',
                        '&:hover': {
                          background: theme.palette.background.paper,
                          cursor: 'pointer',
                          color: theme.palette.primary.main
                        }
                      }}
                    >
                      <Avatar
                        src={item.imgUrl && resolveIpfs(item.imgUrl)}
                        variant="rounded"
                        sx={{
                          width: view === 'small' ? '64px' : view === 'large' ? '240px' : '48px',
                          height: view === 'small' ? '64px' : view === 'large' ? '240px' : '48px',
                          margin: '0 auto',
                          bgcolor: theme.palette.background.hover,
                          '& .MuiAvatar-img': {
                            objectFit: 'contain',
                            width: '100%',
                            height: '100%',
                            // padding: '4px',  // Optional: adds some padding inside the Avatar
                          }
                        }}
                      >
                        {!item.imgUrl && item.type?.toLowerCase() !== 'audio'
                          ? <PrecisionManufacturingIcon fontSize={view === 'small' ? 'medium' : view === 'large' ? 'large' : 'small'} />
                          : !item.imgUrl && item.type?.toLowerCase() === 'audio'
                            ? <AudiotrackIcon fontSize={view === 'small' ? 'medium' : view === 'large' ? 'large' : 'small'} />
                            : <CloseIcon fontSize={view === 'small' ? 'medium' : view === 'large' ? 'large' : 'small'} />}
                      </Avatar>
                      <Box sx={{
                        flexGrow: 1,
                        textAlign: view === 'list' ? 'left' : 'center',
                        width: '100%'
                      }}>
                        <Typography sx={{
                          fontWeight: view === 'large' || view === 'list' ? 700 : 500,
                          fontSize: view === 'large' || view === 'list' ? '0.9rem' : '0.8rem'
                        }}>
                          {item.name}
                        </Typography>
                        <Typography
                          sx={{
                            color: theme.palette.text.secondary,
                            fontSize: '0.8rem'
                          }}
                        >
                          {item.type?.toLowerCase()}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )
              })}
            </Grid>
          </Box>
        </Collapse>
      </Paper>
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        aria-labelledby="collectible-info-modal"
        aria-describedby="modal-modal-description"
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        sx={{
          '& .MuiBackdrop-root': {
            backdropFilter: 'blur(3px)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          },
          '&:focus': {
            outline: 'none',
          },
        }}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: 800,
          height: '80vh',
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.background.default}`,
          boxShadow: 24,
          p: 0,
          borderRadius: 2,
        }}>
          <Box sx={{ height: '100%', width: '100%', overflowY: 'auto', p: 4 }}>
            {selectedToken && <CollectibleInfo tokenDetails={selectedToken} />}
          </Box>
          <IconButton
            onClick={handleCloseModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 1
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Modal>
    </>
  );
};

export default Collectibles;