const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');
const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter: function(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if ( isPhoto ) {
      next(null, true);
    } else {
      next({message: `That filetype isn't allowed!`}, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index');
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  if ( !req.file ) {
    next();
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  next();
};

exports.addStore = (req, res) => {
  res.render('editStore', {title: 'Add Store' });
};

exports.createStore = async (req, res) => {
  const store = await (new Store(req.body)).save();
  req.flash('success',`Succesfully created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  // get list of stores from db
  const stores = await Store.find();
  res.render('stores', { title: 'Stores', stores });
};

exports.editStore = async (req, res) => {
  // 1 get store with id
  const store = await Store.findOne({_id: req.params.id});
  // 2 confirm they are the owner of the sotre
  // 3 render out the edit form
  res.render('editStore', { title: `Edit store ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
  req.body.location.type = 'Point';
  const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, {
   new: true,
   runValidators: true
 }).exec();
 req.flash('success', `Successfuly updated <string>${store.name}</strong>. <a href="/store/${store.slug}">View store →</a>`);
 res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug });
  if ( !store ) {
    next();
    return;
  }
  res.render('store', { title:store.name, store });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  res.render('tag', {tags, stores, title: 'Tags', tag });
}
