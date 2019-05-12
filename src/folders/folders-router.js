const path = require('path')
const express = require('express')
const xss = require('xss')
const foldersService = require('./folders-service')
const foldersRouter = express.Router()
const jsonParser = express.json()

const serializefolder = folder => ({
  id: folder.id,
  fullname: xss(folder.name),
})

foldersRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    foldersService.getAllfolders(knexInstance)
      .then(folders => {
        res.json(folders.map(serializefolder))
      })
      .catch(err => {
        console.log("ERROR:", err);
      });
  })
  .post(jsonParser, (req, res, next) => {
    const { name } = req.body
    const newfolder = { name }

    for (const [key, value] of Object.entries(newfolder))
      if (value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })

    foldersService.insertfolder(
      req.app.get('db'),
      newfolder
    )
      .then(folder => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${folder.id}`))
          .json(serializefolder(folder))
      })
      .catch(next)
  })

foldersRouter
  .route('/:folder_id')
  .all((req, res, next) => {
    foldersService.getById(
      req.app.get('db'),
      req.params.folder_id
    )
      .then(folder => {
        if (!folder) {
          return res.status(404).json({
            error: { message: `folder doesn't exist` }
          })
        }
        res.folder = folder
        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(serializefolder(res.folder))
  })
  .delete((req, res, next) => {
    foldersService.deletefolder(
      req.app.get('db'),
      req.params.folder_id
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(jsonParser, (req, res, next) => {
    const { name } = req.body
    const folderToUpdate = { name }

    const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length
    if (numberOfValues === 0)
      return res.status(400).json({
        error: {
          message: `Request body must contain name`
        }
      })

    foldersService.updatefolder(
      req.app.get('db'),
      req.params.folder_id,
      folderToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = foldersRouter