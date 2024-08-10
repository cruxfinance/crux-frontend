import React, { FC, useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  Skeleton,
  CircularProgress
} from '@mui/material'
import Link from '@components/Link'
import HideImageIcon from '@mui/icons-material/HideImage';
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import axios from 'axios';
import { resolveIpfs } from '@lib/utils/assetsNew';

const textSx = {
  mb: 0,
  fontSize: '16px',
  lineHeight: 1.25
}

const boldTextSx = {
  mb: 0,
  fontSize: '16px',
  lineHeight: 1.25,
  fontWeight: 700
}

interface ICollection {
  name: string;
  link: string;
}

interface IArtist {
  name: string;
  link: string;
}

interface IAssetInfoV2 {
  name: string;
  description: string;
  decimals: number;
  minted: number;
  hash: string;
  link: string;
  royalties: any[];
  properties: {
    [key: string]: string;
  };
  levels: any;
  stats: any;
  collection: string;
  additional_info: {
    explicit: string;
  };
}

interface IAssetInfo {
  name: string;
  description: string;
  decimals: number;
  minted: number;
  token_type: string;
  token_meta_data: {
    NFTCollection: {
      version: string;
      meta_data: {
        V1: {
          logo_url: string;
          featured_img_url: string;
          banner_img_url: string;
          category: string;
          socials: any[];
          minting_expiry: number;
          additional_info: null | any;
        }
      }
    }
  }
}

interface ParsedNFT {
  description: string;
  traits: Record<string, string>;
  audioLink?: string;
}

const CollectibleInfo: FC<{
  tokenDetails: INftItem
}> = ({ tokenDetails }) => {
  const theme = useTheme()
  const upSm = useMediaQuery(theme.breakpoints.up('sm'))

  const [assetInfoV2, setAssetInfoV2] = useState<IAssetInfoV2 | null>(null)
  const [collectionInfo, setCollectionInfo] = useState<IAssetInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAssetInfo = async () => {
      setLoading(true);
      try {
        // Step 1: Fetch asset info v2 to get the collection tokenId
        const assetInfoV2Response = await axios.post<IAssetInfoV2[]>(`${process.env.CRUX_API}/crux/asset_info_v2`, [tokenDetails.tokenId]);
        const assetInfoV2Data = assetInfoV2Response.data[0];

        const parsedDescription = parseNFTDescription(assetInfoV2Data.description)

        setAssetInfoV2({
          ...assetInfoV2Data,
          description: parsedDescription.description,
          properties: {
            ...assetInfoV2Data.properties,
            ...parsedDescription.traits
          }
        });

        console.log(assetInfoV2Data.description)

        // Step 2: Fetch collection info using the collection tokenId
        if (assetInfoV2Data.collection) {
          const collectionInfoResponse = await axios.get<IAssetInfo>(`${process.env.CRUX_API}/crux/asset_info/${assetInfoV2Data.collection}`);
          setCollectionInfo(collectionInfoResponse.data);
        }
      } catch (error) {
        console.error("Error fetching asset info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssetInfo();
  }, [tokenDetails.tokenId]);

  return (
    <>
      {loading
        ? <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
        : <Grid container direction="row" justifyContent="center" alignItems="flex-start" columnSpacing={5} sx={{ mb: '24px' }}>
          <Grid item md={6} xs={12}>
            <Box sx={{ position: 'relative', mb: '24px', width: '100%', transform: 'height 0.2s linear' }}>
              {tokenDetails.imgUrl ? (
                <img src={resolveIpfs(tokenDetails.imgUrl)} height='100%' width='100%' style={{ borderRadius: '8px' }} alt="NFT Image" crossOrigin="anonymous" />
              ) : (
                <Box sx={{ width: '100%', pb: '100%', background: theme.palette.background.paper, borderRadius: '8px' }}>
                  {tokenDetails.type === 'AUDIO' ? (
                    <AudiotrackIcon sx={{ position: 'absolute', color: theme.palette.divider, fontSize: '12rem', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                  ) : (
                    <HideImageIcon sx={{ position: 'absolute', color: theme.palette.divider, fontSize: '12rem', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                  )}
                </Box>
              )}
            </Box>
          </Grid>
          <Grid item md={6} xs={12} sx={{ pr: { xs: 0, md: '24px' } }}>
            <Typography variant="h3" sx={{ mb: 1 }}>
              {assetInfoV2?.name || tokenDetails.name}
            </Typography>
            <Typography variant="body2">
              {assetInfoV2?.description}
            </Typography>

            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ pb: '8px!important' }}>
                {collectionInfo && (
                  <Grid container justifyContent="space-between" sx={{ mb: 1 }}>
                    <Grid item>
                      <Typography sx={boldTextSx}>Collection:</Typography>
                    </Grid>
                    <Grid item>
                      <Typography color="text.secondary" sx={textSx}>
                        {collectionInfo.name}
                      </Typography>
                    </Grid>
                  </Grid>
                )}

                <Grid container justifyContent="space-between" sx={{ mb: 1 }}>
                  <Grid item>
                    <Typography sx={boldTextSx}>Token Type:</Typography>
                  </Grid>
                  <Grid item>
                    <Typography color="text.secondary" sx={textSx}>
                      {tokenDetails.type}
                    </Typography>
                  </Grid>
                </Grid>

                {assetInfoV2?.additional_info?.explicit && assetInfoV2?.additional_info.explicit === '\u0001' && (
                  <Grid container justifyContent="space-between" sx={{ mb: 1 }}>
                    <Grid item>
                      <Typography sx={boldTextSx}>Explicit:</Typography>
                    </Grid>
                    <Grid item>
                      <Typography color="text.secondary" sx={textSx}>
                        TRUE
                      </Typography>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>

            {collectionInfo && (
              <Card sx={{ mb: 2 }}>
                <CardContent sx={{ pb: '8px!important' }}>
                  <Typography variant="h5">Collection Information</Typography>
                  <Grid container justifyContent="space-between" sx={{ mb: 1 }}>
                    <Grid item>
                      <Typography sx={boldTextSx}>Category:</Typography>
                    </Grid>
                    <Grid item>
                      <Typography color="text.secondary" sx={textSx}>
                        {collectionInfo.token_meta_data.NFTCollection.meta_data.V1.category}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {assetInfoV2 && assetInfoV2.properties && (
              <Card sx={{ mb: 2 }}>
                <CardContent sx={{ pb: '8px!important' }}>
                  <Typography variant="h5">Properties</Typography>
                  {Object.entries(assetInfoV2.properties).map(([key, value]) => {
                    // console.log(key, value);
                    return (
                      <Grid container justifyContent="space-between" key={key} sx={{ mb: 1 }}>
                        <Grid item>
                          <Typography sx={boldTextSx}>{key}:</Typography>
                        </Grid>
                        <Grid item>
                          <Typography color="text.secondary" sx={textSx}>
                            {value}
                          </Typography>
                        </Grid>
                      </Grid>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      }
    </>
  )
};

export default CollectibleInfo;

const parseNFTDescription = (descriptionString: string): ParsedNFT => {
  try {
    const data = JSON.parse(descriptionString);

    // Handle the complex rarity structure
    if (Array.isArray(data) && data.length === 1 && 'rarity' in data[0] && 'amount' in data[0]) {
      const complexRarity = data[0];
      const rarityString = complexRarity.rarity
        .map((r: { rarity: any; odds: any; }) => `${r.rarity}: ${r.odds}%`)
        .join(', ');
      return {
        description: "Complex Rarity NFT",
        traits: {
          amount: complexRarity.amount.toString(),
          rarities: rarityString
        }
      };
    }

    // Handle ERGnomes
    if (data["721"] && Object.keys(data["721"]).some(key => key.startsWith("ergnomes-"))) {
      const ergnomeKey = Object.keys(data["721"]).find(key => key.startsWith("ergnomes-"));
      if (ergnomeKey) {
        const ergnome = data["721"][ergnomeKey];
        const description = ergnome.description || "";
        const traits: Record<string, string> = {};

        for (const [key, value] of Object.entries(ergnome)) {
          if (!["image", "name", "description"].includes(key)) {
            if (key === "traits" && Array.isArray(value)) {
              traits[key] = JSON.stringify(value);
            } else {
              traits[key] = value as string;
            }
          }
        }

        return { description, traits };
      }
    }

    // Handle Audio NFT
    if (Array.isArray(data) && data[0]?.audio) {
      const audioNFT = data[0];
      return {
        description: `Audio NFT: ${audioNFT.name}`,
        traits: {
          "track #": audioNFT["track #"],
          edition: audioNFT.edition
        },
        audioLink: audioNFT.audio
      };
    }

    // Handle Utility NFT (Vesting Token)
    if (data["Vesting Round"]) {
      return {
        description: "Ergopad Vesting Token",
        traits: data as Record<string, string>
      };
    }

    // Handle Cybercitizens
    if (data["721"] && Object.keys(data["721"])[0]) {
      const citizenKey = Object.keys(data["721"])[0];
      const citizen = data["721"][citizenKey];
      return {
        description: `Cybercitizen #${citizen.Cybercitizen || citizenKey}`,
        traits: { Cybercitizen: citizen.Cybercitizen || citizenKey, ...citizen.traits }
      };
    }

    // Handle simple traits object
    if (data["721"] && Object.keys(data["721"])[0] && data["721"][Object.keys(data["721"])[0]].traits) {
      return {
        description: "NFT with traits",
        traits: data["721"][Object.keys(data["721"])[0]].traits
      };
    }

    // If none of the above, return the entire data as traits
    return {
      description: "Generic NFT",
      traits: data
    };

  } catch (error) {
    // If it's not JSON, return it as is
    return { description: descriptionString, traits: {} };
  }
}