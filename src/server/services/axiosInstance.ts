import axios from "axios";

export const cruxApi = axios.create({
  baseURL: `${process.env.CRUX_API}`,
  headers: {
    "Content-type": "application/json",
  },
});

export const explorerApi = axios.create({
  baseURL: `${process.env.EXPLORER_API}`,
  headers: {
    "Content-type": "application/json",
  },
});

export const nodeApi = axios.create({
  baseURL: `${process.env.ERGONODE_API}`,
  headers: {
    "Content-type": "application/json",
  },
});
