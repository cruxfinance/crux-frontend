import React from 'react';
import { styled } from '@mui/material/styles';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

interface StarToggleProps {
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const HiddenInput = styled('input')({
  display: 'none',
});

const ToggleWrapper = styled('label')<{ disabled?: boolean }>(({ theme, disabled }) => ({
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  borderRadius: '6px',
  transition: 'all 0.3s ease-in-out',
  opacity: disabled ? 0.5 : 1,
  '&:hover': {
    borderColor: disabled ? 'inherit' : theme.palette.primary.main,
  },
}));

const IconWrapper = styled('div')({
  display: 'flex',
  transition: 'transform 0.3s ease-in-out',
});

const StarToggle: React.FC<StarToggleProps> = ({ checked, onChange, disabled = false }) => {
  return (
    <ToggleWrapper
      sx={{
        border: checked
          ? `1px solid ${disabled ? 'rgba(254, 107, 139, 0.3)' : 'rgba(254, 107, 139, 0.5)'}`
          : `1px solid ${disabled ? 'rgba(200, 225, 255, 0.15)' : 'rgba(200, 225, 255, 0.3)'}`,
      }}
      disabled={disabled}
    >
      <HiddenInput
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <IconWrapper style={{ transform: `rotateY(${checked ? 180 : 0}deg)` }}>
        {checked ? (
          <StarIcon color={disabled ? "disabled" : "primary"} />
        ) : (
          <StarBorderIcon color={disabled ? "disabled" : "inherit"} />
        )}
      </IconWrapper>
    </ToggleWrapper>
  );
};

export default StarToggle;