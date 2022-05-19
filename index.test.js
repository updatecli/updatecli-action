const process = require('process');
const cp = require('child_process');
const path = require('path');

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  process.env['INSTALL_ONLY'] = true;
  process.env['RUNNER_TEMP'] = "/tmp/updatecli_tmp"
  const ip = path.join(__dirname, 'index.js');
  const result = cp.execSync(`node16 ${ip}`, {env: process.env}).toString();
  console.log(result);
})
