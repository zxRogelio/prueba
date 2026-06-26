import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedVideoTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de archivo no permitido"), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter,
});