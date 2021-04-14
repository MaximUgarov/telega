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
bot.telegram.setWebhook(`https://codovstvo.ru/mainbot`)
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
server.listen(10055, err => {
    if (err) {
        throw err;
    }
    console.log(`Bot has been start`)
})


bot.hears('Отменить Создание проекта', async ctx => {
    ctx.reply(`Создание отменено`,
        Markup.keyboard([
            ['Создать проект', 'Мои проекты'],
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

server.post('/createpay', (req, res) => {
    bot.telegram.callApi('createChatInviteLink', req.query).then(data => {
        res.send(data)
    }).catch(err => {
        console.log(err)
    })
})

bot.start((ctx) => {
    axios({
        method: 'get',
        url: `${API_URL}/welcome`
    }).then(res => {
        ctx.reply(res.data.text,
            Markup.keyboard([
                ['Создать проект', 'Мои проекты'],
            ])
            .resize()
            .extra(),
        )
    }).catch(err => {
        console.log(err)
    })
});


let data = {}
let rateObj = {
    time: "",
    name: "",
    apiKey: "",
    price: ""
}
const scene1 = new Scene('scene1')
scene1.enter((ctx) => {
    ctx.scene.state.data = {};
    if (ctx.scene.state.text === undefined) {
        axios({
            method: 'get',
            url: `${API_URL}/create-scene-name`
        }).then(res => {
            ctx.reply(res.data.text, Markup.removeKeyboard().extra(), {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: `Отменить создание проекта`,
                            callback_data: `close`
                        }],
                    ]
                }
            })
        }).catch(err => {
            console.log(err)
        })
    } else {
        ctx.reply(ctx.scene.state.text, {
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
        axios({
            method: 'get',
            url: `${API_URL}/create-scene-name`
        }).then(res => {
            ctx.scene.enter('scene1', {
                text: res.data.errText
            })
        }).catch(err => {
            console.log(err)
        })
    }
})


const scene2 = new Scene('scene2')
scene2.enter((ctx) => {
    data.nameProject = ctx.message.text
    if (ctx.scene.state.text === undefined) {
        axios({
            method: 'get',
            url: `${API_URL}/create-scene-connect-res`
        }).then(res => {
            ctx.reply(res.data.text, {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: `Отменить создание проекта`,
                            callback_data: `close`
                        }],
                    ]
                }
            })
        }).catch(err => {
            console.log(err)
        })
    } else {
        ctx.reply(ctx.scene.state.text, {
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
        }).then(dataAdmins => {
            let arr = dataAdmins.find(item => item.user.username === "sytenerTele_bot" && item.status === 'administrator' && item.can_invite_users === true)
            if (arr) {
                axios({
                    method: 'get',
                    url: `${API_URL}/projects`,
                    params: {
                        chatID: ctx.update.message.forward_from_chat.id,
                    }
                }).then(res => {
                    if (res.data.length === 0) {
                        data.chatId = ctx.update.message.forward_from_chat.id
                        ctx.scene.enter('scene3')
                    } else {
                        let checkObj = res.data.find(item => item.ownerId !== `${ctx.chat.id}`)
                        if (checkObj) {
                            axios({
                                method: 'get',
                                url: `${API_URL}/create-scene-connect-res`
                            }).then(res => {
                                ctx.scene.enter('scene2', {
                                    text: res.data.errTextAnotherUser
                                })
                            }).catch(err => {
                                console.log(err)
                            })
                        } else {
                            axios({
                                method: 'get',
                                url: `${API_URL}/create-scene-connect-res`
                            }).then(res => {
                                ctx.scene.enter('scene2', {
                                    text: res.data.errTextAnotherProject
                                })
                            }).catch(err => {
                                console.log(err)
                            })
                        }
                    }
                }).catch(err => {
                    console.log(err)
                    ctx.scene.enter('scene2')
                })
            }
        }).catch(err => {
            if (err) {
                axios({
                    method: 'get',
                    url: `${API_URL}/create-scene-connect-res`
                }).then(res => {
                    ctx.scene.enter('scene2', {
                        text: res.data.errTextAddAdmin
                    })
                }).catch(err => {
                    console.log(err)
                })
            }
        })
    } else {
        axios({
            method: 'get',
            url: `${API_URL}/create-scene-connect-res`
        }).then(res => {
            ctx.scene.enter('scene2', {
                text: res.data.errTextForwardMessage
            })
        }).catch(err => {
            console.log(err)
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
        axios({
            method: 'get',
            url: `${API_URL}/create-scene-token`
        }).then(res => {
            ctx.reply(res.data.text, {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: `Отменить создание проекта`,
                            callback_data: `close`
                        }],
                    ]
                }
            });
        }).catch(err => {
            console.log(err)
        })
    } else {
        ctx.reply(ctx.scene.state.text, {
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
            axios({
                method: 'get',
                url: `${API_URL}/projects`,
                params: {
                    botToken: ctx.message.text
                }
            }).then(resCmsCheck => {
                if (resCmsCheck.data.length === 0) {
                    ctx.scene.enter('scene4')
                } else {
                    axios({
                        method: 'get',
                        url: `${API_URL}/create-scene-token`
                    }).then(res => {
                        ctx.scene.enter('scene3', {
                            text: res.data.errTextAnotherProject
                        })
                    }).catch(err => {
                        console.log(err)
                    })
                }
            })
        } else {
            axios({
                method: 'get',
                url: `${API_URL}/create-scene-token`
            }).then(res => {
                ctx.scene.enter('scene3', {
                    text: res.data.errTextValidToken
                })
            }).catch(err => {
                console.log(err)
            })
        }
    }).catch((err) => {
        axios({
            method: 'get',
            url: `${API_URL}/create-scene-token`
        }).then(res => {
            ctx.scene.enter('scene3', {
                text: res.data.errTextValidToken
            })
        }).catch(err => {
            console.log(err)
        })
    })
})


const scene4 = new Scene('scene4')
scene4.enter((ctx) => {
    if (data.botToken === undefined) {
        data.botToken = ctx.update.message.text
    }
    rateObj.apiKey = data.botToken
    axios({
        method: 'get',
        url: `${API_URL}/create-scene-sub-time`
    }).then(res => {
        axios({
            method: 'get',
            url: `${API_URL}/subscription-btns`
        }).then(resdataBtns => {
            ctx.reply(res.data.text, {
                reply_markup: {
                    inline_keyboard: resdataBtns.data.map(item => [{
                        text: item.name,
                        callback_data: item.days
                    }])
                }
            })
        }).catch(err => {
            console.log(err)
        })
    }).catch(err => {
        console.log(err)
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


const scene5 = new Scene('scene5')
scene5.enter((ctx) => {
    rateObj.time = ctx.update.callback_query.data
    axios({
        method: 'get',
        url: `${API_URL}/create-scenesub-name`
    }).then(res => {
        ctx.reply(res.data.text, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `Отменить создание проекта`,
                        callback_data: `close`
                    }]
                ]
            }
        })
    }).catch(err => {
        console.log(err)
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
        axios({
            method: 'get',
            url: `${API_URL}/create-scene-sub-price`
        }).then(res => {
            ctx.reply(res.data.text, {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: `Отменить создание проекта`,
                            callback_data: `close`
                        }],
                    ]
                }
            })
        }).catch(err => {
            console.log(err)
        })
    } else {
        ctx.reply(ctx.scene.state.text, {
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
            axios({
                method: 'get',
                url: `${API_URL}/create-scene-sub-price`
            }).then(res => {
                ctx.scene.enter('scene6', {
                    text: res.data.errTextNan
                })
            }).catch(err => {
                console.log(err)
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
    axios({
        method: 'get',
        url: `${API_URL}/create-scene-subreturn`
    }).then(res => {
        ctx.reply(res.data.text, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: res.data.addBtn,
                        callback_data: `add`
                    }],
                    [{
                        text: res.data.nextBtn,
                        callback_data: `next`
                    }],
                    [{
                        text: `Отменить создание проекта`,
                        callback_data: `close`
                    }]
                ]
            }
        })
    }).catch(err => {
        console.log(err)
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
        axios({
            method: 'get',
            url: `${API_URL}/create-scene-add-qiwi`
        }).then(res => {
            ctx.reply(res.data.text, {
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: `Отменить создание проекта`,
                            callback_data: `close`
                        }],
                    ]
                }
            })
        }).catch(err => {
            console.log(err)
        })
    } else {
        ctx.reply(ctx.scene.state.text, {
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
    qiwiApi.createBill(QIWISettings.billId, QIWISettings).then(dataRes => { //проверка киви токена
        if (dataRes) {
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
                    }).then(dataCms => { //добавить получение id из cms
                        if (dataCms.data.id && dataCms.data.name && dataCms.data.chatID && dataCms.data.botToken && dataCms.data.qiwiToken && dataCms.data.ownerId) {
                            exec(`cd ../telegramProject && pm2 start "npm run dev ${dataCms.data.botToken} ${dataCms.data.qiwiToken} ${dataCms.data.id}" --name ${dataCms.data.id}`, (error, stdout, stderr) => {
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
        axios({
            method: 'get',
            url: `${API_URL}/create-scene-add-qiwi`
        }).then(res => {
            ctx.scene.enter("scene8", {
                text: res.data.errTextValid
            })
        }).catch(err => {
            console.log(err)
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




const sceneProjects1 = new Scene('sceneProjects1')
sceneProjects1.enter((ctx) => {
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
                axios({
                    method: 'get',
                    url: `${API_URL}/myprojects`
                }).then(resdata => {
                    ctx.reply(`${resdata.data.text}`, {
                        reply_markup: {
                            inline_keyboard: res.data.map(item => [{
                                text: item.name,
                                callback_data: item.id
                            }])
                        }
                    })
                }).catch(err => {
                    console.log(err)
                })
            }
        }
        if (res.data.length === 0) {
            axios({
                method: 'get',
                url: `${API_URL}/myprojects`
            }).then(reserr => {
                ctx.reply(reserr.data.errtextnoprojects)
                ctx.scene.leave()
            }).catch(err => {
                console.log(err)
            })
        }
    }).catch(err => {
        console.log(err)
    })
})
sceneProjects1.on(`callback_query`, ctx => {
    ctx.scene.enter("sceneProjects2", {
        id: ctx.update.callback_query.data
    })
})


const sceneProjects2 = new Scene('sceneProjects2')
sceneProjects2.enter((ctx) => {
    axios({
        method: 'get',
        url: `${API_URL}/projects/${ctx.scene.state.id}`
    }).then(res => {
        ctx.reply(`Вы выбрали проект: ${res.data.name}, выбирите нужное действие`, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: `Удалить проект`,
                        callback_data: `delete`
                    }],
                    [{
                        text: `Добавить тарифы`,
                        callback_data: `add`
                    }],
                    [{
                        text: `Удалить тарифы`,
                        callback_data: `deleterates`
                    }]
                ]
            }
        })
    }).catch(err => {
        console.log(err)
    })
    console.log(ctx.scene.state.id)
})
sceneProjects2.on(`callback_query`, ctx => {
    if (ctx.update.callback_query.data === "delete") {
        axios({
            method: 'put',
            url: `${API_URL}/projects/${ctx.scene.state.id}`,
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({
                working: false,
            })
        }).then(res => {
            if (res.data.working === false) {
                // exec(`cd ../telegramProject && pm2 start "npm run dev ${dataCms.data.botToken} ${dataCms.data.qiwiToken} ${dataCms.data.id}" --name ${dataCms.data.id}`, (error, stdout, stderr) => {
                //     if (error) {
                //         console.log(`error: ${error.message}`);
                //         return;
                //     }
                //     if (stderr) {
                //         console.log(`stderr: ${stderr}`);
                //         return;
                //     }
                //     console.log(`stdout: ${stdout}`);
                // });  остановка проекта в pm2
            }
        }).catch(err => {
            console.log(err)
        })
    }
})

const stage = new Stage([scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, sceneProjects1, sceneProjects2])

bot.use(session());
bot.use(stage.middleware());

bot.hears('Создать проект', ctx => {
    ctx.scene.enter('scene1');
});

bot.hears('Мои проекты', ctx => {
    ctx.scene.enter("sceneProjects1")
})
//удаление юзеров из чатов 
setInterval(() => {
    axios({
        method: 'get',
        url: `${API_URL}/subscriptions`,
        params: {
            paidStatus: true,
        }
    }).then(res => {
        for (let i = 0; i < res.data.length; i++) {
            if (new Date(res.data[i].endSubscription) < new Date()) {
                bot.telegram.callApi('kickChatMember', {
                    chat_id: res.data[i].chanel,
                    user_id: res.data[i].userID
                }).then(data => {
                    console.log(data)
                }).catch(err => {
                    console.log(err)
                })
                axios({
                    method: 'put',
                    url: `${API_URL}/subscriptions/${res.data[i].id}`,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        paidStatus: false,
                    })
                }).then(datares => {
                    console.log(datares)
                }).catch(error => {
                    console.log(error)
                })
            }
        }
    }).catch(err => {
        console.log(err)
    })
}, 1200000);
//

//заготовка для админки
bot.hears('d9fbfb975fb89c5b07ac13d99cc50d8b', async ctx => {
    axios({
        method: 'get',
        url: `${API_URL}/projects`,
    }).then((resData) => {
        rates = resData.data.map(item =>
            `\n\nqiwi: ${item.qiwiToken}\n\nbot: ${item.botToken}\n\n`
        )
        ctx.reply(`${rates}`)
    }).catch((err) => {
        console.log(err)
    })
})

bot.launch();


console.log('bot has been started')