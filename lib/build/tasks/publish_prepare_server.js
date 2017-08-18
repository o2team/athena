module.exports = function ($, appConf, moduleConf, args) {
  return function (mod, modulePath, appPath) {
    return new Promise(function (resolve, reject) {
      var inquirer = require('inquirer');

      var remoteName = (args && args.remote) ? args.remote : 'local';

      if (typeof remoteName !== 'string' || remoteName === 'local') {
        var prompt = [];
        var deployObj = appConf.deploy;
        var choices = [];
        for (var i in deployObj) {
          if (i !== 'local') {
            choices.push({
              name: i + ' (' + deployObj[i].domain + ')',
              value: i
            });
          }
        }
        prompt.push({
          type: 'list',
          name: 'remote',
          message: '请选择将要发布的远程机器',
          store: true,
          required: true,
          choices: choices
        });
        inquirer.prompt(prompt, function (answers) {
          remoteName = answers.remote;
          args.remoteName = remoteName
          resolve(remoteName)
        });
      } else {
        args.remoteName = remoteName
        resolve(remoteName)
      }
    })
  }
}
