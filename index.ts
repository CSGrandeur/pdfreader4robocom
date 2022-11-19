import axios from 'axios'
import fs from 'fs'
import fsExtra from 'fs-extra'
import jimp from 'jimp'
import jsqr from 'jsqr'
import path from 'path'
import { PDFDocument } from 'pdf-lib'
import { fromBuffer } from 'pdf2pic'

async function pdfToImage (pdfPath: string, savePath: string): Promise<void> {
  try {
    const pdfBuffer = fs.readFileSync(pdfPath)
    const baseOptions = {
      density: 330,
      saveFilename: path.parse(pdfPath).name,
      format: 'png',
      savePath
    }
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pages = pdfDoc.getPages()
    for (const [pageIndex, page] of pages.entries()) {
      const { width, height } = page.getSize()
      const toImageOptions = { ...baseOptions, width: width * 2, height: height * 2 }
      fromBuffer(pdfBuffer, toImageOptions)(pageIndex + 1).catch(err => {
        console.log(`${pdfPath}第${pageIndex + 1}页转换失败`)
        console.log(err)
      })
    }
  } catch (err) {
    console.log(err)
  }
}

fs.readdirSync('./pdfs').forEach((value) => {
  if (!fsExtra.pathExistsSync('./images')) fsExtra.ensureDirSync('./images')
  void pdfToImage(path.join('./pdfs', value), './images')
})

if (!fsExtra.pathExistsSync('./images_download')) fsExtra.ensureDirSync('./images_download')
fs.readdirSync('./images').forEach((image) => {
  const buffer = fs.readFileSync(path.join('./images', image))
  void jimp.read(buffer, function (err, decodedImage) {
    if (err != null) {
      console.error(err)
    }
    const code = jsqr(decodedImage.bitmap.data as any, decodedImage.getWidth(), decodedImage.getHeight())
    if (code != null) {
      console.log(code.data)
      void axios(code.data).then((value) => {
        const result = value.data.match(/filedownload\('(.*)'\)/)
        if (result != null) {
          console.log('https://www.ncie.org.cn/' + (result[1] as string))
          return axios({
            url: 'https://www.ncie.org.cn/' + (result[1] as string),
            responseType: 'arraybuffer'
          })
        }
      }).then((value) => {
        fs.writeFileSync(path.join('./images_download', 'origin-' + path.parse(image).name.replace('.1', '') + '.jpg'), value?.data)
      })
    }
  })
})
