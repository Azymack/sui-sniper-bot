const { Telegraf } = require("telegraf");
const {
  replyMainMenu,
  replyWalletMenu,
  replyCreateWallet,
  replyBuyToken,
  replyIndividualWallet,
  replyWithdrawSUIMenu,
  replyWithdrawSUIConfirm,
  replyWithdrawSUIResult,
  replyExecuteBuy,
  replySellToken,
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
  EXECUTE_WITHDRAW,
  INPUT_BUY_AMOUNT,
} = require("./config/commands");
const con = require("./db");
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
  try {
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
          reply = await replyBuyToken(ctx, 0);
          await ctx.replyWithHTML(reply.html, {
            parse_mode: "HTML",
            reply_markup: reply.reply_markup,
          });
          // if (!reply.reply_markup.force_reply) {
          //   bot.stop();
          // }
        });
        break;
      case SELL_TOKEN:
        await ctx.reply(
          "Reply to this message with the token address that you want to sell:",
          {
            reply_markup: {
              force_reply: true,
            },
          }
        );
        // Listen for user's reply
        bot.on("text", async (ctx) => {
          reply = await replySellToken(ctx, 0);
          await ctx.replyWithHTML(reply.html, {
            parse_mode: "HTML",
            reply_markup: reply.reply_markup,
          });
          // if (!reply.reply_markup.force_reply) {
          //   bot.stop();
          // }
        });
        break;
      case INPUT_BUY_AMOUNT:
        await ctx.replyWithHTML("Enter the amount of token you want to buy:", {
          parse_mode: "HTML",
          reply_markup: { force_reply: true },
        });
        bot.on("text", async (ctx) => {
          let amount = Number(ctx.message.text);
          if (!amount) {
            await ctx.replyWithHTML("Enter correct amount", {
              parse_mode: "HTML",
              reply_markup: { force_reply: true },
            });
          } else {
            reply = await replyExecuteBuy(ctx, amount);
            await ctx.replyWithHTML(reply.html, {
              parse_mode: "HTML",
              reply_markup: reply.reply_markup,
            });
          }
        });
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
      // withdraw SUI
      case WITHDRAW_SUI:
        reply = await replyWithdrawSUIMenu(ctx);
        await ctx.editMessageText(reply.html, {
          parse_mode: "HTML",
          reply_markup: reply.reply_markup,
        });
        break;
      case EXECUTE_WITHDRAW:
        console.log("Execute withdraw");
        reply = await replyWithdrawSUIResult(ctx);
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
        // withdraw
        if (/^select_wallet_\w+$/.test(action)) {
          const walletId = action.split("_")[2];
          reply = await replyIndividualWallet(walletId);
          await ctx.editMessageText(reply.html, {
            parse_mode: "HTML",
            reply_markup: reply.reply_markup,
          });
          break;
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
          let amount; // withdraw amount
          bot.on("text", async (ctx) => {
            console.log("t1", amount);
            if (amount) {
              // if user has alredy input amount, process the withdraw transaction.
              console.log("t2");
              reply = await replyWithdrawSUIConfirm(ctx, walletId, amount);
              console.log(reply);
              await ctx.replyWithHTML(reply.html, {
                parse_mode: "HTML",
                reply_markup: reply.reply_markup,
              });
              console.log("reply");
            } else {
              if (/^\d*\.?\d+$/.test(ctx.message.text)) {
                amount = ctx.message.text;
                await ctx.replyWithHTML(
                  `Enter wallet address to transfer SUI.`,
                  {
                    parse_mode: "HTML",
                    reply_markup: { force_reply: true },
                  }
                );
              } else {
                await ctx.replyWithHTML(`Enter number only.`, {
                  parse_mode: "HTML",
                  reply_markup: { force_reply: true },
                });
              }
            }
          });
          break;
        } else if (/^select_b_wallet_\w+$/.test(action)) {
          const walletId = action.split("_")[3];
          console.log(walletId, "walletId");
          reply = await replyBuyToken(ctx, walletId);
          await ctx.editMessageText(reply.html, {
            parse_mode: "HTML",
            reply_markup: reply.reply_markup,
          });
          break;
        } else if (/^execute_buy_\w+$/.test(action)) {
          let amount = action.split("_")[2];
          reply = await replyExecuteBuy(ctx, amount);
          await ctx.replyWithHTML(reply.html, {
            parse_mode: "HTML",
            reply_markup: reply.reply_markup,
          });
        } else {
          await ctx.reply("Unknown action.");
        }
    }
    await ctx.answerCbQuery();
  } catch (err) {
    console.log(err);
  }
});

// command menu
bot.telegram.setMyCommands([
  { command: MAIN_MENU, description: "Main menu" },
  { command: WALLET_MENU, description: "Manage wallets" },
]);

// Launch the bot
bot.launch();

console.log("Bot is running...");
