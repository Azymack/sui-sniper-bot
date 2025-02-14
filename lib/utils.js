const { decodeSuiPrivateKey } = require("@mysten/sui.js/cryptography");
const { Ed25519Keypair } = require("@mysten/sui.js/keypairs/ed25519");

const shortenAddress = (address, chars = 4) => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

const numberToKOrM = (num) => {
  num = Number(num);
  let formatedNum;
  if (num > 100000) {
    formatedNum = (num / 1000000).toFixed(2);
  } else if (num > 100) {
    formatedNum = (num / 1000).toFixed(2);
  } else {
    formatedNum = num.toFixed(2);
  }
  return formatedNum;
};

const getKeyPairFromSecretKey = (secretKey) => {
  const keyPair = Ed25519Keypair.fromSecretKey(
    decodeSuiPrivateKey(
      "suiprivkey1qpt0y5epqpw7kp9auakxsgj7hp6cunazmwd5md3ut240rmsjv8m65sgl3a8"
    ).secretKey
  );
  return keyPair;
};

module.exports = { shortenAddress, numberToKOrM, getKeyPairFromSecretKey };
