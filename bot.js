import 'dotenv/config';
import {Markup, Telegraf} from "telegraf";
import {setupExpensesHandlers} from "./handlers/expenses.js";
import {session} from "telegraf";



const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session({
    defaultSession: () => ({ category: null })
}));

bot.start((ctx) => {
    ctx.reply(
        "Привіт, я бот для розрахунку витрат",
        Markup.keyboard(
            [
                ["➕ Додати витрату", "📊 Статистика"]
            ]).resize()
    );
})

setupExpensesHandlers(bot);

bot.catch((err, ctx) => {
    console.error(`Помилка для ${ctx.updateType}`, err);
});

bot.launch();

console.log("Бот запущено");
