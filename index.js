(async () => {
  const OOCLService = require('./oocl-service')
  const _ooclService = new OOCLService('OOLU2891972')
  // const _ooclService = new OOCLService('OOLU0571619')
  const result = await _ooclService.run()
  console.log(JSON.stringify({
    statusCode: 200,
    body: result,
  }))
})()

// module.exports.index = async (event, context) => {

// }
