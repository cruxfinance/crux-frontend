import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import { useWallet } from '@contexts/WalletContext';
import { useRouter } from 'next/router';

interface PresetDropdownProps {
  presets: { id: string; name: string }[];
  currentSelectedPreset: string | null;
  setCurrentSelectedPreset: React.Dispatch<React.SetStateAction<string | null>>;
  onPresetSelect: (presetId: string) => void;
  onSaveCurrent: () => void;
  onRename: (presetId: string, newName: string) => void;
  onDelete: (presetId: string) => void;
  onUpdateCurrent: (presetId: string) => void;
}

const PresetDropdown: React.FC<PresetDropdownProps> = ({
  presets,
  onPresetSelect,
  onSaveCurrent,
  onRename,
  onDelete,
  onUpdateCurrent,
  currentSelectedPreset,
  setCurrentSelectedPreset
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editingPreset, setEditingPreset] = useState<{ id: string; name: string } | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [editingOpen, setEditingOpen] = useState(false)
  const { sessionData, sessionStatus, setNotSubscribedNotifyDialogOpen } = useWallet();
  const isSubscriber = sessionData?.user.privilegeLevel === "BASIC" || sessionData?.user.privilegeLevel === "PRO" || sessionData?.user.privilegeLevel === "ADMIN";

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isSubscriber) {
      setAnchorEl(event.currentTarget);
    } else setNotSubscribedNotifyDialogOpen(true)
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePresetSelect = (presetId: string) => {
    onPresetSelect(presetId);
    setCurrentSelectedPreset(presetId)
    handleClose();
  };

  const handleEditClick = (event: React.MouseEvent, preset: { id: string; name: string }) => {
    event.stopPropagation();
    setEditingPreset(preset);
    setEditingOpen(true)
    setNewPresetName(preset.name);
  };

  const handleUpdateClick = (event: React.MouseEvent, presetId: string) => {
    event.stopPropagation();
    onUpdateCurrent(presetId);
  };

  const handleDeleteClick = (event: React.MouseEvent, presetId: string) => {
    event.stopPropagation();
    setDeleteConfirmation(presetId);
  };

  const handleRenameSubmit = () => {
    if (editingPreset) {
      onRename(editingPreset.id, newPresetName);
    }
    setEditingOpen(false)
    setEditingPreset(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmation !== null) {
      onDelete(deleteConfirmation);
      setDeleteConfirmation(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleRenameSubmit();
      setEditingOpen(false)
    }
  };

  const theme = useTheme()

  return (
    <>
      <Button
        onClick={handleClick}
        variant="outlined"
        size="small"
        disabled={sessionStatus === "loading"}
        sx={{
          width: '110px',
          justifyContent: 'space-between',
          '& .MuiButton-endIcon': {
            marginLeft: 'auto',
          },
          '& .MuiSvgIcon-root': {
            fontSize: '1.25rem',
            marginLeft: '4px',
          },
          '& .default-text, & .hover-text': {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%'
          },
          '& .default-text': {
            display: 'flex',
          },
          '& .hover-text': {
            display: 'none',
          },
          ...(!isSubscriber && {
            '&:hover': {
              color: theme.palette.getContrastText('#7bd1be'),
              background: '#7bd1be!important',
              borderColor: '#7bd1be!important',
              '& .default-text': {
                display: 'none',
              },
              '& .hover-text': {
                display: 'flex',
              },
            },
          }),
        }}
      >
        <span className="default-text"><Box>Presets</Box><ExpandMoreIcon /></span>
        <span className="hover-text">Get premium</span>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {presets.map((preset) => (
          <MenuItem key={preset.id} onClick={() => handlePresetSelect(preset.id)}
            sx={{
              background: preset.id === currentSelectedPreset ? 'rgba(255,255,255,0.1)' : ''
            }}
          >
            <ListItemText primary={preset.name} />
            <ListItemIcon>
              {preset.id === currentSelectedPreset &&
                <IconButton
                  size="small"
                  onClick={(event) => handleUpdateClick(event, preset.id)}
                >
                  <SaveIcon fontSize="small" />
                </IconButton>
              }
              <IconButton
                size="small"
                onClick={(event) => handleEditClick(event, preset)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(event) => handleDeleteClick(event, preset.id)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemIcon>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={onSaveCurrent}>
          <ListItemIcon>
            <SaveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Save current settings" />
        </MenuItem>
      </Menu>
      <Dialog open={editingOpen} onClose={() => setEditingOpen(false)}>
        <DialogTitle>Rename Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Name"
            type="text"
            fullWidth
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingOpen(false)}>Cancel</Button>
          <Button onClick={handleRenameSubmit}>Save</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteConfirmation !== null} onClose={() => setDeleteConfirmation(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this preset?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmation(null)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PresetDropdown;