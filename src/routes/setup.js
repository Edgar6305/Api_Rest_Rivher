const express = require('express');
const router = express.Router();
const axios = require('axios');
const colors = require('colors');
const sql = require('mssql');
const bot = require("./telegram.js")
const jwt = require("jsonwebtoken")

// Base de Datos SQL SERVER
const config = {
    user: 'sa',
    password: 'A$123bcd',
    database: 'RIVHER',
    server: '18.229.172.128',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 1000
    },
    options: {
        encrypt: false,               // for azure
        trustServerCertificate: true  // change to true for local dev / self-signed certs
    }
};

router.post('/Registro', async (req, res) => {
    var newData = req.body
    var user={
        empresa : req.body.empresa,
        aplicacion : req.body.aplicacion,
        serie : req.body.serie
    }
    try {
        await sql.connect(config)
        var result = await sql.query`Select IdInstalacion From Instalaciones WHERE Empresa= ${newData.empresa} AND CodigoAplicacion= ${newData.aplicacion} AND  serie= ${newData.serie}`

        if (result.rowsAffected[0] == 0){
            res.status(500).json({ "status": "No data" })
            var botMessage ="Se Solicito Token con credenciales erradas"
            bot.sendBot(bot.idChatBaseUno, botMessage)
        }else{
            var token = jwt.sign({user},'my_secret_key')
            res.status(200).json({ "status": "Succes", "token": token})
            var botMessage ="Se envió Token Solicitado"
            bot.sendBot(bot.idChatBaseUno, botMessage)
        }    
        return        
    } catch (err) {
        var botMessage ="Error Descarga  " + err.message
        bot.sendBot(bot.idChatBaseUno, botMessage)
        const response = { status: err}
        res.status(401).json({ "status": "failed"})
    }    
})

router.post('/login', ensureToken, async (req, res) => {
    var newData = req.body
    //console.log(req)
    try {
        res.json({status: 'Succes', data: req.token.user})
    } catch (err) {
        var botMessage ="Error Descarga  " + err.message
        bot.sendBot(bot.idChatBaseUno, botMessage)
        const response = { status: err}
        res.status(401).json({ "status": "failed"})
    }    
})

router.post('/movimiento', ensureToken, async (req, res) => {
    //console.log(req.body )
    //console.log(req.token)
    var comentario=""
    try {
        if (req.token.user.serie != req.body.serie ){
            comentario += "La serie NO concuerda" 
        }else{
            comentario += "Revisión terminada Satisfactoriamente " 
        }
        await sql.connect(config)
        var result = await sql.query`Set DateFormat DMY INSERT INTO  Movimientos Values(${req.body.empresa}, ${req.body.aplicacion}, ${req.body.serie}, Getdate(), ${comentario}, ${req.body.usuario})`
        if (result.rowsAffected[0] == 0){
            var botMessage ="Error al Grabar Revisión Empresa " & req.body.empresa
            bot.sendBot(bot.idChatBaseUno, botMessage)
            res.status(500).json({ "status": "Error al Grabar Revisión Empresa" })
        }else{
            //var result = await sql.query`UPDATE Avisos SET Estado='IN' WHERE Empresa=${req.body.empresa} AND CodigoAplicacion=${req.body.aplicacion} AND Tipo='REVISION'`
            if(comentario == "La serie NO concuerda"){
               var botMessage ="Revision de Autenticidad Fallida " + req.token.user.empresa + " Usuario " + req.body.usuario
               bot.sendBot(bot.idChatBaseUno, botMessage)
               res.status(500).json({ "status": "FAILED" })
            }else{
                var botMessage ="Revisión terminada Satisfactoriamente  " + req.token.user.empresa
                bot.sendBot(bot.idChatBaseUno, botMessage)
                res.status(200).json({ "status": "OK"})
            }
        }
    }
    catch (err) {
        console.log(err.message)
        var botMessage ="Error Descarga  " + err.message
        bot.sendBot(bot.idChatBaseUno, botMessage)
        const response = { status: err}
        res.status(401).json({ "status": "failed", "Error": err.message})
    }    
})

router.post('/avisos', ensureToken, async (req, res) => {
    var newData = req.token.user
    console.log(req.body.empresa)
    try {
        await sql.connect(config)
        const xSql =`Select Tipo, Aviso, NombreAplicacion, Permanencia From Avisos WHERE Empresa='${req.body.empresa}' AND CodigoAplicacion='${newData.aplicacion}' AND Estado='AC'`
        var result = await sql.query (xSql)
        console.log(result.recordset)
        if (result.rowsAffected[0] == 0){
            res.status(500).json({ "status": "No data" })
        }else{
            const Persiste=result.recordset[0].Permanencia
            const myTipo=result.recordset[0].Tipo
            if(Persiste == 0) {
                const xSql =`Update Avisos Set Estado='IN' WHERE Empresa='${req.body.empresa}' AND CodigoAplicacion='${newData.aplicacion}' AND Tipo='${myTipo}'`
                var resultUP = await sql.query (xSql)
            }
            res.status(200).json({ "status": "Succes", "Persistencia":"IN","aviso": result.recordset})
            var botMessage ="Se actualizo Aviso Solicitado"
            bot.sendBot(bot.idChatBaseUno, botMessage)
        }    
        return        
    } catch (err) {
        var botMessage ="Error Descarga  " + err.message
        bot.sendBot(bot.idChatBaseUno, botMessage)
        const response = { status: err}
        res.status(401).json({ "status": "FAILED", "error" : err.message})
    }    
})

router.post('/usuarios', ensureToken, async (req, res) => {
    try {
        console.log(req.token.user)
        await sql.connect(config)
        var result = await sql.query`INSERT INTO  Licencias Values(${req.token.user.empresa}, ${req.token.user.aplicacion}, ${req.body.usuariosActivos}, ${req.body.usuariosInactivos}, ${req.body.loginActivos}, GetDate())`

        if (result.rowsAffected[0] == 0){
            var botMessage ="Error al Grabar Revisión Empresa " & req.body.empresa
            bot.sendBot(bot.idChatBaseUno, botMessage)
            res.status(500).json({ "status": "FAILED" })
        }else{
            var botMessage ="Se Grabo Revisión de Usuarios " + req.token.user.empresa
            bot.sendBot(bot.idChatBaseUno, botMessage)
            res.status(200).json({ "status": "OK"})
        }
    }
    catch (err) {
        var botMessage ="Error Descarga  " + err.message
        bot.sendBot(bot.idChatBaseUno, botMessage)
        const response = { status: err}
        res.status(401).json({ "status": "failed"})
    }    
})

function ensureToken(req, res, next){
    //console.log(req.headers.token)
    jwt.verify(req.headers.token,'my_secret_key', (err,data) =>{
        if(err){
            var botMessage ="Error Consulta de Token " + req.body.empresa
            bot.sendBot(bot.idChatBaseUno, botMessage)
            res.status(401).json({ "status": "FAILED", "error" : err})
            //console.log(req.token)
        }else{
            //var botMessage ="Consulta de Token Realizada desde " + data.user.empresa
            //bot.sendBot(bot.idChatBaseUno, botMessage)
            req.token=data
            //console.log(req.token)
            next()
        }
    })    
}


module.exports = router;
