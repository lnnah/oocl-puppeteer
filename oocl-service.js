const chromium = require('chrome-aws-lambda')

const puppeteer = chromium.puppeteer

class OOCLService {
  SERVICE_NAME = 'OoclService'
  MAX_RETRY_TIME = 1
  SLEEP_TIME = 10

  currentIndex = -1

  result = []

  USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.137 Safari/537.36'
  
  MAIN_URL = 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx'

  constructor(containers) {
    this.containers = containers
  }

  run = async () => {
    for (let container of this.containers) {
      this.currentIndex++
      this.currentContainerNo = container
      
      const browser = await puppeteer.launch({
        headless: false,
        executablePath: await chromium.executablePath,
        defaultViewport: {
          width: 1366,
          height: 768,
        },
        args: chromium.args,
      })
      await this.simulator(browser)
    }
    // Return crawled data
    return this.result
  }

  simulator = async browser => {
    const page = await browser.newPage()
    await page.setDefaultNavigationTimeout(0)
    await page.setUserAgent(this.USER_AGENT)
    await page.goto(this.MAIN_URL)

    await page.$eval('#btn_cookie_accept', btn => btn.click())

    await page.$eval('.btn.dropdown-toggle.btn-default', btn => btn.click())
    await page.click("li[data-original-index='2']", { visible: true })
    await page.type('#SEARCH_NUMBER', this.currentContainerNo)

    // Listen for new windows open
    let newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())))
    await page.$eval('#container_btn', btn => btn.click())
    const secondPage = await newPagePromise
    await secondPage.waitForNavigation({waitUntil: 'networkidle2'})
    await secondPage.waitForSelector("#nc_1_n1z")
    // Got the 2nd page

    // Get captcha slider
    const sliderElement = await secondPage.$('#nc_1_n1t')
    const slider = await sliderElement.boundingBox()

    // Get captcha slide button
    const slideThumb = await secondPage.$('#nc_1_n1z')
    const thumb = await slideThumb.boundingBox()

    // Simulate slide captcha slider
    await secondPage.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2)
    await secondPage.mouse.down()
    await secondPage.mouse.move(thumb.x + slider.width, thumb.y + thumb.height / 2, {steps: 10})
    await page.mouse.up()
    // Done simulate

    /*Getting data here if captcha by passed

      ...do something

    End getting data*/


    // Close pages and finally close the browser
    // await secondPage.close()
    // await page.close()
    // await browser.close()
  }
}

module.exports = OOCLService