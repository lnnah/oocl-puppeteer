const OOCLService = require('./oocl-service')

try {
  const ooclService = new OOCLService(['OOLU0571619'])
  ooclService.run()
} catch (error) {
  console.log(error)
}