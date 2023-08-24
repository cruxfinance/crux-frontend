import { FC } from 'react';
import {
  Container,
  Typography,
  Link
  // useTheme,
  // useMediaQuery
} from '@mui/material';

const TradingFloor: FC = () => {
  // const theme = useTheme()
  // const upSm = useMediaQuery(theme.breakpoints.up('sm'))
  return (
    <Container sx={{ textAlign: 'center', py: '20vh' }}>
      <Typography sx={{ fontSize: '24px', fontWeight: 700, mb: '24px' }}>
        Trading floor coming soon.
      </Typography>
      <Link href="/">
        <Typography>
          Go Back Home
        </Typography>
      </Link>
    </Container>
  )
}

export default TradingFloor
