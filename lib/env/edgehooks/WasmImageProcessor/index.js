/* eslint-disable import/extensions */
/* eslint-disable class-methods-use-this */

import * as photon from './photon/index.js';

import {
  isUrl,
  hasValidImageExtension,
  VALID_IMG_EXTENSIONS,
} from './utils.js';

let image = null;
let result = null;

async function loadImage(pathOrURL) {
  if (!hasValidImageExtension(pathOrURL)) {
    throw new Error(
      `Invalid image extension. Supported: ${VALID_IMG_EXTENSIONS.join(',')}`,
    );
  }

  let imageUrl;
  if (isUrl(pathOrURL)) {
    imageUrl = pathOrURL;
  } else {
    imageUrl = new URL(pathOrURL, 'file://');
  }

  const imageResp = await fetch(imageUrl);

  if (!imageResp.ok) {
    throw new Error('Error getting image. Http status code:', imageResp.status);
  }

  const imageBuffer = await imageResp.arrayBuffer();
  const imageBytes = new Uint8Array(imageBuffer);

  image = photon.PhotonImage.new_from_byteslice(imageBytes);
}

function checkImage() {
  if (image === null) {
    throw new Error("Must load image before! Use 'loadImage' function.");
  }
}

function checkResult() {
  if (result === null) {
    throw new Error('Must run an image processing operation before return.');
  }
}

function cleanEnv() {
  image.free();

  image = null;
  result = null;
}

function getDimensionPercent(isWidth, value) {
  checkImage();

  let dimensionValue;
  if (isWidth) {
    dimensionValue = image.get_width();
  } else {
    dimensionValue = image.get_height();
  }

  const percent = (value * 100.0) / dimensionValue;

  return percent;
}

async function resize(width, height, usePercent = true) {
  checkImage();

  const imageWidth = image.get_width();
  const imageHeight = image.get_height();

  let widthPercent;
  let heightPercent;
  if (!usePercent) {
    widthPercent = getDimensionPercent(true, width);
    heightPercent = getDimensionPercent(false, height);
  } else {
    widthPercent = width;
    heightPercent = height;
  }

  result = photon.resize(
    image,
    imageWidth * widthPercent,
    imageHeight * heightPercent,
    1,
  );
}

const SUPPORTED_FORMATS_IN_RESPONSE = ['png', 'jpeg', 'webp'];

function getImageResponse(format, quality = 100) {
  checkResult();

  if (!SUPPORTED_FORMATS_IN_RESPONSE.includes(format)) {
    throw new Error(
      `Invalid image format in Response. Supported: ${SUPPORTED_FORMATS_IN_RESPONSE.join(
        ',',
      )}`,
    );
  }

  let image;
  let headers;
  switch (format) {
    case 'webp':
      image = result.get_bytes_webp();
      headers = {
        'Content-Type': 'image/webp',
      };
      break;
    case 'jpeg':
      image = result.get_bytes_jpeg(quality);
      headers = {
        'Content-Type': 'image/jpeg',
      };
      break;
    // png case
    default:
      image = result.get_bytes();
      headers = {
        'Content-Type': 'image/png',
      };
      break;
  }

  let imageResponse = new Response(image, { headers });

  cleanEnv();

  return imageResponse;
}

const WasmImageProcessor = {
  loadImage,
  resize,
  getImageResponse,
};

export default WasmImageProcessor;
