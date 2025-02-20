const { SuiClient } = require("@mysten/sui.js/client");
const { TransactionBlock } = require("@mysten/sui.js/transactions");
const { suiAddr, minGasBudget } = require("../config/const");
const { getPublicKeyFromKeyPair } = require("./utils");
const { getTokenBalance } = require("../controllers/wallets");

const suiClient = new SuiClient({ url: process.env.RPC_URL });

async function getPoolId(tokenAddress) {
  const url = `https://api-sui.cetus.zone/v2/sui/stats_pools?order_by=-fees&limit=100&has_mining=true&has_farming=true&no_incentives=true&display_all_pools=true&coin_type=${suiAddr},${tokenAddress}`;
  const poolId = await fetch(url).then((res) =>
    res.json().then((res) => {
      console.log(res);
      const poolId = res.data.lp_list[0].address;
      console.log("Pool ID:", poolId);
      return poolId;
    })
  );
  return poolId;
}

const getCoinObjIdArr = async (walletAddr, coinAddr = suiAddr) => {
  const arr = await suiClient
    .getCoins({
      owner: walletAddr,
      coinType: coinAddr,
    })
    .then((coins) => {
      return coins.data.map((coin) => coin.coinObjectId);
    });
  return arr;
};

const buyToken = async (amount, tokenAddress, keyPair) => {
  try {
    const tx = new TransactionBlock();
    const poolId = await getPoolId(tokenAddress);
    const primaryCoinObjId = (
      await getCoinObjIdArr(getPublicKeyFromKeyPair(keyPair), tokenAddress)
    )[0];

    console.log(poolId, primaryCoinObjId);

    const gasBudget = amount > minGasBudget ? amount : minGasBudget;
    tx.setGasBudget(gasBudget);
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
    tx.moveCall({
      target: `${process.env.CETUS_CLMM_PACKAGE_ID}::pool_script_v2::swap_b2a`,
      arguments: [
        tx.object(process.env.CETUS_CONTRACT_ADDR), //
        tx.object(poolId),
        tx.object(primaryCoinObjId),
        coin,
        tx.pure.bool(true),
        tx.pure.u64(amount), // amount
        tx.pure.u64(0), // amount_limit
        tx.pure.u128("79226673515401279992447579055"), // getDefaultSqrtPriceLimit, hardcode
        tx.pure("0x6"), // clock
      ],
      typeArguments: [tokenAddress, suiAddr],
    });

    const res = await suiClient.signAndExecuteTransactionBlock({
      signer: keyPair,
      transactionBlock: tx,
    });
    const txRes = await suiClient
      .getTransactionBlock({
        digest: res.digest,
        options: { showEffects: true },
      })
      .then((txb) => {
        console.log(txb);
        return {
          digest: txb.digest,
          success: txb.effects.status.status === "success",
        };
        // return { digest: res.digest };
      });
    return txRes;
  } catch (err) {
    console.log(err);
    return { digest: null };
  }
};

const sellToken = async (amount, tokenAddress, keyPair) => {
  try {
    const totalTokenBalance = await getTokenBalance(
      getPublicKeyFromKeyPair(keyPair),
      tokenAddress
    );
    amount = (amount * totalTokenBalance) / 100;
    const tx = new TransactionBlock();
    const poolId = await getPoolId(tokenAddress);
    const primaryCoinObjId = (
      await getCoinObjIdArr(getPublicKeyFromKeyPair(keyPair), tokenAddress)
    )[0];

    console.log(poolId, primaryCoinObjId);
    const gasBudget = amount > minGasBudget ? amount : minGasBudget;
    tx.setGasBudget(100000000);
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
    tx.moveCall({
      target: `${process.env.CETUS_CLMM_PACKAGE_ID}::pool_script_v2::swap_a2b`,
      arguments: [
        tx.object(process.env.CETUS_CONTRACT_ADDR), //
        tx.object(poolId),
        tx.object(primaryCoinObjId),
        coin,
        tx.pure.bool(true),
        tx.pure.u64(amount), // amount
        tx.pure.u64(0), // amount_limit
        tx.pure.u128("4295048016"), // getDefaultSqrtPriceLimit, hardcode
        tx.pure("0x6"), // clock
      ],
      typeArguments: [tokenAddress, suiAddr],
    });

    const res = await suiClient.signAndExecuteTransactionBlock({
      signer: keyPair,
      transactionBlock: tx,
    });
    const txRes = await suiClient
      .getTransactionBlock({
        digest: res.digest,
        options: { showEffects: true },
      })
      .then((txb) => {
        console.log(txb);
        return {
          digest: txb.digest,
          success: txb.effects.status.status === "success",
        };
        // return { digest: res.digest };
      });
    return txRes;
  } catch (err) {
    console.log(err);
    return { digest: null };
  }
};

module.exports = { buyToken, sellToken };
