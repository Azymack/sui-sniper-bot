const { suiDecimal } = require("../config/const");
const con = require("../db");
const { buyToken, sellToken } = require("../lib/txUtils");
const { getKeyPairFromSecretKey } = require("../lib/utils");

const buy = async (tokenAddress, amount, walletId) => {
  try {
    const [rows] = await con
      .promise()
      .query("SELECT * FROM wallets WHERE id = ?", [walletId]);
    const wallet = rows[0];
    const keyPair = getKeyPairFromSecretKey(wallet.private_key);
    amount = Number(amount) * suiDecimal;
    const res = await buyToken(amount, tokenAddress, keyPair);
    console.log(res, " ==================");
    return res;
  } catch (err) {
    console.log(err);
  }
};
const sell = async (tokenAddress, amount, walletId) => {
  try {
    const [rows] = await con
      .promise()
      .query("SELECT * FROM wallets WHERE id = ?", [walletId]);
    const wallet = rows[0];
    const keyPair = getKeyPairFromSecretKey(wallet.private_key);
    amount = Number(amount) * suiDecimal;
    const res = await sellToken(amount, tokenAddress, keyPair);
    console.log(res, " ==================");
    return res;
  } catch (err) {
    console.log(err);
  }
};

module.exports = { buy, sell };
