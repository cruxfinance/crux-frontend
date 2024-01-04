export const bytesToSize = (bytes: any) => {
  var sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "0 Byte";
  var i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
};

export const aspectRatioResize = (
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number
) => {
  const isLandscape: boolean = sourceWidth > sourceHeight;

  let newHeight: number;
  let newWidth: number;

  if (isLandscape) {
    newHeight = (maxWidth * sourceHeight) / sourceWidth;
    newWidth = maxWidth;
  } else {
    newWidth = (maxHeight * sourceWidth) / sourceHeight;
    newHeight = maxHeight;
  }

  return {
    width: newWidth.toString() + "px",
    // height: newHeight.toString() + 'px',
    "&::after": {
      paddingTop: ((newHeight / newWidth) * 100).toString() + "%",
      display: "block",
      content: '""',
    },
  };
};

export const formatNumber = (
  num: number,
  sigFig: number = 3,
  fixed?: boolean,
  noNeg?: boolean
) => {
  const sign = noNeg ? "" : num < 0 ? "-" : "";
  const absNum = Math.abs(num);

  const formatSmallNumber = (number: number) => {
    if (number === 0) return "0";

    const magnitude = Math.floor(Math.log10(number));
    const multiplier = Math.pow(10, sigFig - magnitude - 1);
    const rounded = Math.round(number * multiplier) / multiplier;

    return rounded.toString();
  };

  if (absNum >= 1000000000000) {
    return sign + (absNum / 1000000000000).toFixed(2).replace(/\.0$/, "") + "T";
  } else if (absNum >= 1000000000) {
    return sign + (absNum / 1000000000).toFixed(2).replace(/\.0$/, "") + "B";
  } else if (absNum >= 1000000) {
    return sign + (absNum / 1000000).toFixed(2).replace(/\.0$/, "") + "M";
  } else if (absNum >= 1000) {
    return sign + (absNum / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  } else if (fixed && absNum < 10) {
    return sign + absNum.toFixed(sigFig);
  } else if (absNum >= 1) {
    // Round numbers close to whole numbers
    const rounded =
      Math.round(absNum * Math.pow(10, sigFig)) / Math.pow(10, sigFig);
    return sign + parseFloat(rounded.toFixed(sigFig)).toString();
  } else {
    return sign + formatSmallNumber(absNum);
  }
};

export const stringToUrl = (str: string): string | undefined => {
  if (str) {
    // Replace all spaces with dashes and convert to lowercase
    str = str.replace(/\s+/g, "-").toLowerCase();
    // Remove all special characters using a regular expression
    str = str.replace(/[^\w-]+/g, "");
    return str;
  } else return undefined;
};

export const slugify = (str: string) => {
  const urlSafeChars = /[a-z0-9-]/;
  const slug = str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  let encodedSlug = "";
  for (let i = 0; i < slug.length; i++) {
    encodedSlug += urlSafeChars.test(slug[i])
      ? slug[i]
      : encodeURIComponent(slug[i]);
  }

  return encodeURIComponent(encodedSlug);
};

export const getShortAddress = (address: string): string => {
  let shortAddress = address ? address : "";
  shortAddress =
    shortAddress.length < 10
      ? shortAddress
      : shortAddress.substring(0, 6) +
        "..." +
        shortAddress.substring(shortAddress.length - 4, shortAddress.length);

  return shortAddress;
};
export const getShorterAddress = (
  address: string,
  substring?: number
): string => {
  let shortAddress = address ? address : "";
  shortAddress =
    shortAddress.length < 5
      ? shortAddress
      : shortAddress.substring(0, substring ? substring : 3) +
        ".." +
        shortAddress.substring(
          shortAddress.length - (substring ? substring : 3),
          shortAddress.length
        );

  return shortAddress;
};

export const isErgoMainnetAddress = (value: string): boolean => {
  const base58Chars =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  return (
    value.startsWith("9") &&
    value.length === 51 &&
    [...value].every((char) => base58Chars.includes(char))
  );
};

export const adjustDecimals = (amount: number, decimals: number): number => {
  return amount / Math.pow(10, decimals);
};
