import { FC } from 'react';
import {
  Container,
  Button,
  Typography,
  // useTheme,
  // useMediaQuery
} from '@mui/material';

const UnlockWallet: FC = () => {
  // const theme = useTheme() 
  // const upSm = useMediaQuery(theme.breakpoints.up('sm'))
  return (
    <Container>
      <Typography variant="h1">Unlock Wallet</Typography>
      <Button
        href="/"
      >
        Home
      </Button>
    </Container>
  )
}

export default UnlockWallet
