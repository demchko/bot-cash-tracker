import {Markup} from "telegraf";
import {readData, writeData} from "../storage.js";

export function setupExpensesHandlers(bot){
    bot.hears("➕ Додати витрату", (ctx) => {
        ctx.reply(
            "Обери категорію витрат",
            Markup.inlineKeyboard([
                [Markup.button.callback("Їжа", "category_food"), Markup.button.callback("Транспорт", "category_transport"),],
                [Markup.button.callback("Розваги", "category_entertainment"), Markup.button.callback("Інше", "category_other")]
            ])
        );
    })

    bot.action(/^category_/, (ctx) => {
        const category = ctx.callbackQuery.data;
        ctx.session.category = category;
        ctx.reply('Введіть суму витрати');
    })

    bot.on("text", async (ctx) => {
        const category = ctx.session.category;
        if(!category) return;

        const amount = Number(ctx.message.text);
        const userId = String(ctx.chat.id);
        const date = new Date().toISOString().split('T')[0];

        const data = await readData();
        if(!data[userId]) data[userId] = {expenses: []};

        data[userId].expenses.push({category, amount, date});

        await writeData(data);

        ctx.session.category = null;
        ctx.reply(
            "Витрату збережено!",
            Markup.inlineKeyboard([
                [Markup.button.callback("➕ Ще одну", "add_more"),
                    Markup.button.callback("📊 Статистика", "show_stats")]
            ])
        );
    })

    bot.action("add_more", (ctx) => {
        ctx.reply(
            "Обери категорію витрат:",
            Markup.inlineKeyboard([
                [Markup.button.callback("Їжа", "category_food"),
                    Markup.button.callback("Транспорт", "category_transport")],
                [Markup.button.callback("Розваги", "category_entertainment"),
                    Markup.button.callback("Інше", "category_other")]
            ])
        );
    });
}

