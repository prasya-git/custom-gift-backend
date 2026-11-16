const mongoose = require('mongoose')
const connectionString = process.env.DBCONNECTIONSTRING
const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

mongoose.connect(connectionString).then(res=>{
    console.log("Database Connection Successfull"); 
}).catch(error=>{
    console.log("Database Connection failed");
    console.log(error);   
})