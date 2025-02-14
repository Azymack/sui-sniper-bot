const { Ed25519Keypair } = require("@mysten/sui.js/keypairs/ed25519");
const con = require("../db");
const { SuiClient } = require("@mysten/sui.js/client");
const { Transaction } = require("@mysten/sui.js/transactions");
const { TransactionBlock } = require("@mysten/sui.js/transactions");
const { getKeyPairFromSecretKey } = require("../lib/utils");

const suiClient = new SuiClient({ url: process.env.RPC_URL });

const getWallet = async (id) => {
  try {
    const [rows] = await con
      .promise()
      .query("SELECT * FROM wallets WHERE id = ?", [id]);

    return rows[0];
  } catch (err) {
    console.error("getWallets error:", err);
    return;
  }
};

const getWallets = async (tgId) => {
  try {
    const [rows] = await con
      .promise()
      .query("SELECT * FROM wallets WHERE tg_id = ?", [tgId]);

    return rows;
  } catch (err) {
    console.error("getWallets error:", err);
    return [];
  }
};

const createWallet = async (tgId) => {
  const keypair = new Ed25519Keypair();

  // Retrieve the public key (wallet address)
  const publicKey = keypair.getPublicKey().toSuiAddress();

  // Retrieve the private key
  const privateKey = keypair.getSecretKey();

  console.log("Wallet Address:", publicKey);
  console.log("Private Key:", privateKey);

  try {
    await con
      .promise()
      .query(
        "INSERT INTO wallets (tg_id, public_key, private_key, is_archived) VALUES (?, ?, ?, ?)",
        [tgId, publicKey, privateKey, false]
      );
    return {
      publicKey,
      privateKey,
    };
  } catch (err) {
    console.error("createWallet error:", err);
  }
};

const getSuiBalance = async (publicKey) => {
  const balance = await suiClient.getBalance({
    owner: publicKey,
  });
  console.log(balance, "balance");
  const suiBalance = Number(balance.totalBalance) / 1e9;
  return suiBalance.toFixed(2);
};

const withdrawSUI = async (walletAddress, walletId, amount) => {
  try {
    const wallet = await getWallet(walletId);
    const walletBalance = await getSuiBalance(wallet.public_key);
    if (amount > walletBalance) {
      return {
        message: "Insufficient balance",
      };
    }

    const tx = new TransactionBlock();
    const [coin] = tx.splitCoins(tx.gas, [amount]);

    // transfer the split coin to a specific address
    tx.transferObjects([coin], walletAddress);

    suiClient.signAndExecuteTransactionBlock({
      signer: getKeyPairFromSecretKey(wallet.private_key),
      transactionBlock: tx,
    });
    return;
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  getWallets,
  getWallet,
  createWallet,
  getSuiBalance,
  withdrawSUI,
};
