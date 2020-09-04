const puppeteer = require('puppeteer')

class OOCLService {
  SERVICE_NAME = 'OoclService'
  MAX_RETRY_TIME = 1
  SLEEP_TIME = 10

  defaultSecondPageParams = {
    'hiddenForm:_link_hidden_': 'hiddenForm:goToCargoTrackingCNTR',
    'hiddenForm:supportUtfChars': true
  }

  currentIndex = -1

  result = []

  USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.137 Safari/537.36'
  
  MAIN_URL = 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx'
  SECOND_URL = 'http://moc.oocl.com/party/cargotracking/ct_search_from_other_domain.jsf?ANONYMOUS_BEHAVIOR=BUILD_UP&domainName=PARTY_DOMAIN&ENTRY_TYPE=OOCL&ENTRY=MCC&ctSearchType=CNTR&ctShipmentNumber=%{con}'
  THIRD_URL = 'http://moc.oocl.com/party/cargotracking/ct_search_from_other_domain.jsf?ANONYMOUS_TOKEN=%{userToken}&ENTRY=MCC&ENTRY_TYPE=OOCL&PREFER_LANGUAGE=en-US'


  constructor(containers) {
    this.containers = containers
  }

  run = async () => {
    for (let container of this.containers) {
      this.currentIndex++
      this.nextContainer(container)
      
      const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: {
          width: 1366,
          height: 768,
        },
        ignoreDefaultArgs: ["--enable-automation"],
      })
      await this.requestFirstPage(browser)
    }
  }

  requestFirstPage = async browser => {
    const page = await browser.newPage()
    await page.setDefaultNavigationTimeout(0)
    await page.setUserAgent(this.USER_AGENT)
    await page.goto(this.MAIN_URL)

    this.cookies = await page.cookies()

    await this.parseMainPageParams(page)

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

    // Slide the captcha
    const sliderElement = await secondPage.$('#nc_1_n1t')
    const slider = await sliderElement.boundingBox()

    const slideThumb = await secondPage.$('#nc_1_n1z')
    const thumb = await slideThumb.boundingBox()

    await secondPage.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2)
    await secondPage.mouse.down()
    await secondPage.mouse.move(thumb.x + slider.width, thumb.y + thumb.height / 2, {steps: 10})
    await page.mouse.up()
    // Slided over the captcha

  }

  parseMainPageParams = async page => {
    const inputs = await page.$$('input')
    for (let input of inputs) {
      const key = await page.evaluate(el => el.getAttribute("name"), input)
      if (key === null) continue
      const value = await page.evaluate(el => el.getAttribute("value"), input)
      this.params[key] = value
    }
    this.params = {...this.params, ...this.defaultMainParams}
  }

  nextContainer = (containerNo) => {
    this.currentContainerNo = containerNo
    this.defaultMainParams = {
      'searchType': 'cont',
      'SEARCH_NUMBER': containerNo
    }
    this.params = {}
    this.cookies = null
    this.userToken = ''
  }

  interceptor = async (page, body = {}) => {
    await page.setRequestInterception(true)

    page.on('request', request => {
        const headers = request.headers()
        const data = {
          ...body,
          headers: {
            ...headers,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
        request.continue(data)
    })
  }

}

module.exports = OOCLService