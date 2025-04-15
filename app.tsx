import createError = require('http-errors');
import express = require('express');
import path = require('path');
import cookieParser = require('cookie-parser');
import logger = require('morgan');

import indexRouter = require('./routes/index');
import usersRouter = require('./routes/users');
import {WebSocketServer} from "ws";

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

function onSocketPreError(e: Error) {
  console.error(e);
}
function onSocketPostError(e: Error) {
  console.error(e);
}

const wss = new WebSocketServer({noServer: true})

app.on('upgrade', (req, socket, head) => {
  socket.on('error', onSocketPostError);

  //perform authentication
  if (!!req.headers['BadAuthenticate']) {
    socket.write('HTTP/1.1 404 Not Authenticated');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req,socket,head, (ws) => {
    socket.removeListener('error', onSocketPreError);
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws, req) => {
  ws.on('error', onSocketPostError);

  ws.on('message', (msg, isBinary) => {
    wss.clients.forEach( (client) => {
      if(client.readyState === WebSocket.OPEN) {
        client.send(msg, {binary: isBinary});
      }
    })
  })
})

// catch 404 and forward to error handler
app.use(function(req: any, res: any, next: (arg0: any) => void) {
  next(createError(404));
});

// error handler
app.use(function(err: { message: any; status: any; }, req: { app: { get: (arg0: string) => string; }; }, res: {
  locals: { message: any; error: any; };
  status: (arg0: any) => void;
  render: (arg0: string) => void;
}, next: any) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
