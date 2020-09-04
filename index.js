
(async () => {
  const OOCLService = require('./oocl-service')
  try {
    const _ooclService = new OOCLService(['OOLU0571619'])
    const result = await _ooclService.run()
    console.log(result)
  } catch (error) {
    console.log(error)
  }
})()