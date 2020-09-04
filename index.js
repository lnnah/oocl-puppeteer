'use strict'

const OOCLService = require('./oocl-service')


try {
  const _ooclService = new OOCLService(['OOLU0571619', 'FCIU5229601'])
  _ooclService.run()
} catch (error) {
  console.log(error)
}

// module.exports.index = async (event, context) => {

// }
