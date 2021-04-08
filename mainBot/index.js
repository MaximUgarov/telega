const {
    Telegraf,
    Scenes,
    session,
    Markup,
    Stage
} = require('telegraf');
const QiwiBillPaymentsAPI = require('@qiwi/bill-payments-node-js-sdk');
const fs = require('fs');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser')
const {
    BOT_TOKEN,
    API_URL
} = require('./config');
const WizardScene = require('telegraf/scenes/wizard');
const {
    enter,
    leave
} = Stage;
const bot = new Telegraf(BOT_TOKEN);
bot.telegram.setWebhook(`https://dac73b982a99.ngrok.io/bot`)
const server = express();
const Scene = require('telegraf/scenes/base')
const {
    exec
} = require("child_process");
server.use(bodyParser.json());
server.use(bodyParser.json({
    type: 'application/vnd.api+json'
}));
server.use(bodyParser.urlencoded({
    extended: true
}))
server.listen(3001, err => {
    if (err) {
        throw err;
    }
    console.log(`Bot has been start`)
})


bot.hears('Отменить Создание проекта', async ctx => {
    ctx.reply(`Создание отменено`,
        Markup.keyboard([
            ['Создать проект', 'Моя подписка'],
        ])
        .resize()
        .extra(),
    )
})

server.post('/bot', ctx => {
    const {
        body
    } = ctx.request
    bot.proccessUpdate(body)
    ctx.status = 200
})

bot.start((ctx) =>
    ctx.reply(`Привет ${ctx.chat.username}`,
        Markup.keyboard([
            ['Создать проект', 'Моя подписка'],
        ])
        .resize()
        .extra(),
    ),
);


let data = {}
let rateObj = {
    time: "",
    name: "",
    apiKey: "",
    price: ""
}
const scene1 = new Scene('scene1')
scene1.enter((ctx) => {
    console.log(ctx.scene.state)
    ctx.scene.state.data = {};
    if (ctx.scene.state.text === undefined) {
        ctx.reply('Введи название нового проекта:', {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `Отменить создание проекта`,
                        callback_data: `close`
                    }],
                ]
            }
        })
    } else {
        ctx.reply(`${ctx.scene.state.text}`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `Отменить создание проекта`,
                        callback_data: `close`
                    }],
                ]
            }
        })
    }
})
scene1.on(`callback_query`, ctx => {
    if (ctx.update.callback_query.data === "close") {
        ctx.deleteMessage()
        ctx.scene.leave()
        ctx.reply('Создание отменено', Markup.keyboard([
                ['Создать проект', 'Мои проекты'],
            ])
            .resize()
            .extra()
        );
    }
})
scene1.on('message', ctx => {
    if (ctx.message.text !== undefined) {
        ctx.scene.enter('scene2')
    } else {
        ctx.scene.enter('scene1', {
            text: "Не наябывай меня уебан и вводи название"
        })
    }
})


const scene2 = new Scene('scene2')
scene2.enter((ctx) => {
    data.nameProject = ctx.message.text
    if (ctx.scene.state.text === undefined) {
        ctx.reply(`Проект: ${ctx.message.text} \nТеперь подключи свой первый ресурс.\n
        1. Добавь меня @sytenerTele_bot в администраторы подключаемого канала\n
        2. Необходимо разрешение Добавление участников\n
        3. Перешли мне любое сообщение из канала (прямо в этот чат)\n\n
        Я жду..`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `Отменить создание проекта`,
                        callback_data: `close`
                    }],
                ]
            }
        })
    } else {
        ctx.reply(`${ctx.scene.state.text}`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `Отменить создание проекта`,
                        callback_data: `close`
                    }],
                ]
            }
        })
    }

})
scene2.on('message', ctx => {
    if (ctx.update.message.forward_from_chat !== undefined) {
        bot.telegram.callApi('getChatAdministrators', {
            chat_id: ctx.update.message.forward_from_chat.id,
        }).then(data => {
            let arr = data.find(item => item.user.username === "sytenerTele_bot" && item.status === 'administrator' && item.can_invite_users === true)
            console.log(arr)
            if (arr) {
                axios({
                    method: 'get',
                    url: `${API_URL}/projects`,
                    params: {
                        chatID: ctx.update.message.forward_from_chat.id,
                    }
                }).then(res => {
                    if (res.data.length === 0) {
                        ctx.scene.enter('scene3')
                        data.chatId = ctx.update.message.forward_from_chat.id
                    } else {
                        let checkObj = res.data.find(item => item.ownerId !== `${ctx.chat.id}`)
                        if (checkObj) {
                            ctx.scene.enter('scene2', {
                                text: `Этот чат уже добавлен другим дагистанцем`
                            })
                        } else {
                            ctx.scene.enter('scene3')
                            data.chatId = ctx.update.message.forward_from_chat.id
                        }
                    }
                }).catch(err => {
                    ctx.scene.enter('scene2')
                })
            }
        }).catch(err => {
            if (err) {
                ctx.scene.enter('scene2', {
                    text: `Волк позорный добавь в чат и сделай админом меня хуй ты ебливый`
                })
            }
        })
    } else {
        ctx.scene.enter('scene2', {
            text: `Волк позорный перешли сообщение а не хуй свой пришли`
        })
    }

})

scene2.on(`callback_query`, ctx => {
    if (ctx.update.callback_query.data === "close") {
        ctx.deleteMessage()
        ctx.scene.leave()
        ctx.reply('Создание отменено', Markup.keyboard([
                ['Создать проект', 'Мои проекты'],
            ])
            .resize()
            .extra()
        );
    }
})

const scene3 = new Scene('scene3')
scene3.enter((ctx) => {
    if (ctx.scene.state.text === undefined) {
        ctx.reply(`
        Теперь нужно подключить твоего личного бота, с которым будут общаться твои подписчики.
        \nДля этого:
        \n1. Открой отца ботов - @BotFather
        \n2. Создай нового бота (команда /newbot)
        \n3. Отец отправит тебе API token твоего личного бота (формата 123456789:ASDFABC-DEF1234gh) - скопируй этот токен и отправь его мне.
        \nВажно! Не используй бота, которого ты привязывал к другому сервису (или к другим ботам)!
        \n\nЯ жду токен..`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `Отменить создание проекта`,
                        callback_data: `close`
                    }],
                ]
            }
        });
    } else {
        ctx.reply(`${ctx.scene.state.text}`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `Отменить создание проекта`,
                        callback_data: `close`
                    }],
                ]
            }
        });
    }
})
scene3.on(`callback_query`, ctx => {
    if (ctx.update.callback_query.data === "close") {
        ctx.deleteMessage()
        ctx.scene.leave()
        ctx.reply('Создание отменено', Markup.keyboard([
                ['Создать проект', 'Мои проекты'],
            ])
            .resize()
            .extra()
        );
    }
})
scene3.on('text', ctx => {
    axios({
        method: 'get',
        url: `https://api.telegram.org/bot${ctx.message.text}/getMe`,
    }).then((res) => {
        if (res.data.ok === true && res.data.result.is_bot === true) {
            ctx.scene.enter('scene4')
        } else {
            ctx.scene.enter('scene3', {
                text: "нюхай бебру черт или скинь нормальный токен выполнив инструкцию"
            })
        }
    }).catch((err) => {
        ctx.scene.enter('scene3', {
            text: "нюхай бебру черт или скинь нормальный токен выполнив инструкцию"
        })
    })

})


const scene4 = new Scene('scene4')
scene4.enter((ctx) => {
    if (data.botToken === undefined) {
        data.botToken = ctx.update.message.text
    }
    rateObj.apiKey = data.botToken
    ctx.reply(`Создайте новый тарифный план\nвыбирите срок подписки`, {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: `день`,
                    callback_data: `1`
                }],
                [{
                    text: `неделя`,
                    callback_data: `7`
                }],
                [{
                    text: `2 недели`,
                    callback_data: `14`,
                }],
                [{
                    text: `месяц`,
                    callback_data: `30`,
                }],
                [{
                    text: `бессрочный(разовая оплата)`,
                    callback_data: `2000`,
                }],
                [{
                    text: `Отменить создание проекта`,
                    callback_data: `close`
                }]
            ]
        }
    })
})
scene4.on(`callback_query`, ctx => {
    if (ctx.update.callback_query.data === "close") {
        ctx.deleteMessage()
        ctx.scene.leave()
        ctx.reply('Создание отменено', Markup.keyboard([
                ['Создать проект', 'Мои проекты'],
            ])
            .resize()
            .extra()
        );
    } else {
        ctx.scene.enter('scene5')
    }
})

scene4.on(`callback_query`, ctx => {
    if (ctx.update.callback_query.data === "close") {
        ctx.deleteMessage()
        ctx.scene.leave()
        ctx.reply('Создание отменено', Markup.keyboard([
                ['Создать проект', 'Мои проекты'],
            ])
            .resize()
            .extra()
        );
    }
})

const scene5 = new Scene('scene5')
scene5.enter((ctx) => {
    rateObj.time = ctx.update.callback_query.data
    ctx.reply(`Напиши мне название тарифа`, {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: `Отменить создание проекта`,
                    callback_data: `close`
                }],
            ]
        }
    })
})
scene5.on(`callback_query`, ctx => {
    if (ctx.update.callback_query.data === "close") {
        ctx.deleteMessage()
        ctx.scene.leave()
        ctx.reply('Создание отменено', Markup.keyboard([
                ['Создать проект', 'Мои проекты'],
            ])
            .resize()
            .extra()
        );
    }
})
scene5.on('text', enter('scene6'))

const scene6 = new Scene('scene6')
scene6.enter((ctx) => {
    rateObj.name = ctx.message.text
    if (ctx.scene.state.text === undefined) {
        ctx.reply(`Напиши мне стоимость тарифа`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `Отменить создание проекта`,
                        callback_data: `close`
                    }],
                ]
            }
        })
    } else {
        ctx.reply(`${ctx.scene.state.text}`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `Отменить создание проекта`,
                        callback_data: `close`
                    }],
                ]
            }
        })
    }
})

scene6.on('text', ctx => {
    let text = ctx.message.text
    if (text && ctx.message.text !== undefined) {
        if (!isNaN(text)) {
            ctx.scene.enter('scene7')
        } else {
            ctx.scene.enter('scene6', {
                text: "ты тупой или да число пиши тут"
            })
        }
    }
})
scene6.on(`callback_query`, ctx => {
    if (ctx.update.callback_query.data === "close") {
        ctx.deleteMessage()
        ctx.scene.leave()
        ctx.reply('Создание отменено', Markup.keyboard([
                ['Создать проект', 'Мои проекты'],
            ])
            .resize()
            .extra()
        );
    }
})

const scene7 = new Scene('scene7')
scene7.enter((ctx) => {
    rateObj.price = ctx.message.text
    axios({
        method: 'post',
        url: `${API_URL}/rates`,
        headers: {
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({
            days: rateObj.time,
            name: rateObj.name,
            apiBotKey: rateObj.apiKey,
            price: rateObj.price
        })
    }).then(data => {
        // console.log(data)
    }).catch(err => {
        console.log(err)
    })
    ctx.reply(`Ты можешь настроить ещё один или перейти к завершающему этапу:
    нажми на соответствующую кнопку..`, {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: `Добавить еще тариф`,
                    callback_data: `add`
                }],
                [{
                    text: `Следущий этап`,
                    callback_data: `next`
                }],
                [{
                    text: `Отменить создание проекта`,
                    callback_data: `close`
                }]
            ]
        }
    })
})
scene7.on(`callback_query`, ctx => {
    if (ctx.update.callback_query.data === "add") {
        ctx.scene.enter('scene4')
    }
    if (ctx.update.callback_query.data === "next") {
        ctx.scene.enter('scene8')
    }
    if (ctx.update.callback_query.data === "close") {
        ctx.deleteMessage()
        ctx.scene.leave()
        ctx.reply('Создание отменено', Markup.keyboard([
                ['Создать проект', 'Мои проекты'],
            ])
            .resize()
            .extra()
        );
    }
})

const scene8 = new Scene('scene8')
scene8.enter((ctx) => {
    if (ctx.scene.state.text === undefined) {
        ctx.reply(`Теперь тебе нужно получить API token qiwi, для этого перейди по сыллке https://qiwi.com/api ,создай токен и напиши его мне...`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `Отменить создание проекта`,
                        callback_data: `close`
                    }],
                ]
            }
        })
    } else {
        ctx.reply(`${ctx.scene.state.text}`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `Отменить создание проекта`,
                        callback_data: `close`
                    }],
                ]
            }
        })
    }

})

scene8.on('text', ((ctx) => {
    data.qiwiToken = ctx.message.text
    const qiwiApi = new QiwiBillPaymentsAPI(ctx.message.text)
    const QIWISettings = {
        amount: 21,
        billId: "02",
        comment: "fdg",
        currency: "RUB",
        expirationDateTime: qiwiApi.getLifetimeByDay(1),
    }
    qiwiApi.createBill(QIWISettings.billId, QIWISettings).then(data => { //проверка киви токена
        if (data) {
            axios({
                method: 'get',
                url: `${API_URL}/rates`,
                params: {
                    apiBotKey: data.botToken
                }
            }).then(res => {
                if (res) {
                    axios({
                        method: 'post',
                        url: `${API_URL}/projects`,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        data: JSON.stringify({
                            name: data.nameProject,
                            chatID: `${data.chatId}`,
                            botToken: data.botToken,
                            qiwiToken: data.qiwiToken,
                            ownerId: `${ctx.chat.id}`,
                        })
                    }).then(data => {
                        if (data.data.id && data.data.name && data.data.chatID && data.data.botToken && data.data.qiwiToken && data.data.ownerId) {
                            exec(`cd ../telegramProject && pm2 start "npm run dev ${data.data.botToken} ${data.data.qiwiToken} ${data.data.id}" --name ${data.data.id}`, (error, stdout, stderr) => {
                                if (error) {
                                    console.log(`error: ${error.message}`);
                                    return;
                                }
                                if (stderr) {
                                    console.log(`stderr: ${stderr}`);
                                    return;
                                }
                                console.log(`stdout: ${stdout}`);
                            });
                        }
                    }).catch(err => {
                        console.log(err)
                    })
                }
            }).catch(err => {
                console.log(err)
            })

            ctx.reply('Бот успешно создан', Markup.keyboard([
                    ['Создать проект', 'Мои проекты'],
                ])
                .resize()
                .extra()
            );
            ctx.scene.leave()
        }
        qiwiApi.cancelBill(QIWISettings.billId).then(data => {

        }).catch(err => {
            console.log(err)
        })
    }).catch(err => {
        ctx.scene.enter("scene8", {
            text: "Веди нормальный токен урод"
        })
    })



}))
scene8.on(`callback_query`, ctx => {
    if (ctx.update.callback_query.data === "close") {
        ctx.deleteMessage()
        ctx.scene.leave()
        ctx.reply('Создание отменено', Markup.keyboard([
                ['Создать проект', 'Мои проекты'],
            ])
            .resize()
            .extra()
        );
    }
})

const stage = new Stage([scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8])

bot.use(session());
bot.use(stage.middleware());
bot.hears('Создать проект', ctx => {
    ctx.scene.enter('scene1');
});
// bot.command('exit', ctx => {
//     ctx.deleteMessage()
//     ctx.scene.leave()
//     ctx.reply('Создание отменено', Markup.keyboard([
//             ['Создать проект', 'Мои проекты'],
//         ])
//         .resize()
//         .extra()
//     );
// });

bot.hears('Мои проекты', async ctx => {
    axios({
        method: 'get',
        url: `${API_URL}/projects`,
        params: {
            ownerId: `${ctx.chat.id}`
        }
    }).then(res => {
        if (res.data) {
            if (res.data.length > 0) {
                let message = res.data.map(item => `Название проекта: ${item.name}\nID проекта в системе: ${item.id}`)

                ctx.reply(`ваша хуета`, {
                    reply_markup: {
                        inline_keyboard: res.data.map(item => [{
                            text: item.name,
                            callback_data: item.id
                        }])
                    }
                })
            }
        }
        if (res.data.length === 0) {
            ctx.reply(`Потеряйся нахуй от сюда черт ебаный или создай проект`)
        }
    }).catch(err => {
        console.log(err)
    })
})

bot.hears('1', async ctx => {
    ctx.scene.enter("scene8")
})

bot.launch();


console.log('Бот запущен')