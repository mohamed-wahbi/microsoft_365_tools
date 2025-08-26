const express = require('express');
const router = express.Router();
const { clientCtrl, createClient, deleteClient, updateClient } = require('../Controller/ClientCtrl');

// client
router.route("/getAll").get(clientCtrl)



router.route("/create").post(createClient)


router.route("/delete/:id").delete(deleteClient)


router.route("/update/:id").put(updateClient)




module.exports = router;