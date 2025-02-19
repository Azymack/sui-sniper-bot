const { Ed25519Keypair } = require("@mysten/sui.js/keypairs/ed25519");
const con = require("../db");
const { SuiClient } = require("@mysten/sui.js/client");
const { TransactionBlock } = require("@mysten/sui.js/transactions");
const { getKeyPairFromSecretKey } = require("../lib/utils");
const { isValidSuiAddress } = require("@mysten/sui.js/utils");

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
  const suiBalance = Number(balance.totalBalance) / 1e9;
  return suiBalance.toFixed(2);
};

const getTokenBalance = async (publicKey, tokenAddress) => {
  try {
    const balance = await suiClient.getBalance({
      owner: publicKey,
      coinType: tokenAddress,
    });
    console.log(balance, "balance");
    const tokenBalance = Number(balance.totalBalance) / 1e9;
    return tokenBalance.toFixed(2);
  } catch (err) {
    console.log(err);
  }
};

const validateWithdrawSUI = async (walletAddress, walletId, amount) => {
  try {
    const wallet = await getWallet(walletId);
    const walletBalance = await getSuiBalance(wallet.public_key);
    if (amount > walletBalance) {
      return {
        error: true,
        message: "Insufficient balance",
      };
    }

    if (!isValidSuiAddress(walletAddress)) {
      return {
        error: true,
        message: "Invalid wallet address.",
      };
    }
    return {};
  } catch (err) {
    console.log(err);
    return {
      error: error,
      message: "Internal error.",
    };
  }
};

const executeWithdrawSUI = async (walletId, walletAddress, amount) => {
  walletId = Number(walletId);
  amount = amount * 1000000000;
  const wallet = await getWallet(walletId);
  const tx = new TransactionBlock();
  const [coin] = tx.splitCoins(tx.gas, [amount]);

  console.log(amount, wallet, "--------------");

  // transfer the split coin to a specific address
  tx.transferObjects([coin], walletAddress);

  suiClient.signAndExecuteTransactionBlock({
    signer: getKeyPairFromSecretKey(wallet.private_key),
    transactionBlock: tx,
  });
};

module.exports = {
  getWallets,
  getWallet,
  createWallet,
  getSuiBalance,
  getTokenBalance,
  validateWithdrawSUI,
  executeWithdrawSUI,
};
