const crypto = require('crypto');
function validatePhotos(input = []) {
  if (!Array.isArray(input) || input.length > 3) throw Error('Choose up to three photos.');
  return input.map((photo, index) => {
    if (!photo || typeof photo.data !== 'string' || photo.data.length > 1400000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(photo.data)) throw Error('Invalid photo data.');
    const data = Buffer.from(photo.data, 'base64');
    const jpeg = data.length > 4 && data[0] === 255 && data[1] === 216 && data[2] === 255 && data[data.length-2] === 255 && data[data.length-1] === 217;
    const png = data.length > 24 && data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
    if (!data.length || data.length > 1048576 || (!jpeg && !png)) throw Error('Photos must be JPEG or PNG, up to 1 MB each.');
    return { name: `equipment-${index+1}.${jpeg ? 'jpg' : 'png'}`, mime: jpeg ? 'image/jpeg' : 'image/png', data };
  });
}
module.exports = { validatePhotos, newReference: () => 'TSB-REQ-' + crypto.randomBytes(8).toString('hex').toUpperCase() };
