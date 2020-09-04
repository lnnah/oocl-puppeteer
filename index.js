'use strict'

const OOCLService = require('./oocl-service')

// module.exports.index = async (event, context) => {
  try {
    const ooclService = new OOCLService(['OOLU0571619', 'FCIU5229601'])
    ooclService.run()
  } catch (error) {
    console.log(error)
  }
// }

