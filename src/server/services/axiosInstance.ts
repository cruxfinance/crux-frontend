import axios from 'axios';

export const externalApi = axios.create({
  baseURL: `${process.env.CRUX_API}`,
  headers: {
    'Content-type': 'application/json'
  }
});