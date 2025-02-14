const { Telegraf } = require("telegraf");
const {
  replyMainMenu,
  replyWalletMenu,
  replyCreateWallet,
  replyBuyToken,
  replyIndividualWallet,
  replyWithdrawSUIMenu,
  replyWithdrawResult,
} = require("./controllers/replyMarkup");
const {
  BUY_TOKEN,
  SELL_TOKEN,
  WALLET_MENU,
  WITHDRAW_SUI,
  WITHDRAW_TOKEN,
  MAIN_MENU,
  NEW_WALLET,
  NEW_WALLETS,
} = require("./config/commands");
require("dotenv").config();

require("./db");

// Initialize Telegram bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
// Start Command
bot.start(async (ctx) => {
  const reply = await replyMainMenu(ctx);
  await ctx.replyWithHTML(reply.html, {
    reply_markup: reply.reply_markup,
  });
});

bot.command(MAIN_MENU, async (ctx) => {
  const reply = await replyMainMenu(ctx);
  await ctx.replyWithHTML(reply.html, {
    reply_markup: reply.reply_markup,
  });
});

bot.command(WALLET_MENU, async (ctx) => {
  const reply = await replyWalletMenu(ctx);
  await ctx.replyWithHTML(reply.html, {
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
      await ctx.editMessageText(reply.html, {
        parse_mode: "HTML",
        reply_markup: reply.reply_markup,
      });
      break;
    case BUY_TOKEN:
      console.log(ctx);
      await ctx.reply(
        "Reply to this message with the token address that you want to buy:",
        {
          reply_markup: {
            force_reply: true,
          },
        }
      );

      // Listen for user's reply
      bot.on("text", async (ctx) => {
        reply = await replyBuyToken(ctx);
        await ctx.replyWithHTML(reply.html, {
          parse_mode: "HTML",
          reply_markup: reply.reply_markup,
        });
        if (!reply.reply_markup.force_reply) {
          bot.stop();
        }
      });
      break;
    case SELL_TOKEN:
      await ctx.reply("You chose to sell a token.");
      break;
    case WALLET_MENU:
      reply = await replyWalletMenu(ctx);
      await ctx.editMessageText(reply.html, {
        parse_mode: "HTML",
        reply_markup: reply.reply_markup,
      });
      break;
    case NEW_WALLET:
      reply = await replyCreateWallet(ctx);
      await ctx.editMessageText(reply.html, {
        parse_mode: "HTML",
        reply_markup: reply.reply_markup,
      });
      break;
    case NEW_WALLETS:
      await ctx.reply("You chose to create multiple wallets.");
      break;
    case WITHDRAW_SUI:
      reply = await replyWithdrawSUIMenu(ctx);
      await ctx.editMessageText(reply.html, {
        parse_mode: "HTML",
        reply_markup: reply.reply_markup,
      });
      break;
    case WITHDRAW_TOKEN:
      await ctx.reply("You chose to withdraw a token.");
      break;
    case NEW_WALLET:
      reply = await replyCreateWallet(ctx);
      await ctx.editMessageText(reply.html, {
        parse_mode: "HTML",
        reply_markup: reply.reply_markup,
      });
      break;
    case NEW_WALLETS:
      await ctx.reply("You chose to create multiple wallets.");
      break;
    default:
      if (/^select_wallet_\w+$/.test(action)) {
        const walletId = action.split("_")[2];
        reply = await replyIndividualWallet(walletId);
        await ctx.editMessageText(reply.html, {
          parse_mode: "HTML",
          reply_markup: reply.reply_markup,
        });
      } else if (/^select_w_wallet_\w+$/.test(action)) {
        const walletId = action.split("_")[3];
        console.log(walletId, "walletId");
        reply = await replyWithdrawSUIMenu(ctx, walletId);
        await ctx.editMessageText(reply.html, {
          parse_mode: "HTML",
          reply_markup: reply.reply_markup,
        });
        break;
      } else if (/^withdraw_sui_\w+$/.test(action)) {
        const walletId = action.split("_")[2];
        await ctx.replyWithHTML(`Enter SUI amount.`, {
          parse_mode: "HTML",
          reply_markup: { force_reply: true },
        });
        bot.on("text", async (ctx) => {
          let amount = ctx.message.text;
          if (/^\d*\.?\d+$/.test(amount)) {
            bot.stop();
            await ctx.replyWithHTML(`Enter wallet address to transfer SUI.`, {
              parse_mode: "HTML",
              reply_markup: { force_reply: true },
            });
            bot.on("text", async (ctx) => {
              await replyWithdrawResult(ctx, walletId, amount);
              bot.stop();
            });
          } else {
            await ctx.replyWithHTML(`Enter number only.`, {
              parse_mode: "HTML",
              reply_markup: { force_reply: true },
            });
          }
        });
      } else {
        await ctx.reply("Unknown action.");
      }
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
