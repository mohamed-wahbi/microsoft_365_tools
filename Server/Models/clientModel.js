const mongoose = require('mongoose');


// Définition du schéma Client
const ClientSchema = new mongoose.Schema({
   
    name: { type: String , required: true},
    idSharepoint: { type: Number , required: true},
   
},

{
    timestamps: true
}

);

// Export du modèle
const Client = mongoose.model("Client", ClientSchema);


module.exports = {
    Client
};
