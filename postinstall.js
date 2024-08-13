const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const venvPath = path.join(__dirname, 'src', 'venv');
const requirementsPath = path.join(__dirname, 'src', 'requirements.txt');

console.log('Starting postinstall script...');

if (!fs.existsSync(venvPath)) {
  console.log('Creating virtual environment...');
  execSync(`python3 -m venv ${venvPath}`);
} else {
  console.log('Virtual environment already exists.');
}

console.log('Installing Python dependencies...');
const pipPath = process.platform === 'win32'
  ? path.join(venvPath, 'Scripts', 'pip.exe')
  : path.join(venvPath, 'bin', 'pip');
execSync(`${pipPath} install -r ${requirementsPath}`);

console.log('Postinstall script completed.');