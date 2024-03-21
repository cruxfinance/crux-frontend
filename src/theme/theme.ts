import type { } from '@mui/lab/themeAugmentation';
import { createTheme, responsiveFontSizes } from "@mui/material/styles";

declare module '@mui/material/styles' {
  interface TypeBackground {
    transparent?: string;
    hover?: string;
  }

  interface Palette {
    up: Palette['primary'];
    down: Palette['primary'];
  }

  interface PaletteOptions {
    up: PaletteOptions['primary'];
    down: PaletteOptions['primary'];
  }
}

const lightPrimaryMain = '#FE6B8B'
const lightSecondaryMain = '#FF8E53'

const lightPrimaryDark = "#FF2D85"
const lightSecondaryDark = "#FF7235"

const mainTheme = [{
  typography: {
    fontFamily: '"Bai Jamjuree", sans-serif',
    fontSize: '16px',
    h1: {
      fontWeight: "700",
    },
    // h2: {
    //   fontWeight: "600",
    // },
    // h3: {
    //   fontSize: "3rem",
    //   fontWeight: "800",
    //   lineHeight: 1.167,
    //   marginBottom: "1rem",
    //   overflowWrap: "break-word",
    //   hyphens: "manual",
    // },
    // h4: {
    //   fontSize: "2rem",
    //   fontWeight: "700",
    //   lineHeight: 1.235,
    //   marginBottom: "0.5rem",
    //   overflowWrap: "break-word",
    //   hyphens: "manual",
    // },
    // h5: {
    //   fontSize: "1.5rem",
    //   fontWeight: "700",
    //   lineHeight: 1.6,
    //   letterSpacing: "0.0075em",
    //   marginBottom: "0.5rem",
    //   overflowWrap: "break-word",
    //   hyphens: "manual",
    // },
    // h6: {
    //   fontSize: "1.2rem",
    //   fontWeight: "600",
    //   lineHeight: 1.3,
    //   letterSpacing: "0.0075em",
    //   marginBottom: "0",
    //   overflowWrap: "break-word",
    //   hyphens: "manual",
    // },
    // overline: {
    //   textTransform: 'uppercase',
    //   fontSize: '0.75rem',
    //   display: 'inline-block',
    // },
    body1: {
      // letterSpacing: '0.04em',
      lineHeight: '1.5'
    },
    body2: {
      lineHeight: '1.5',
      marginBottom: '24px',
    },
  },
  components: {
    MuiContainer: {
      defaultProps: {
        maxWidth: 'xl'
      }
    },
    MuiList: {
      styleOverrides: {
        root: {
          paddingTop: 0,
          paddoingBottom: 0,
        }
      }
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          marginBottom: 0,
          paddingTop: 0,
          paddingBottom: 0
        },
        root: {
          margin: 0
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          // verticalAlign: 'top',
          textTransform: 'none',
        },
        contained: {
          '&:not([disabled])': {
            // color: '#ffffff',
            padding: '4px 12px',
            border: `2px solid ${lightPrimaryMain}`,
            background: `linear-gradient(60deg, ${lightSecondaryMain} 10%, ${lightPrimaryMain} 90%)`,
            transition: 'transform .2s ease-out, background .2s ease-out, box-shadow .1s linear',
            '&:hover': {
              // transform: 'translate(1px, 1px)',
              // boxShadow: `2px 2px 9px -2px ${lightPrimaryMain}`,
              background: `linear-gradient(120deg, #FFA57A 10%, #FD8CA1 90%)`,
            }
          },
        },
        outlined: {
          padding: '6px 12px',
        }
      },
    },
    // MuiPaper: {
    //   defaultProps: {
    //     elevation: 0,
    //   },
    //   styleOverrides: {
    //     root: {
    //       borderRadius: '16px',
    //     }
    //   },
    // },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          borderStyle: 'solid',
          borderWidth: '1px',
          '& input': {
            paddingTop: '7px',
            paddingBottom: '7px',
          },
          '&::before': {
            display: 'none',
          },
          '&::after': {
            display: 'none',
          }
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        filled: {
          paddingTop: '10px',
          paddingBottom: '10px',
        }
      }
    },
    MuiInputAdornment: {
      styleOverrides: {
        root: {
          marginTop: '0 !important'
        }
      }
    },
    MuiTabPanel: {
      styleOverrides: {
        root: {
          paddingLeft: 0,
          paddingRight: 0,
          // paddingTop: '48px',
        }
      }
    },
    MuiLink: {
      styleOverrides: {
        root: {
          // fontFamily: '"Inter", sans-serif',
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'none',
          }
        }
      }
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          '&:-webkit-autofill': {
            boxShadow: '0 0 0 100px rgba(144,144,144,0.001) inset !important',
          },
          '&:-internal-autofill-selected': {
            backgroundColor: 'none !important',
          }
        }
      }
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          height: 8,
          '& .MuiSlider-track': {
            border: 'none',
          },
          '& .MuiSlider-thumb': {
            height: 24,
            width: 24,
            backgroundColor: '#fff',
            border: '2px solid currentColor',
            '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
              boxShadow: 'inherit',
            },
            '&:before': {
              display: 'none',
            },
          },
          '& .MuiSlider-valueLabel': {
            lineHeight: 1.2,
            fontSize: 12,
            background: 'unset',
            padding: 0,
            width: 32,
            height: 32,
            borderRadius: '50% 50% 50% 0',
            transformOrigin: 'bottom left',
            transform: 'translate(50%, -100%) rotate(-45deg) scale(0)',
            '&:before': { display: 'none' },
            '&.MuiSlider-valueLabelOpen': {
              transform: 'translate(50%, -100%) rotate(-45deg) scale(1)',
            },
            '& > *': {
              transform: 'rotate(45deg)',
            },
          },
        }
      }
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 32,
          height: 20,
          padding: 0,
          display: 'flex',
          '&:active': {
            '& .MuiSwitch-thumb': {
              width: 20,
            },
            '& .MuiSwitch-switchBase.Mui-checked': {
              transform: 'translateX(9px)',
            },
          },
          '& .MuiSwitch-switchBase': {
            padding: 2,
            '&.Mui-checked': {
              transform: 'translateX(12px)',
              color: '#fff',
              '& + .MuiSwitch-track': {
                opacity: 1,
              },
            },
          },
          '& .MuiSwitch-thumb': {
            boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%)',
            width: 16,
            height: 16,
            borderRadius: 12,
            transition: 'width 200ms'
          },
          '& .MuiSwitch-track': {
            borderRadius: 16,
            opacity: 1,
            boxSizing: 'border-box',
          },
        }
      }
    }
  }
}];

// const lightPrimaryMain = '#3F03DC'



let lightTheme = createTheme({
  palette: {
    background: {
      default: "rgba(255,255,255,1)",
      paper: 'rgba(237,239,238)',
      transparent: 'rgba(210,210,210,0.5)',
    },
    text: {
      primary: 'rgba(23,21,21,1)',
      secondary: 'rgba(120,140,160,1)',
    },
    primary: {
      // main: "#FF2147",
      main: lightPrimaryMain,
      dark: lightPrimaryDark
    },
    secondary: {
      light: "#3D8AB9",
      main: lightSecondaryMain,
      dark: lightSecondaryDark
    },
    up: {
      main: '#65ce92',
    },
    down: {
      main: '',
    }
  },
  components: {
    MuiLink: {
      styleOverrides: {
        root: {
          color: lightPrimaryMain,
          '&:hover': {
            color: '#000',
          }
        }
      }
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 0, 0, 0.12)'
        }
      }
    },
  }
}, ...mainTheme);

let darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      // default: 'rgb(0,1,8)',
      default: '#0B0C15',
      paper: 'rgba(16,19,30)',
      transparent: 'rgba(12,15,27,0.25)',
      hover: '#212737'
    },
    text: {
      primary: 'rgba(244,244,244,1)',
      secondary: 'rgba(120,130,150,1)',
    },
    primary: {
      // main: "#FF2147",
      main: lightPrimaryMain,
      dark: lightPrimaryDark
    },
    secondary: {
      main: lightSecondaryMain,
      dark: lightSecondaryDark
    },
    up: {
      main: '#89c66d',
    },
    down: {
      main: lightPrimaryMain,
    },
    divider: 'rgba(120,150,150,0.25)',
    contrastThreshold: 4.5,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        outlined: {
          background: 'radial-gradient(at right top, #12121B, #0A0D15)',
          border: '1px solid rgba(200, 225, 255, 0.1)',
          // backdropFilter: "blur(20px)",
          // boxShadow: `10px 10px 20px 5px rgba(0,0,0,0.3)`,
          // '&:before': {
          //   content: '""',
          //   position: 'absolute',
          //   zIndex: -1,
          //   top: 0,
          //   right: 0,
          //   bottom: 0,
          //   left: 0,
          //   // height: '1px',
          //   padding: '1px',
          //   borderRadius: '15px',
          //   background: 'linear-gradient(to right, rgba(30,40,54,0.9), rgba(56,42,60,0.6), rgba(30,40,54,0.9))',
          //   WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          //   mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          //   WebkitMaskComposite: 'xor',
          //   maskComposite: 'exclude'
          // }
        },
        root: {
          borderRadius: '10px',
          backgroundImage: 'none'
        }
      },
    },
    // MuiLink: {
    //   styleOverrides: {
    //     root: {
    //       '&:hover': {
    //         color: 'rgba(244,244,244,1)',
    //       }
    //     }
    //   }
    // },
    MuiTooltip: {
      styleOverrides: {
        popper: {
          '& .MuiTooltip-tooltip': {
            backgroundColor: 'rgba(36,41,50,1)',
            '& .MuiTooltip-arrow': {
              '&:before': {
                backgroundColor: 'rgba(36,41,50,1)'
              }
            }
          },
        }
      },
      defaultProps: {
        enterTouchDelay: 0
      }
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(200, 225, 255, 0.3)',
          background: 'radial-gradient(at right top, #12121B, #0A0D15)',

          // backdropFilter: "blur(20px)",
          // boxShadow: `10px 10px 20px 5px rgba(0,0,0,0.8)`,
          // '&:before': {
          //   content: '""',
          //   position: 'absolute',
          //   zIndex: -1,
          //   top: 0,
          //   right: 0,
          //   bottom: 0,
          //   left: 0,
          //   // height: '1px',
          //   padding: '1px',
          //   borderRadius: '15px',
          //   background: 'linear-gradient(to right, rgba(30,40,54,0.4), rgba(56,32,70,0.3), rgba(80,20,70,0.3), rgba(16,20,34,0.8))',
          //   WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          //   mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          //   WebkitMaskComposite: 'xor',
          //   maskComposite: 'exclude'
          // },
          '&:hover': {
            borderColor: lightPrimaryMain
          }
        }
      }
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase': {
            '&.Mui-checked': {
              '& + .MuiSwitch-track': {
                backgroundColor: lightPrimaryMain
              },
            },
          },
          '& .MuiSwitch-track': {
            backgroundColor: 'rgba(255,255,255,.35)',
          },
        }
      }
    }
  }
}, ...mainTheme);

export const LightTheme = responsiveFontSizes(lightTheme);

export const DarkTheme = responsiveFontSizes(darkTheme);