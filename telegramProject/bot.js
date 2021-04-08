const {
    Telegraf,
    Scenes,
    session,
    Markup
} = require('telegraf');

const axios = require('axios');

const Moment = require('Moment');

const express = require('express');

const bodyParser = require('body-parser')

const moment = Moment

const {
    BOT_TOKEN,
    QIWI_API,
    API_URL
} = require('./config');

const tokenBot = process.argv[2]
const qiwiToken = process.argv[3]
const bot = new Telegraf(tokenBot);
const QiwiBillPaymentsAPI = require('@qiwi/bill-payments-node-js-sdk');
const qiwiApi = new QiwiBillPaymentsAPI(qiwiToken)
const getChatifcms = async () => {
    const response = await axios.get(`${API_URL}/projects?botToken=${tokenBot}`)
    return response.data[0].chatID
}

// function FindCard(callback) {

//     axios.get(`${API_URL}/projects`, {
//             params: {
//                 botToken: tokenBot
//             }
//         })
//         .then(function (res) {
//             callback(res.data[0].chatID);
//         })
//         .catch(function (error) {
//             console.log(error);
//         });
// }

// let xui = axios({
//     method: 'get',
//     url: `${API_URL}/projects`,
//     params: {
//         botToken: tokenBot
//     }
// }).then((res) => {
//     return res.data[0].chatID
// })

const QIWISettings = {
    amount: null, // Сумма, пока оставим null
    billId: "0", // Идентификатор платежа (он у каждого будет уникальный)
    comment: "", // Комментарий
    currency: "RUB", // Валюта
    expirationDateTime: qiwiApi.getLifetimeByDay(1),
}

let dateSubcribe = ""
let rateName = ""
bot.telegram.setWebhook(`https://5ef62666f909.ngrok.io/bot`)

const server = express();

server.use(bodyParser.json());
server.use(bodyParser.json({
    type: 'application/vnd.api+json'
}));
server.use(bodyParser.urlencoded({
    extended: true
}))
server.listen(3000 + Number(process.argv[4]), err => {
    if (err) {
        throw err;
    }
    console.log(`Bot has been start`)
})

server.post('/bot', ctx => {
    const {
        body
    } = ctx.request
    bot.proccessUpdate(body)
    ctx.status = 200
})



bot.start((ctx) =>
    ctx.reply(`fd`,
        Markup.keyboard([
            ['Тарифы', 'Моя подписка'],
        ])
        .resize()
        .extra(),
    ),
);

bot.hears('Тарифы', async ctx => {

    ctx.deleteMessage()
    axios({
            method: 'get',
            url: `${API_URL}/rates`,
            params: {
                apiBotKey: tokenBot
            }
        }).then(res => {
            bot.telegram.sendMessage(ctx.chat.id, `Здравствуйте я ваша совесть, для того чтобы попасть в канал "ававава" купите подписку`, {
                reply_markup: {
                    inline_keyboard: res.data.map(item => [{
                        text: item.name,
                        callback_data: `${item.price},${item.days},${item.name}`
                    }])
                }
            })
        })
        .catch(err => {
            console.log(err)
        })
})


bot.hears('Моя подписка', async ctx => {
    let chadID = await getChatifcms()
    ctx.deleteMessage()
    axios({
        method: 'get',
        url: `${API_URL}/subscriptions`,
        params: {
            userID: ctx.chat.id,
            chanel: chadID
        }
    }).then((res) => {
        if (res.data.length === 0) {
            bot.telegram.sendMessage(ctx.chat.id, `У вас нету активных подписок`)
        } else {
            let rates
            if (Array.isArray(res.data)) {
                console.log("gfdg")
                rates = res.data.map(item =>
                    `\n\nГруппа/Канал: ${item.chanelLink} \nНазвание подписки: ${item.rateName} \nДата окончания подписки: ${item.endSubscription}`
                )
            } else {
                rates = `Группа/Канал: ${res.data.chanelLink} \nНазвание подписки: ${res.data.rateName} \nДата окончания подписки: ${moment.fromat(res.data.endSubscription)}`
            }
            bot.telegram.sendMessage(ctx.chat.id, ` Ваши подписки ${rates}`)
        }
    })

})



bot.on(`callback_query`, async ctx => {
    let chadID = await getChatifcms()
    if (ctx.update.callback_query.data !== "cancel_pay" && ctx.update.callback_query.data !== "check_pay") {
        ctx.deleteMessage()
        dateSubcribe = ctx.update.callback_query.data.split(",")[1]
        QIWISettings.amount = ctx.update.callback_query.data.split(",")[0] // цена
        QIWISettings.comment = "Оплата подписки", // Коментарий
            QIWISettings.expirationDateTime = qiwiApi.getLifetimeByDay(1), //дата окончания действия сыллки
            QIWISettings.billId = qiwiApi.generateId(), // уникальный id
            dateSubcribe = ctx.update.callback_query.data.split(",")[1],
            rateName = ctx.update.callback_query.data.split(",")[2]
        qiwiApi.createBill(QIWISettings.billId, QIWISettings).then(data => {
            bot.telegram.sendMessage(ctx.chat.id, `Выша сыллка для оплаты \nсыллка действительна только 15минут! \n\n${data.payUrl}`, {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: `Проверить платеж`,
                            callback_data: `check_pay`,
                        }],
                        [{
                            text: `Отмена`,
                            callback_data: `cancel_pay`
                        }]
                    ]
                }
            })
        })

    }
    if (ctx.update.callback_query.data === "cancel_pay") {
        ctx.deleteMessage()
        bot.telegram.sendMessage(ctx.chat.id, `Ваша покупка отменена`)
        qiwiApi.cancelBill(QIWISettings.billId).then(data => {}).catch(err => {
            console.log(err)
        })
    }
    if (ctx.update.callback_query.data === "check_pay") {
        qiwiApi.getBillInfo(QIWISettings.billId).then(data => {
            if (data) {
                if (data.status.value === "WAITING") {
                    bot.telegram.callApi('getChat', {
                        chat_id: chadID,
                    }).then((resDataName) => {
                        let checkRate
                        axios({
                            method: 'get',
                            url: `${API_URL}/subscriptions`,
                            params: {
                                userID: ctx.chat.id,
                                chanel: chadID
                            }
                        }).then((resdataCheck) => {
                            if (resdataCheck.data.length === 0) {
                                bot.telegram.callApi('createChatInviteLink', {
                                    chat_id: chadID,
                                    member_limit: 1
                                }).then(data => {
                                    ctx.deleteMessage()
                                    bot.telegram.sendMessage(ctx.chat.id, `Ваша сыллка в канал ${data.invite_link}`)
                                }).catch(err => {
                                    console.log(err)
                                })
                                axios({
                                    method: 'post',
                                    url: `${API_URL}/subscriptions`,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    data: JSON.stringify({
                                        chanel: chadID,
                                        userID: `${ctx.chat.id}`,
                                        paidStatus: "true",
                                        endSubscription: qiwiApi.getLifetimeByDay(Number(dateSubcribe)),
                                        rateName: rateName,
                                        chanelLink: resDataName.title,
                                    })
                                }).then((resData) => {
                                    // console.log(resData)
                                }).catch((err) => {
                                    console.log(err)
                                })
                            } else {
                                var now = new Date();
                                var nowUtc = new Date(resdataCheck.data[0].endSubscription);
                                nowUtc.setDate(nowUtc.getDate() + parseInt(dateSubcribe))
                                var iso = nowUtc.toISOString()
                                axios({
                                    method: 'put',
                                    url: `${API_URL}/subscriptions/${resdataCheck.data[0].id}`,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    data: JSON.stringify({
                                        endSubscription: iso,
                                    })
                                }).then((resData) => {
                                    ctx.deleteMessage()
                                    bot.telegram.sendMessage(ctx.chat.id, `Выша подписка на канал ${resdataCheck.data[0].chanelLink} продлена до ${iso}`)
                                }).catch((err) => {
                                    // console.log(err)
                                })
                            }
                        })
                    })
                } else {
                    ctx.deleteMessage()
                    bot.telegram.sendMessage(ctx.chat.id, `Выша сыллка для оплаты \nсыллка действительна только 15минут! \n\n${data.payUrl}`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{
                                    text: `Проверить платеж`,
                                    callback_data: `check_pay`,
                                }],
                                [{
                                    text: `Отмена`,
                                    callback_data: `cancel_pay`
                                }]
                            ]
                        }
                    })
                }
            }
        });
    }
})



bot.launch();


console.log('Бот запущен');