const { default: axios } = require("axios");
const {
  BUY_TOKEN,
  SELL_TOKEN,
  WALLET_MENU,
  WITHDRAW_SUI,
  WITHDRAW_TOKEN,
  MAIN_MENU,
  NEW_WALLET,
  NEW_WALLETS,
  CONNECT_WALLET,
  SELECT_WALLET,
  SELECT_WITHDRAW_WALLET,
  EXECUTE_WITHDRAW,
  CANCEL_WITHDRAW,
  SELECT_BUY_WALLET,
  INPUT_BUY_AMOUNT,
  EXECUTE_BUY,
  SELECT_SELL_WALLET,
  EXECUTE_SELL,
  INPUT_SELL_AMOUNT,
} = require("../config/commands");
const { shortenAddress, numberToKOrM } = require("../lib/utils");
const { checkUserExists, createUser } = require("./auth");
const {
  getWallets,
  createWallet,
  getSuiBalance,
  getWallet,
  validateWithdrawSUI,
  executeWithdrawSUI,
  getTokenBalance,
} = require("./wallets");
const { accountAddrOnMainnet, suiAddr } = require("../config/const");
const con = require("../db.js");
const { buy, sell } = require("./swap.js");
require("dotenv").config();

let sessionData;
const initSession = async () => {
  const [rows] = await con.promise().query("SELECT tg_id FROM users");
  let sessionObject = {};
  rows.forEach((row) => {
    sessionObject[row.tg_id] = {
      withdraw: {
        walletId: 0,
        walletAddress: "",
        tokenAddress: "",
        amount: 0,
      },
      buy: {
        walletId: 0,
        tokenAddress: "",
      },
      sell: {
        walletId: 0,
        tokenAddress: "",
      },
    };
  });
  sessionData = sessionObject;
  console.log(sessionData);
  return;
};
initSession();

const replyMainMenu = async (ctx) => {
  let user = await checkUserExists(ctx.from.id);
  if (!user) {
    await createUser(ctx.from);
  }
  user = await checkUserExists(ctx.from.id);

  return {
    html: `Welcome to <b>Sui Sniper Bot</b>! Choose an action:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💰 Buy a Token", callback_data: BUY_TOKEN },
          { text: "💰 Sell a Token", callback_data: SELL_TOKEN },
        ],
        [{ text: "💵 Wallets", callback_data: WALLET_MENU }],
        [
          { text: "Withdraw SUI", callback_data: WITHDRAW_SUI },
          { text: "Withdraw Token", callback_data: WITHDRAW_TOKEN },
        ],
      ],
    },
  };
};

const replyWalletMenu = async (ctx) => {
  const user = ctx.from;
  console.log(ctx, user, user.id);
  const wallets = await getWallets(user.id);
  for (let i in wallets) {
    let balance = await getSuiBalance(wallets[i].public_key);
    wallets[i].balance = balance;
  }
  return {
    html: `Wallets [${wallets.length}]`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "+ New Wallet", callback_data: NEW_WALLET },
          { text: "+ New Wallets", callback_data: NEW_WALLETS },
        ],
        [{ text: "🔗 Connect Wallet", callback_data: CONNECT_WALLET }],
        ...wallets.map((wallet) => {
          return [
            {
              text: `${shortenAddress(wallet.public_key)} | ${
                Number(wallet.balance).toFixed(2) || 0
              } SUI`,
              callback_data: `${SELECT_WALLET}_${wallet.id}`,
            },
          ];
        }),
        [{ text: "← Main Menu", callback_data: MAIN_MENU }],
      ],
    },
  };
};

const replyIndividualWallet = async (walletId) => {
  const wallet = await getWallet(walletId);
  const walletAddress = wallet.public_key;
  const balance = await getSuiBalance(walletAddress);
  return {
    html: `💵 Balance: ${balance} SUI \n💳 Wallet: \n<code>${walletAddress}</code>`,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Withdraw SUI",
            callback_data: `${WITHDRAW_SUI}_${walletId}`,
          },
          {
            text: "Withdraw Tokens",
            callback_data: `${WITHDRAW_TOKEN}_${walletId}`,
          },
        ],
        [
          {
            text: "❌ Delete",
            callback_data: `delete_wallet_${walletId}`,
          },
          { text: "← Wallet Menu", callback_data: WALLET_MENU },
        ],
      ],
    },
  };
};

const replyCreateWallet = async (ctx) => {
  const user = ctx.from;
  const keypair = await createWallet(user.id);
  return {
    html: `✅ Generated new wallet: \n\n 
    Address: \n <code>${keypair.publicKey}</code> \n\n 
    Private Key: \n <code>${keypair.privateKey}</code> \n\n
    ⚠️ Make sure to save this seed phrase using pen and paper only. Do NOT copy-paste it anywhere. You could also import it to your wallet. After you finish saving/importing the wallet credentials, delete this message. The bot will not display this information again.
    `,
    reply_markup: {
      inline_keyboard: [
        [{ text: "← Wallet Menu", callback_data: WALLET_MENU }],
      ],
    },
  };
};

const replyWithdrawSUIMenu = async (ctx, walletId) => {
  walletId = Number(walletId);
  const user = ctx.from;
  console.log(ctx, user, user.id);
  const wallets = await getWallets(user.id);
  for (let i in wallets) {
    let balance = await getSuiBalance(wallets[i].public_key);
    wallets[i].balance = balance;
  }

  return {
    html: `Selected Wallet: \n<code>${
      wallets.find((wallet) => wallet.id === walletId)?.public_key || ""
    }</code>`,
    reply_markup: {
      inline_keyboard: [
        ...wallets.map((wallet) => {
          let checkbox = wallet.id === walletId ? `✅` : `◻`;
          return [
            {
              text: `${checkbox} ${shortenAddress(wallet.public_key)} | ${
                Number(wallet.balance).toFixed(2) || 0
              } SUI`,
              callback_data: `${SELECT_WITHDRAW_WALLET}_${wallet.id}`,
            },
          ];
        }),
        [
          { text: "← Main Menu", callback_data: MAIN_MENU },
          { text: "→ Continue", callback_data: `${WITHDRAW_SUI}_${walletId}` },
        ],
      ],
    },
  };
};

const replyWithdrawSUIConfirm = async (ctx, walletId, amount) => {
  console.log(sessionData, "session");
  const walletAddress = ctx.message.text;
  let html, reply_markup;
  const res = await validateWithdrawSUI(walletAddress, walletId, amount);
  if (res.error) {
    html = res.message;
    reply_markup = { inline_keyboard: [] };
  } else {
    // session
    sessionData[`${ctx.from.id}`].withdraw.walletId = walletId;
    sessionData[`${ctx.from.id}`].withdraw.walletAddress = walletAddress;
    sessionData[`${ctx.from.id}`].withdraw.tokenAddress = suiAddr;
    sessionData[`${ctx.from.id}`].withdraw.amount = amount;

    html = `Please confirm the withdrawal of ${amount} SUI to address <a href="${accountAddrOnMainnet}/${walletAddress}">${shortenAddress(
      walletAddress
    )}</a> \n`;
    reply_markup = {
      inline_keyboard: [
        [{ text: "✅ Confirm", callback_data: EXECUTE_WITHDRAW }],
        [{ text: "❌ Cancel", callback_data: CANCEL_WITHDRAW }],
      ],
    };
  }
  return { html, reply_markup };
};

const replyWithdrawSUIResult = async (ctx) => {
  console.log(sessionData, "session");
  let html, reply_markup;
  if (
    sessionData[`${ctx.from.id}`].withdraw.walletId &&
    sessionData[`${ctx.from.id}`].withdraw.tokenAddress === suiAddr
  ) {
    await executeWithdrawSUI(
      sessionData[`${ctx.from.id}`].withdraw.walletId,
      sessionData[`${ctx.from.id}`].withdraw.walletAddress,
      sessionData[`${ctx.from.id}`].withdraw.amount
    );

    html = `${
      sessionData[`${ctx.from.id}`].withdraw.amount
    } SUI was transfered from to address <a href="${accountAddrOnMainnet}/${
      sessionData[`${ctx.from.id}`].withdraw.walletAddress
    }">${shortenAddress(
      sessionData[`${ctx.from.id}`].withdraw.walletAddress
    )}</a> \n`;
    reply_markup = {
      inline_keyboard: [],
    };
    return { html, reply_markup };
  }
};

const replyBuyToken = async (ctx, walletId) => {
  walletId = Number(walletId);
  console.log(sessionData);
  let tokenAddress, tokenInfo;
  if (walletId) {
    tokenAddress = sessionData[`${ctx.from.id}`].buy.tokenAddress;
    sessionData[`${ctx.from.id}`].buy.walletId = walletId;
  } else {
    tokenAddress = ctx.message.text;
  }
  const res = await axios.get(
    `${process.env.DEXSCREENER_TOKEN_DETAIL}/${tokenAddress}`
  );
  if (!res.data || !res.data.pairs) {
    return {
      html: `Token not found. Please try again.`,
      reply_markup: {
        force_reply: true,
      },
    };
  } else {
    sessionData[`${ctx.from.id}`].buy.tokenAddress = tokenAddress;
    tokenInfo = res.data.pairs.filter((pair) => pair.chainId === "sui")[0];
    console.log(tokenInfo);
  }

  console.log(tokenInfo);

  const wallets = await getWallets(ctx.from.id);
  for (let i in wallets) {
    let balance = await getSuiBalance(wallets[i].public_key);
    let tokenBalance = await getTokenBalance(
      wallets[i].public_key,
      tokenAddress
    );
    wallets[i].balance = balance;
    wallets[i].tokenBalance = tokenBalance;
  }
  const selectedWallet = wallets.find((wallet) => wallet.id === walletId);
  console.log(selectedWallet);
  return {
    html: `
    <b>${tokenInfo.baseToken.name} - ${tokenInfo.baseToken.symbol}</b> \n
Selected Wallet: \n${
      selectedWallet
        ? `<code>${
            wallets.find((wallet) => wallet.id === walletId)?.public_key || ""
          }</code> | ${
            wallets.find((wallet) => wallet.id === walletId)?.balance || ""
          } SUI | ${
            wallets.find((wallet) => wallet.id === walletId)?.tokenBalance || ""
          } ${tokenInfo.baseToken.symbol}`
        : "No wallet selected"
    } 
<b>Token Address:</b> \n<code>${tokenAddress}</code> \n
<b>💵 Price:</b> $${tokenInfo.priceUsd}
<b>💰 Market Cap:</b> $${numberToKOrM(tokenInfo.marketCap)}
<b>💧 Liquidity:</b> $${numberToKOrM(tokenInfo.liquidity.usd)}`,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: `📜 SuiScan`,
            url: `https://suiscan.xyz/mainnet/coin/${tokenAddress}`,
          },
          { text: `🔃`, callback_data: "refresh" },
          {
            text: `📊 Chart`,
            url: `https://dexscreener.com/sui/${tokenAddress}`,
          },
        ],
        ...wallets.map((wallet) => {
          let checkbox = wallet.id === walletId ? `✅` : `◻`;
          return [
            {
              text: `${checkbox} ${shortenAddress(wallet.public_key)} | ${
                Number(wallet.balance).toFixed(2) || 0
              } SUI`,
              callback_data: `${SELECT_BUY_WALLET}_${wallet.id}`,
            },
          ];
        }),
        [
          { text: `Buy 10 SUI`, callback_data: `${EXECUTE_BUY}_10` },
          { text: `Buy 50 SUI`, callback_data: `${EXECUTE_BUY}_50` },
        ],
        [
          { text: `Buy 100 SUI`, callback_data: `${EXECUTE_BUY}_100` },
          { text: `Buy 200 SUI`, callback_data: `${EXECUTE_BUY}_200` },
        ],
        [
          { text: `Buy 500 SUI`, callback_data: `${EXECUTE_BUY}_500` },
          { text: `Buy 1000 SUI`, callback_data: `${EXECUTE_BUY}_1000` },
        ],
        [{ text: `Buy Custom SUI`, callback_data: INPUT_BUY_AMOUNT }],
      ],
    },
  };
};

const replySellToken = async (ctx, walletId) => {
  walletId = Number(walletId);
  console.log(sessionData);
  let tokenAddress, tokenInfo;
  if (walletId) {
    tokenAddress = sessionData[`${ctx.from.id}`].sell.tokenAddress;
    sessionData[`${ctx.from.id}`].sell.walletId = walletId;
  } else {
    tokenAddress = ctx.message.text;
  }
  const res = await axios.get(
    `${process.env.DEXSCREENER_TOKEN_DETAIL}/${tokenAddress}`
  );
  if (!res.data || !res.data.pairs) {
    return {
      html: `Token not found. Please try again.`,
      reply_markup: {
        force_reply: true,
      },
    };
  } else {
    sessionData[`${ctx.from.id}`].sell.tokenAddress = tokenAddress;
    tokenInfo = res.data.pairs.filter((pair) => pair.chainId === "sui")[0];
    console.log(tokenInfo);
  }

  console.log(tokenInfo);

  const wallets = await getWallets(ctx.from.id);
  for (let i in wallets) {
    let balance = await getSuiBalance(wallets[i].public_key);
    let tokenBalance = await getTokenBalance(
      wallets[i].public_key,
      tokenAddress
    );
    wallets[i].balance = balance;
    wallets[i].tokenBalance = tokenBalance;
  }
  const selectedWallet = wallets.find((wallet) => wallet.id === walletId);
  console.log(selectedWallet);
  return {
    html: `
    <b>${tokenInfo.baseToken.name} - ${tokenInfo.baseToken.symbol}</b> \n
Selected Wallet: \n${
      selectedWallet
        ? `<code>${
            wallets.find((wallet) => wallet.id === walletId)?.public_key || ""
          }</code> | ${
            wallets.find((wallet) => wallet.id === walletId)?.balance || ""
          } SUI | ${
            wallets.find((wallet) => wallet.id === walletId)?.tokenBalance || ""
          } ${tokenInfo.baseToken.symbol}`
        : "No wallet selected"
    } 
<b>Token Address:</b> \n<code>${tokenAddress}</code> \n
<b>💵 Price:</b> $${tokenInfo.priceUsd}
<b>💰 Market Cap:</b> $${numberToKOrM(tokenInfo.marketCap)}
<b>💧 Liquidity:</b> $${numberToKOrM(tokenInfo.liquidity.usd)}`,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: `📜 SuiScan`,
            url: `https://suiscan.xyz/mainnet/coin/${tokenAddress}`,
          },
          { text: `🔃`, callback_data: "refresh" },
          {
            text: `📊 Chart`,
            url: `https://dexscreener.com/sui/${tokenAddress}`,
          },
        ],
        ...wallets.map((wallet) => {
          let checkbox = wallet.id === walletId ? `✅` : `◻`;
          return [
            {
              text: `${checkbox} ${shortenAddress(wallet.public_key)} | ${
                Number(wallet.balance).toFixed(2) || 0
              } SUI`,
              callback_data: `${SELECT_SELL_WALLET}_${wallet.id}`,
            },
          ];
        }),
        [
          { text: `Sell 25%`, callback_data: `${EXECUTE_SELL}_25` },
          { text: `Sell 50%`, callback_data: `${EXECUTE_SELL}_50` },
          { text: `Sell 75%`, callback_data: `${EXECUTE_SELL}_75` },
          { text: `Sell 100%`, callback_data: `${EXECUTE_SELL}_100` },
        ],
        [{ text: `Sell Custom %`, callback_data: INPUT_SELL_AMOUNT }],
      ],
    },
  };
};

const replyExecuteBuy = async (ctx, amount) => {
  let html, reply_markup;
  if (!sessionData[`${ctx.from.id}`].buy.walletId) {
    html = "Select wallet";
    reply_markup = { inline_keyboard: [] };
  } else {
    const res = await buy(
      sessionData[`${ctx.from.id}`].buy.tokenAddress,
      amount,
      sessionData[`${ctx.from.id}`].buy.walletId
    );
    if (res.success) {
      html = `Transaction successful. \n <a href="${process.env.SUI_EXPLORER}/tx/${res.digest}">View transaction</a>`;
      reply_markup = { inline_keyboard: [] };
    } else {
      if (res.digest) {
        html = `Transaction failed. Please try again. \n <a href="${process.env.SUI_EXPLORER}/tx/${res.digest}">View transaction</a>`;
        reply_markup = { inline_keyboard: [] };
      } else {
        html = "Unexpected Error";
        reply_markup = { inline_keyboard: [] };
      }
    }
  }
  return { html, reply_markup };
};

const replyExecuteSell = async (ctx, amount) => {
  let html, reply_markup;
  if (!sessionData[`${ctx.from.id}`].sell.walletId) {
    html = "Select wallet";
    reply_markup = { inline_keyboard: [] };
  } else {
    const res = await sell(
      sessionData[`${ctx.from.id}`].sell.tokenAddress,
      amount,
      sessionData[`${ctx.from.id}`].sell.walletId
    );
    if (res.success) {
      html = `Transaction successful. \n <a href="${process.env.SUI_EXPLORER}/tx/${res.digest}">View transaction</a>`;
      reply_markup = { inline_keyboard: [] };
    } else {
      if (res.digest) {
        html = `Transaction failed. Please try again. \n <a href="${process.env.SUI_EXPLORER}/tx/${res.digest}">View transaction</a>`;
        reply_markup = { inline_keyboard: [] };
      } else {
        html = "Unexpected Error";
        reply_markup = { inline_keyboard: [] };
      }
    }
  }
  return { html, reply_markup };
};

module.exports = {
  replyMainMenu,
  replyWalletMenu,
  replyIndividualWallet,
  replyCreateWallet,
  replyWithdrawSUIMenu,
  replyWithdrawSUIConfirm,
  replyWithdrawSUIResult,
  replyBuyToken,
  replyExecuteBuy,
  replySellToken,
  replyExecuteSell,
};
