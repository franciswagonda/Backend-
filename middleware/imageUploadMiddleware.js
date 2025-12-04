const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(null, 'profile-' + req.user.id + '-' + Date.now() + path.extname(file.originalname));
  }
});

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype.toLowerCase());
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only (jpg, jpeg, png)!');
  }
}

const uploadImage = multer({
  storage,
  // Increase max file size to 10MB
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).single('photo');

module.exports = uploadImage;
