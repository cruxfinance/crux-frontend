import { FC } from 'react';
import {
  Container,
  Typography,
  Link
  // useTheme,
  // useMediaQuery
} from '@mui/material';

const NotFound: FC = () => {
  // const theme = useTheme()
  // const upSm = useMediaQuery(theme.breakpoints.up('sm'))
  return (
    <Container sx={{ textAlign: 'center', py: '20vh' }}>
      <Typography variant="h1">
        404
      </Typography>
      <Typography variant="body1" sx={{ mb: '24px' }}>
        This Page Could Not Be Found
      </Typography>
      <Typography variant="body1">
        The page you are looking for does not exist, has been removed, name changed, or is temporarily unavailable.
      </Typography>
      <Link href="/">
        Go Back Home
      </Link>
    </Container>
  )
}

export default NotFound
