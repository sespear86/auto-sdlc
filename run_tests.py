# run_tests.py
import subprocess
import os
import logging
import pytest
import shutil

# Set up logging
logging.basicConfig(
    filename='D:\\Documents\\AutoSDLC\\logs\\run_tests.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
console = logging.StreamHandler()
console.setLevel(logging.INFO)
formatter = logging.Formatter('%(levelname)s - %(message)s')
console.setFormatter(formatter)
logging.getLogger('').addHandler(console)

def run_jest_tests():
    os.chdir('D:\\Documents\\AutoSDLC')
    
    # Find PowerShell executable (pwsh.exe or powershell.exe)
    pwsh_path = shutil.which("pwsh") or shutil.which("powershell")
    if not pwsh_path:
        raise FileNotFoundError("PowerShell (pwsh.exe or powershell.exe) not found in PATH. Ensure PowerShell is installed.")
    logging.info(f"Using PowerShell at: {pwsh_path}")

    # Specify full path to npx.ps1
    npx_path = r"D:\Program Files\nodejs\npx.ps1"
    if not os.path.exists(npx_path):
        raise FileNotFoundError(f"npx.ps1 not found at {npx_path}. Adjust the path in the script.")
    logging.info(f"Using npx.ps1 at: {npx_path}")

    # Construct the command to run npx with PowerShell
    # Use PowerShell to execute the .ps1 script
    jest_command = [pwsh_path, "-File", npx_path, "jest", "--verbose"]
    
    try:
        # Run the command and capture output
        result = subprocess.run(
            jest_command,
            capture_output=True,
            text=True,
            check=True
        )
        logging.info("Jest tests executed successfully")
        print("Jest Output:")
        print(result.stdout)  # Print detailed output
        if result.stderr:
            print(f"Warnings/Errors from Jest:\n{result.stderr}")
            logging.warning(f"Jest warnings/errors: {result.stderr}")
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        logging.error(f"Jest tests failed: {e.stderr}")
        print(f"Tests failed:\n{e.stderr}")
        return False, e.stderr
    except FileNotFoundError as e:
        logging.error(f"Failed to execute PowerShell command: {e}")
        print(f"Failed to execute PowerShell command: {e}")
        raise

# Pytest test function
def test_jest_execution():
    logging.info("Starting test execution")
    success, output = run_jest_tests()
    assert success, f"Jest tests failed with output: {output}"

if __name__ == "__main__":
    pytest.main(["-s", __file__])