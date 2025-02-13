const { Ed25519Keypair } = require("@mysten/sui.js/keypairs/ed25519");
const con = require("../db");

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

module.exports = { getWallets, createWallet };
