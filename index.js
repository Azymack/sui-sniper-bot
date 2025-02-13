const { Telegraf } = require("telegraf");
const {
  replyMainMenu,
  replyWalletMenu,
  replyCreateWallet,
} = require("./controllers/replyMarkup");
const {
  BUY_TOKEN,
  SELL_TOKEN,
  WALLET_MENU,
  WITHDRAW_SUI,
  WITHDRAW_TOKEN,
  MAIN_MENU,
  NEW_WALLET,
} = require("./config/commands");
const { initializeDatabase } = require("./db");
const { checkUserExists, createUser } = require("./controllers/auth");
require("dotenv").config();

require("./db");

// Initialize Telegram bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Start Command
bot.start(async (ctx) => {
  const reply = await replyMainMenu(ctx);
  ctx.replyWithHTML(reply.html, {
    reply_markup: reply.reply_markup,
  });
});

bot.command(MAIN_MENU, async (ctx) => {
  const reply = await replyMainMenu(ctx);
  ctx.replyWithHTML(reply.html, {
    reply_markup: reply.reply_markup,
  });
});

bot.command(WALLET_MENU, async (ctx) => {
  const reply = await replyWalletMenu(ctx);
  ctx.replyWithHTML(reply.html, {
    reply_markup: reply.reply_markup,
  });
});

// Handle callback queries
bot.on("callback_query", async (ctx) => {
  const action = ctx.callbackQuery.data;
  let reply;

  switch (action) {
    case MAIN_MENU:
      reply = await replyMainMenu(ctx);
      ctx.editMessageText(reply.html, {
        parse_mode: "HTML",
        reply_markup: reply.reply_markup,
      });
      break;
    case BUY_TOKEN:
      await ctx.reply("You chose to buy a token.");
      break;
    case SELL_TOKEN:
      await ctx.reply("You chose to sell a token.");
      break;
    case WALLET_MENU:
      reply = await replyWalletMenu(ctx);
      ctx.editMessageText(reply.html, {
        parse_mode: "HTML",
        reply_markup: reply.reply_markup,
      });
      break;
    case WITHDRAW_SUI:
      await ctx.reply("You chose to withdraw SUI.");
      break;
    case WITHDRAW_TOKEN:
      await ctx.reply("You chose to withdraw a token.");
      break;
    case NEW_WALLET:
      reply = await replyCreateWallet(ctx);
      ctx.editMessageText(reply.html, {
        parse_mode: "HTML",
        reply_markup: reply.reply_markup,
      });
      break;
    default:
      await ctx.reply("Unknown action.");
  }

  // Answer the callback query to remove the loading state
  await ctx.answerCbQuery();
});

// command menu
bot.telegram.setMyCommands([
  { command: MAIN_MENU, description: "Main menu" },
  { command: WALLET_MENU, description: "Manage wallets" },
]);

// Launch the bot
bot.launch();

console.log("Bot is running...");
