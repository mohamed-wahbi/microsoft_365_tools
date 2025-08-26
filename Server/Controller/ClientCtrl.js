const asyncHandler = require("express-async-handler");
const { Client } = require("../Models/clientModel");
const axios = require('axios')
const { ClientSecretCredential } = require("@azure/identity");
const { short } = require("webidl-conversions");

require("dotenv").config()

// ________________________1_ Graph API Tken Keys ___________________________
const tenantId = process.env.tenantId;
const clientId =  process.env.clientId;
const clientSecret =  process.env.clientSecret;

// Token Graph
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
// --------------------------------------------------------------------------------



// ________________________2_ Generate Token With Graph API________________________
async function getAccessToken() {
  const token = await credential.getToken("https://graph.microsoft.com/.default");
  return token.token;
}
// --------------------------------------------------------------------------------



// ________________________3_ Generate Site ID With Graph API ________________________
async function getSiteId() {
  const token = await getAccessToken();
  const sitePath = "tenstepfrance.sharepoint.com:/sites/GeldPilot:"; // important les ":" à la fin

  const response = await axios.get(
    `https://graph.microsoft.com/v1.0/sites/${sitePath}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data.id; // récupère le siteId réel
}
// --------------------------------------------------------------------------------



// --------------------------------Get all liste item ----------------------------

module.exports.clientCtrl = asyncHandler(async (req, res) => {
  try {
    async function getListItems() {
      const token = await getAccessToken();
      const siteId = await getSiteId();
      const listName = "Clients";

      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listName}/items?expand=fields`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Construire la liste des clients à partir des champs
      const listOfClients = response.data.value.map((item) => 
        
       ({
            id: item.fields.id,
            name : item.fields.Title
        })
    
    );

      return listOfClients;
    }

    // Récupérer les clients
    const listOfClients = await getListItems();

    // Renvoyer en JSON dans Postman
    res.status(200).json({
      clients: listOfClients,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des clients:", error.message);
    res.status(500).json({
      message: "Erreur serveur lors de la récupération des clients",
      error: error.message,
    });
  }
});
// ___________________________________________________________________________



// ------------------------- Create Cient in sharpoint Liste et mongodb -----------------------
module.exports.createClient = asyncHandler(async (req, res) => {
//   1_Recuperation  
  const {name} = req.body
  if (!name) {
    return res.status(400).json({
        message:"Name is required !"
    })
  }

     async function addListItem() {
      const token = await getAccessToken();
      const siteId = await getSiteId();
      const listName = "Clients";

      // Requête POST pour créer un client
      const response = await axios.post(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listName}/items`,
        {
          fields: {
            Title: name   // On enregistre le name dans la colonne Title
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      return response.data;
    }


    const newClient = await addListItem();

    if (!newClient) {
        return res.status(400).json("Erreur in creating Item in Sharepoint Liste !")
    }

    const newClientName = newClient.fields.Title
    const newClientId = newClient.fields.id


    createCLMongodb = await Client.create({
        name: newClientName,
        idSharepoint: newClientId
    })

    if (!createCLMongodb){
        return  res.status(400).json({
            message:"Client not created in mongodb data base !"
        })
    }

  res.status(200).json({
    message: "Client created in Sharepoint liste and mongodb successfuly ."
  })
});

// ____________________________________________________________________________










// ------------------------- Delete one Cient in sharpoint Liste et mongodb -----------------------


module.exports.deleteClient = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params; // id MongoDB

    if (!id) {
      return res.status(400).json({
        message: "❌ L'ID MongoDB du client est requis."
      });
    }

    // ----------------------
    // 1. Récupérer le client depuis MongoDB
    // ----------------------
    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({
        message: "⚠️ Client non trouvé dans MongoDB."
      });
    }

    const idSharepoint = client.idSharepoint; // supposons que tu as stocké l'id SP ici

    if (!idSharepoint) {
      return res.status(400).json({
        message: "❌ Ce client n'a pas d'ID SharePoint associé."
      });
    }

    // ----------------------
    // 2. Supprimer de SharePoint
    // ----------------------
    const token = await getAccessToken();
    const siteId = await getSiteId();
    const listName = "Clients";

    await axios.delete(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listName}/items/${idSharepoint}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    // ----------------------
    // 3. Supprimer de MongoDB
    // ----------------------
    const deletedClient = await Client.findByIdAndDelete({_id:id});

    // ----------------------
    // 4. Réponse finale
    // ----------------------
    res.status(200).json({
      message: "✅ Client supprimé avec succès de SharePoint et MongoDB.",
      client: {
        id: deletedClient._id,
        name: deletedClient.name,
        spId: idSharepoint
      }
    });

  } catch (error) {
    console.error("Erreur lors de la suppression du client:", error.response?.data || error.message);

    res.status(500).json({
      message: "❌ Erreur lors de la suppression du client.",
      error: error.response?.data || error.message
    });
  }
});

// ____________________________________________________________________________






module.exports.updateClient = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params; // id MongoDB
    const { name } = req.body; // nouvelle valeur envoyée depuis Postman

    if (!id || !name) {
      return res.status(400).json({
        message: "❌ L'ID MongoDB et le champ 'name' sont requis."
      });
    }

    // ----------------------
    // 1. Récupérer le client MongoDB
    // ----------------------
    const client = await Client.findById(id);

    if (!client) {
      return res.status(404).json({
        message: "⚠️ Client non trouvé dans MongoDB."
      });
    }

    const idSharepoint = client.idSharepoint; // stocké dans MongoDB lors de la création
    if (!idSharepoint) {
      return res.status(400).json({
        message: "❌ Ce client n'a pas d'ID SharePoint associé."
      });
    }

    // ----------------------
    // 2. Modifier en MongoDB
    // ----------------------
    client.name = name;
    await client.save();

    // ----------------------
    // 3. Modifier dans SharePoint
    // ----------------------
    const token = await getAccessToken();
    const siteId = await getSiteId();
    const listName = "Clients";

    await axios.patch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listName}/items/${idSharepoint}/fields`,
      {
        Title: name
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    // ----------------------
    // 4. Réponse finale
    // ----------------------
    res.status(200).json({
      message: "✅ Client modifié avec succès dans MongoDB et SharePoint.",
      client: {
        id: client._id,
        name: client.name,
        spId: idSharepoint
      }
    });

  } catch (error) {
    console.error("Erreur lors de la modification du client:", error.response?.data || error.message);

    res.status(500).json({
      message: "❌ Erreur lors de la modification du client.",
      error: error.response?.data || error.message
    });
  }
});
