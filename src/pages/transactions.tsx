import { FC } from 'react';
import {
  Container,
  Button,
  Typography,
  // useTheme,
  // useMediaQuery
} from '@mui/material';

const Transactions: FC = () => {
  // HOW TO USE theme: 
  // any time you're in an SX tag, you can do something like this: 
  // color: theme.palette.primary.main
  // check https://mui.com/material-ui/customization/default-theme/ to see what the default palette options are
  // uncomment the line below to use it: 
  // const theme = useTheme() 

  // HOW TO USE useMediaQuery
  // any time you need a trigger based on window width, use useMediaQuery
  // this one is setup to be true if the window is wider than the "sm" preset.
  // You could change it to "md", "lg" or any of the others. 
  // https://mui.com/material-ui/react-use-media-query/
  // uncomment the next line to use it: 
  // const upSm = useMediaQuery(theme.breakpoints.up('sm'))
  return (
    <Container>
      <Typography variant="h1">Transactions</Typography>
      <Button
        href="/"
      >
        Home
      </Button>
    </Container>
  )
}

export default Transactions