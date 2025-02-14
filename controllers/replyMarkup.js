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
} = require("../config/commands");
const { shortenAddress, numberToKOrM } = require("../lib/utils");
const { checkUserExists, createUser } = require("./auth");
const {
  getWallets,
  createWallet,
  getSuiBalance,
  getWallet,
} = require("./wallets");
require("dotenv").config();

const replyMainMenu = async (ctx) => {
  const user = ctx.from;
  console.log(`User Info: ${JSON.stringify(user)}`);
  const userExists = await checkUserExists(user.id);
  if (!userExists) {
    await createUser(user);
  }

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
          { text: "Withraw SUI", callback_data: WITHDRAW_SUI },
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
  console.log(wallets, "wallets");
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
  console.log(wallets, "wallets");
  for (let i in wallets) {
    let balance = await getSuiBalance(wallets[i].public_key);
    wallets[i].balance = balance;
  }

  return {
    html: `Selected Wallet: \n<code>${
      wallets.find((wallet) => wallet.id === walletId)?.public_key
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
          { text: "→ Continue", callback_data: `${WITHDRAW_SUI}_continue` },
        ],
      ],
    },
  };
};

const replyWithdrawResult = async (ctx, walletId, amount) => {
  console.log(ctx, walletId, amount);
};

const replyBuyToken = async (ctx) => {
  const tokenAddress = ctx.message.text;
  console.log(`${process.env.DEXSCREENER_TOKEN_DETAIL}/${tokenAddress}`);
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
    const tokenInfo = res.data.pairs.filter(
      (pair) => pair.chainId === "sui"
    )[0];
    console.log(tokenInfo);
    return {
      html: `
      <b>${tokenInfo.baseToken.name} - ${tokenInfo.baseToken.symbol}</b> \n
<b>Token Address:</b> \n<code>${tokenAddress}</code> \n
<b>💵 Price:</b> $${tokenInfo.priceUsd}
<b>💰 Market Cap:</b> $${numberToKOrM(tokenInfo.marketCap)}
<b>💧 Liquidity:</b> $${numberToKOrM(tokenInfo.liquidity.usd)}`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `SuiScan`,
              url: `https://suiscan.xyz/mainnet/coin/${tokenAddress}`,
            },
            { text: `🔃`, callback_data: "refresh" },
            {
              text: `📊 Chart`,
              url: `https://dexscreener.com/sui/${tokenAddress}`,
            },
          ],
        ],
      },
    };
  }
};

module.exports = {
  replyMainMenu,
  replyWalletMenu,
  replyIndividualWallet,
  replyCreateWallet,
  replyWithdrawSUIMenu,
  replyWithdrawResult,
  replyBuyToken,
};
