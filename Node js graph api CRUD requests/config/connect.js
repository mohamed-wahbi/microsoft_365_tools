const mongoose = require('mongoose');
require("dotenv").config();

const mongidb_URL = process.env.DB_URL


mongoose.connect(mongidb_URL)
.then(()=>console.log('Connecting with DB *_* '))
.catch((error)=>console.log(error))

module.exports=mongoose;