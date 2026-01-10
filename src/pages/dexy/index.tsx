import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/dexy/mint",
      permanent: false,
    },
  };
};

const DexyIndex = () => null;

export default DexyIndex;
