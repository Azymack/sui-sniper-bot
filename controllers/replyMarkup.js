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
} = require("../config/commands");
const { checkUserExists, createUser } = require("./auth");
const { getWallets, createWallet } = require("./wallets");

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
  return {
    html: `Wallets [${wallets.length}]`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "+ New Wallet", callback_data: NEW_WALLET },
          { text: "+ New Wallets", callback_data: NEW_WALLETS },
        ],
        [{ text: "🔗 Connect Wallet", callback_data: CONNECT_WALLET }],
        wallets.map((wallet) => {
          return {
            text: wallet.public_key,
            callback_data: `wallet_${wallet.id}`,
          };
        }),
        [{ text: "← Main Menu", callback_data: MAIN_MENU }],
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

module.exports = {
  replyMainMenu,
  replyWalletMenu,
  replyCreateWallet,
};
