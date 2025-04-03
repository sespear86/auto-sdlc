import logging
import os
import re
import time
import subprocess
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, StaleElementReferenceException
import pyperclip

# Ensure directories exist
os.makedirs('D:\\Documents\\AutoSDLC\\logs', exist_ok=True)
os.makedirs('D:\\Documents\\AutoSDLC\\tests', exist_ok=True)

# Set up logging
logging.basicConfig(
    filename='D:\\Documents\\AutoSDLC\\logs\\generate_tests.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
console = logging.StreamHandler()
console.setLevel(logging.INFO)
formatter = logging.Formatter('%(levelname)s - %(message)s')
console.setFormatter(formatter)
logging.getLogger('').addHandler(console)

logging.info("Starting test generation process")

# Chrome options
chrome_options = Options()
user_data_dir = r"C:\Users\Irika\AppData\Local\Google\Chrome\User Data"  # Adjust to your username
profile_directory = "Default"
chrome_options.add_argument(f"--user-data-dir={user_data_dir}")
chrome_options.add_argument(f"--profile-directory={profile_directory}")

# Initialize driver
driver = webdriver.Chrome(options=chrome_options)
logging.info("Initialized Chrome driver")

def get_fresh_element(driver, by, value, timeout=20, max_retries=3):
    for attempt in range(max_retries):
        try:
            element = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable((by, value))
            )
            if element.is_displayed() and element.is_enabled():
                driver.execute_script("arguments[0].scrollIntoView(true);", element)
                logging.info(f"Located element: {value}")
                return element
            raise TimeoutException("Element not interactable")
        except (TimeoutException, StaleElementReferenceException):
            logging.warning(f"Retry {attempt + 1}/{max_retries} for element {value}")
            if attempt == max_retries - 1:
                logging.error(f"Failed to locate interactable element: {value}")
                return None
            time.sleep(2)
    return None

def check_for_login_page(driver):
    if "login" in driver.current_url.lower():
        logging.warning("Detected login page. Manual login required.")
        print("Login page detected. Please log in manually, then press Enter...")
        input("Press Enter after logging in...")
        WebDriverWait(driver, 20).until(
            lambda d: "grok" in d.current_url.lower()
        )
        logging.info("Redirected to Grok Chat UI after login")

def wait_for_copy_text_button(driver, prompt_count, max_wait=120):
    start_time = time.time()
    last_log_time = start_time
    while time.time() - start_time < max_wait:
        try:
            buttons = driver.find_elements(By.XPATH, "//button[@aria-label]")
            copy_text_buttons = [btn for btn in buttons if "copy text" in btn.get_attribute("aria-label").lower()]
            if len(copy_text_buttons) >= prompt_count:
                logging.info(f"Found {len(copy_text_buttons)} Copy text buttons, selecting button for prompt {prompt_count}")
                return copy_text_buttons[prompt_count - 1]  # Pick the button corresponding to the latest prompt
            current_time = time.time()
            if current_time - last_log_time >= 10:
                logging.info(f"Found {len(copy_text_buttons)} Copy text buttons, waiting for {prompt_count}")
                last_log_time = current_time
            time.sleep(1)
        except StaleElementReferenceException:
            logging.warning("Stale element in button check, retrying")
            time.sleep(1)
    logging.error("Copy text button not found within max wait time")
    return None

def start_new_chat(driver):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            new_chat_button = get_fresh_element(driver, By.XPATH, "//button[contains(@aria-label, 'New Chat') or contains(normalize-space(), 'New Chat')]")
            if not new_chat_button:
                raise Exception("New Chat button not found")
            new_chat_button.click()
            logging.info("Clicked New Chat button")
            WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.XPATH, "//textarea[@placeholder='Ask anything']"))
            )
            logging.info("New chat session initialized")
            return
        except (StaleElementReferenceException, TimeoutException) as e:
            logging.warning(f"Retry {attempt + 1}/{max_retries} for starting new chat: {str(e)}")
            if attempt == max_retries - 1:
                logging.error("Failed to start new chat after retries")
                raise
            time.sleep(2)
    raise Exception("Failed to start new chat after retries")

def send_prompt_and_get_response(driver, prompt, prompt_count):
    text_input = get_fresh_element(driver, By.XPATH, "//textarea[@placeholder='Ask anything']")
    if not text_input:
        raise Exception("Text input field not found")

    logging.info(f"Sending prompt: {prompt[:100]}...")
    text_input.clear()
    prompt_parts = prompt.split("\n")
    for i, part in enumerate(prompt_parts):
        text_input.send_keys(part)
        if i < len(prompt_parts) - 1:
            text_input.send_keys(Keys.SHIFT + Keys.RETURN)
    text_input.send_keys(Keys.RETURN)
    logging.info("Prompt submitted")

    try:
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'r-a8ghvy')]"))
        )
        logging.info("Chat message detected")
    except TimeoutException:
        logging.error("Prompt verification timed out")
        raise

    copy_button = wait_for_copy_text_button(driver, prompt_count)
    if not copy_button:
        raise Exception("Failed to locate Copy text button")

    pyperclip.copy("")
    driver.execute_script("arguments[0].scrollIntoView(true);", copy_button)
    copy_button.click()
    time.sleep(3)
    response = pyperclip.paste()

    test_pattern = r"(?:```(?:javascript|js)?\s*|\bdescribe\s*\()(.+?)(?:```|\Z)"
    match = re.search(test_pattern, response, re.DOTALL)
    if match:
        test_code = match.group(1).strip()
        logging.info(f"Extracted test code length: {len(test_code)} chars")
        if not test_code.startswith('describe'):
            test_code = f"describe('{issue} Tests', () => {{\n{test_code}\n}});"
        return test_code
    else:
        logging.error(f"No Jest test code found in response: {response[:200]}...")
        raise Exception("No Jest test code found in response")

def run_tests(test_file):
    try:
        result = subprocess.run(
            ['python', 'run_tests.py'],
            capture_output=True,
            text=True,
            check=True
        )
        logging.info("Tests executed successfully")
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        logging.error(f"Tests failed: {e.stderr}")
        return False, e.stderr

def get_exported_name(js_code):
    export_match = re.search(r"module\.exports\s*=\s*([^;]+);", js_code)
    if export_match:
        export_str = export_match.group(1).strip()
        if export_str.startswith('{'):
            names = re.findall(r"(\w+)", export_str)
            return names[0] if names else "app"
        return "app"
    return "app"

def save_test(test_code, output_file, issue, js_code):
    exported_name = get_exported_name(js_code)
    full_test_code = f"const {{ {exported_name} }} = require('../src/{issue}');\n\n{test_code}"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(full_test_code)
    logging.info(f"Saved test to {output_file}")

try:
    driver.get("https://x.com/i/grok")
    logging.info("Opened Grok Chat UI")
    check_for_login_page(driver)

    WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.XPATH, "//textarea[@placeholder='Ask anything']"))
    )

    src_dir = "D:\\Documents\\AutoSDLC\\src"
    js_files = [f for f in os.listdir(src_dir) if f.endswith('.js') and '.test' not in f]
    if not js_files:
        raise Exception("No source .js files found in src directory")

    for idx, js_file in enumerate(js_files, 1):
        issue = js_file.replace('.js', '')
        with open(os.path.join(src_dir, js_file), "r", encoding="utf-8") as f:
            js_code = f.read().strip()

        logging.info(f"Processing {issue}")
        if idx > 1:  # Only start a new chat for issues after the first one
            start_new_chat(driver)
        prompt_count = 0

        # Initial test generation
        prompt_count += 1
        initial_prompt = f"Generate valid Jest test cases for this JavaScript code. Ensure the code is complete, uses proper Jest syntax (e.g., describe, it, expect), includes necessary imports and mocks, and tests the main functionality:\n{js_code}"
        test_code = send_prompt_and_get_response(driver, initial_prompt, prompt_count)
        output_file = os.path.join("D:\\Documents\\AutoSDLC\\tests", f"{issue}.test.js")
        save_test(test_code, output_file, issue, js_code)

        # Debug loop
        max_iterations = 3
        for iteration in range(max_iterations):
            success, output = run_tests(output_file)
            if success:
                logging.info(f"Tests for {issue} passed on iteration {iteration + 1}")
                print(f"Tests for '{issue}' passed at {output_file}")
                break
            else:
                logging.info(f"Tests failed on iteration {iteration + 1}, refining...")
                prompt_count += 1
                debug_prompt = f"The following Jest test code was generated:\n```javascript\n{test_code}\n```\nIt produced these errors when run:\n{output}\nPlease fix the test code to resolve the errors and ensure it works correctly."
                test_code = send_prompt_and_get_response(driver, debug_prompt, prompt_count)
                save_test(test_code, output_file, issue, js_code)
        
        if not success:
            logging.warning(f"Tests for {issue} failed after {max_iterations} iterations, moving to next issue")
            print(f"Tests for '{issue}' failed after max iterations, saved best effort at {output_file}")

finally:
    if 'driver' in locals():
        logging.info("Closing browser")
        time.sleep(2)
        driver.quit()
        logging.info("Browser closed")