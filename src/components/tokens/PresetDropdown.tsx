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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';

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

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
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
      setEditingPreset(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmation !== null) {
      onDelete(deleteConfirmation);
      setDeleteConfirmation(null);
    }
  };

  return (
    <>
      <Button
        endIcon={<ExpandMoreIcon />}
        onClick={handleClick}
        variant="outlined"
        size="small"
      >
        Presets
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
      <Dialog open={Boolean(editingPreset)} onClose={() => setEditingPreset(null)}>
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingPreset(null)}>Cancel</Button>
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