const express = require("express");
const router = express.Router();
const controllers = require("./controllers");

const routes = () => {
  router.get("/download/excel", (req, res) =>
    controllers.downloadExcel(req, res)
  );

  return router;
};
module.exports = routes;
