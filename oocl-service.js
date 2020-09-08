const chromium = require('chrome-aws-lambda')
const puppeteer = chromium.puppeteer

class OOCLService {
  result = {}
  USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.137 Safari/537.36'
  MAIN_URL = 'https://moc.oocl.com/party/cargotracking/ct_search_from_other_domain.jsf?ANONYMOUS_BEHAVIOR=BUILD_UP&domainName=PARTY_DOMAIN&ENTRY_TYPE=OOCL&ENTRY=MCC&ctSearchType=CNTR&ctShipmentNumber=${cntr}'

  constructor(container) {
    this.container = container
    this.result = {}
  }

  run = async () => {
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: await chromium.executablePath,
      defaultViewport: null,
      args: chromium.args,
      slowMo: 300,
    })

    await this.simulator(browser)
    await browser.close()

    return this.result
  }

  simulator = async browser => {
    try {
      const page = await browser.newPage()
      await page.setUserAgent(this.USER_AGENT)

      await page.goto(this.MAIN_URL.replace('${cntr}', this.container))

      await page.waitForNavigation({waitUntil: ['load', 'networkidle2']})
      await page.waitForSelector("#nc_1_n1z")

      await this.bypassCaptcha(page)

      await page.waitForNavigation({waitUntil: 'networkidle0'})

      let bodyHTML = await page.evaluate(() => document.body.innerHTML)

      if (bodyHTML.includes('errloading')) {
        return Object.assign(this.result, {
          container_number: this.container,
          crawl_success: false,
          message: `Error while crawling. Blocked by smart captcha!`
        })
      }

      if (bodyHTML.includes('No records were found.')) {
        return Object.assign(this.result, {
          container_number: this.container,
          crawl_success: false,
          message: `${this.container} not found!`
        })
      }

      await this.extractInfo(page)
      await this.extractHistories(page)

    } catch (error) {
      return Object.assign(this.result, {
        container_number: this.container,
        crawl_success: false,
        message: `Error while crawling. Error: ${error.message}`
      })
    }
  }

  extractInfo = async (html) => {
    const extractedInfo = await html.$$eval('#Tab1 #eventListTable tr', rows => {
      return Array.from(rows, row => {
        const columns = row.querySelectorAll('td')
        return Array.from(columns, column => {
          let spans = column.querySelectorAll('span')
          spans = Array.from(spans, span => span.innerText)
          return {column: column.innerText, spans: spans}
        })
      })
    })

    const current_port = await html.$eval('#form\\:eventLocation0', elm => elm.innerText)
    const current_status = await html.$eval('#summaryTable > tbody > tr:nth-child(3) > td:nth-child(6)', elm => elm.innerText)
    const eta = await html.$eval('#form\\:arrivalDate0', elm => elm.innerText)
    const event_at = await html.$eval('#form\\:eventDate0', elm => elm.innerText)

    const info = {
      crawl_success: true,
      container_number: this.container,
      vessel_name: extractedInfo[1][4].column.trim().split('\n')[0].trim(),
      voyage_name: extractedInfo[1][4].column.trim().split('\n')[1].trim(),
      pol_name: extractedInfo[1][3].spans[0],
      pod_name: extractedInfo[1][5].spans[0],
      event_at: event_at,
      eta: eta,
      current_status: current_status,
      current_port: current_port,
    }
    Object.assign(this.result, info)
  }

  extractHistories = async (html) => {
    const extractedHistories = await html.$$eval('#Tab2 #eventListTable tr', rows => {
      return Array.from(rows, row => {
        const columns = row.querySelectorAll('td')
        return Array.from(columns, column => column.innerText)
      })
    })

    const con_histories = []
    extractedHistories.forEach((row, i) => {
      if (i === 0) return
      con_histories.push({
        status: row[0].trim().replace(/\s+/g, ' ').trim(),
        port_name: row[2].trim().replace(/\s+/g, ' ').trim(),
        event_at: row[4].trim().replace(/\s+/g, ' ').trim(),
      })
    })
    this.result.history_routes = con_histories
  }

  bypassCaptcha = async page => {
    const sliderElement = await page.$('#nc_1_n1t')
    const slider = await sliderElement.boundingBox()

    const slideThumb = await page.$('#nc_1_n1z')
    const thumb = await slideThumb.boundingBox()

    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2)
    await page.mouse.down()
    await page.mouse.move(thumb.x + slider.width, thumb.y + thumb.height / 2, {steps: 2})
    await page.mouse.up()
  }

  isAfter = (start, end) => {

  }


}


module.exports = OOCLService