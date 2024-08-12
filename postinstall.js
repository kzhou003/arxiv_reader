const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Running postinstall script...');

try {
  const isPackaged = !process.defaultApp;
  const appPath = isPackaged ? path.dirname(process.execPath) : process.cwd();
  const pythonPath = isPackaged
    ? path.join(appPath, 'Resources', 'python', 'bin', 'python3')
    : 'python3';
  const pipPath = isPackaged
    ? path.join(appPath, 'Resources', 'python', 'bin', 'pip3')
    : 'pip3';
  const srcPath = path.join(appPath, isPackaged ? 'Resources' : '', 'src');
  const requirementsPath = path.join(srcPath, 'requirements.txt');

  console.log('Python path:', pythonPath);
  console.log('Pip path:', pipPath);
  console.log('Src path:', srcPath);
  console.log('Requirements path:', requirementsPath);

  if (!fs.existsSync(requirementsPath)) {
    throw new Error(`requirements.txt not found at ${requirementsPath}`);
  }

  console.log('Installing Python packages...');
  execSync(`"${pipPath}" install -r "${requirementsPath}"`, { stdio: 'inherit' });

  console.log('Postinstall script completed successfully');
} catch (error) {
  console.error('Error in postinstall script:', error);
  process.exit(1);
}