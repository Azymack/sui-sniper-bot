const { decodeSuiPrivateKey } = require("@mysten/sui.js/cryptography");
const { Ed25519Keypair } = require("@mysten/sui.js/keypairs/ed25519");

const shortenAddress = (address, chars = 4) => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

const numberToKOrM = (num) => {
  num = Number(num);
  let formatedNum;
  if (num > 100000) {
    formatedNum = `${(num / 1000000).toFixed(2)}M`;
  } else if (num > 100) {
    formatedNum = `${(num / 1000).toFixed(2)}K`;
  } else {
    formatedNum = num.toFixed(2);
  }
  return formatedNum;
};

const getKeyPairFromSecretKey = (secretKey) => {
  const keyPair = Ed25519Keypair.fromSecretKey(
    decodeSuiPrivateKey(secretKey).secretKey
  );
  return keyPair;
};

const getPublicKeyFromKeyPair = (keyPair) => {
  return keyPair.getPublicKey().toSuiAddress();
};

module.exports = {
  shortenAddress,
  numberToKOrM,
  getKeyPairFromSecretKey,
  getPublicKeyFromKeyPair,
};
