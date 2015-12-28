module.exports = function(){
    var express = require('express');
    var app = express();
    app.use(express.static(this.opts.EXPRESS_ROOT));
    app.listen(this.opts.EXPRESS_PORT);
};
